import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { rateLimit } from 'express-rate-limit';
import type { Answers, Gift, FilterQuestion, RecommendResponse, RecommendRequest } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ---- 限流：可在此修改次数限制 ----
const RATE_LIMIT_MAX = 10;          // 每小时每 IP 最多请求次数
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 时间窗口（1小时）
// 携带有效 UNLIMITED_KEY 的请求可跳过限流
const recommendLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  skip: (req) => {
    const key = (req.query.unlimited_key as string)
      || (req.headers['x-unlimited-key'] as string);
    const secret = process.env.UNLIMITED_KEY;
    return !!(key && secret && key === secret);
  },
  message: { error: '请求太频繁，请稍后再试（每小时限 10 次）' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- 访问口令校验（可选，设置 ACCESS_CODE 环境变量后生效） ----
function accessCodeMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const requiredCode = process.env.ACCESS_CODE;
  if (!requiredCode) return next();

  const provided = req.query.code as string | undefined
    || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (provided === requiredCode) return next();

  res.status(403).json({ error: '需要访问口令。请在网址后加 ?code=你的口令' });
}

// ---- 生产环境：托管前端静态文件 ----
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  // SPA fallback：非 API 请求都返回 index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// 解析预算
function parseBudget(answers: Answers): { min: number; max: number } {
  const base = parseInt(answers.budget, 10) || 500;
  const flex = parseInt(answers.budgetFlexibility, 10);
  const flexPercent = isNaN(flex) ? 20 : flex;
  return {
    min: Math.max(50, base - Math.floor(base * flexPercent / 100)),
    max: base + Math.floor(base * flexPercent / 100),
  };
}

// 格式化答案为 prompt 文本
function formatAnswers(answers: Answers): string {
  const lines: string[] = [];

  // 基础信息
  lines.push(`- 与收礼人关系：${answers.relationship || '未指定'}`);
  lines.push(`- 收礼人性别：${answers.gender || '未指定'}`);

  const budget = parseBudget(answers);
  lines.push(`- 预算范围：${budget.min} - ${budget.max} 元`);

  lines.push(`- 收礼人年龄：${answers.ageRange || '未知'} 岁`);
  lines.push(`- 送礼场合：${answers.occasion || '未指定'}`);

  // 偏好表达
  if (answers.specificWants?.trim()) {
    lines.push(`- **用户具体想法**：${answers.specificWants}`);
  }

  const allInterests = [
    ...(answers.interests || []),
    ...(answers.interestsCustom?.trim() ? [answers.interestsCustom] : []),
  ];
  if (allInterests.length > 0) {
    lines.push(`- 兴趣爱好：${allInterests.join('、')}`);
  }

  const allPersonality = [
    ...(answers.personality || []),
    ...(answers.personalityCustom?.trim() ? [answers.personalityCustom] : []),
  ];
  if (allPersonality.length > 0) {
    lines.push(`- 性格特点：${allPersonality.join('、')}`);
  }

  // 排除偏好
  const allExclusions = [
    ...(answers.exclusions || []),
    ...(answers.exclusionsCustom?.trim() ? [answers.exclusionsCustom] : []),
  ];
  if (allExclusions.length > 0) {
    lines.push(`- **排除偏好**：${allExclusions.join('、')}`);
  }

  // 补充说明
  if (answers.additionalNotes?.trim()) {
    lines.push(`- **补充说明**：${answers.additionalNotes}`);
  }

  return lines.join('\n');
}

// 获取排除规则文本
function getExclusionRules(answers: Answers): string[] {
  const rules: string[] = [];
  const exclusions = answers.exclusions || [];
  const customExclusions = answers.exclusionsCustom || '';

  for (const e of exclusions) {
    if (e === '不要食品') rules.push('绝不推荐任何食品、零食、饮料类礼物');
    if (e === '不要衣物') rules.push('绝不推荐任何衣物、配饰、鞋帽类礼物');
    if (e === '不要电子产品') rules.push('绝不推荐任何电子产品、数码设备（包括蓝牙音箱、耳机、Kindle、智能手表等）');
    if (e === '不要DIY') rules.push('绝不推荐任何拼装模型、DIY类礼物（包括乐高、手办、积木等）');
    if (e === '不要摄影') rules.push('绝不推荐任何相机、摄影器材（包括拍立得、镜头、三脚架等）');
    if (e === '不要摆件') rules.push('绝不推荐任何摆件、收藏品、装饰品');
    if (e === '不要书籍') rules.push('绝不推荐任何书籍、电子阅读器');
    if (e === '不要化妆品') rules.push('绝不推荐任何化妆品、护肤品');
  }

  // 自定义排除（如送过的礼物）
  if (customExclusions.trim()) {
    rules.push(`排除这些：${customExclusions}`);
  }

  return rules;
}

// 生成候选礼物
async function generateCandidates(answers: Answers): Promise<Gift[]> {
  const answersText = formatAnswers(answers);
  const exclusionRules = getExclusionRules(answers);
  const budget = parseBudget(answers);

  const prompt = `你是一个专业的礼物推荐专家。请根据以下信息推荐礼物。

## 收礼人信息
${answersText}

## 推荐规则
1. **价格硬约束**：礼物价格必须在 ${budget.min} - ${budget.max} 元范围内
2. **关系适配**：礼物必须适合"${answers.relationship}"关系
3. **性别适配**：礼物必须适合"${answers.gender || '不限'}"性别
4. **场合适配**：礼物必须适合"${answers.occasion}"场合
5. **优先考虑**：如果用户提到了具体想法（如"跑鞋"），优先推荐这类礼物
6. **排除规则**：
${exclusionRules.map(r => `   - ${r}`).join('\n')}

7. **多样性**：推荐不同类型的礼物，覆盖不同价位
8. **实用性**：根据性格特点调整推荐（务实理性倾向实用，感性浪漫倾向仪式感）
9. **中国文化背景**：考虑中国节日、中国电商常见品牌和价格

## 输出要求
请生成 8-12 个候选礼物，返回 JSON 格式：
{
  "gifts": [
    {
      "id": "1",
      "name": "礼物名称",
      "priceMin": 最低价格,
      "priceMax": 最高价格,
      "description": "一句话简介（10字内）",
      "reason": "推荐理由（20字内，个性化）",
      "searchKeywords": "电商搜索关键词"
    }
  ]
}

请确保每个礼物都严格符合排除规则。`;

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回为空');
  }

  const parsed = JSON.parse(content);
  return parsed.gifts || [];
}

// 智能筛选礼物
async function filterCandidates(
  candidates: Gift[],
  selectedIds: string[],
  answers: Answers,
  secondRoundAnswer?: string
): Promise<{ gifts: Gift[]; filterQuestion?: FilterQuestion }> {
  // 过滤出用户选中的礼物
  let filtered = candidates.filter(g => selectedIds.includes(g.id));

  // 如果选中 4 个或以下，直接返回
  if (filtered.length <= 4) {
    return { gifts: filtered };
  }

  // 如果有第二轮答案，根据答案筛选
  if (secondRoundAnswer) {
    const prompt = `你是一个礼物筛选专家。

用户选中的礼物：
${filtered.map(g => `- ${g.name}: ¥${g.priceMin}-${g.priceMax}, ${g.description}`).join('\n')}

用户的筛选偏好："${secondRoundAnswer}"

请根据用户偏好，从这些礼物中选出最匹配的 3-5 个。
返回 JSON 格式：
{
  "selectedIds": ["id1", "id2", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const finalIds = parsed.selectedIds || [];
      filtered = filtered.filter(g => finalIds.includes(g.id));
    }

    return { gifts: filtered.length > 0 ? filtered : candidates.filter(g => selectedIds.includes(g.id)).slice(0, 5) };
  }

  // 如果选中超过 4 个且没有第二轮答案，生成筛选问题
  const questionPrompt = `你是一个礼物推荐助手。

用户选中的礼物类型：
${filtered.map(g => g.name).join('、')}

请生成一个筛选问题帮助用户进一步选择。
返回 JSON 格式：
{
  "question": "筛选问题",
  "options": ["选项1", "选项2", "选项3"]
}

问题示例：
- "你更看重哪个特点？"
- "预算更倾向于集中一个还是分散？"
- "风格偏好经典还是新潮？"

选项示例：
- "更看重实用性（每天都能用）"
- "更看重仪式感（纪念日氛围）"
- "更看重性价比（物超所值）"`;

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: questionPrompt }],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  let filterQuestion: FilterQuestion | undefined;

  if (content) {
    const parsed = JSON.parse(content);
    filterQuestion = {
      question: parsed.question,
      options: parsed.options,
    };
  }

  return { gifts: filtered, filterQuestion };
}

// API 路由（限流 + 口令保护）
app.post('/api/recommend', accessCodeMiddleware, recommendLimiter, async (req, res) => {
  try {
    const request: RecommendRequest = req.body;
    const { answers, candidates: reqCandidates, selectedCandidates, secondRoundAnswer } = request;

    // 阶段 1：首次请求，生成候选
    if (!selectedCandidates || selectedCandidates.length === 0) {
      console.log('[API] Phase 1: Generating candidates...');
      const candidates = await generateCandidates(answers);

      const response: RecommendResponse = {
        phase: 'candidates',
        candidates,
      };
      return res.json(response);
    }

    // 阶段 2：用户筛选后，用前端传回的候选人列表
    console.log('[API] Phase 2: Filtering candidates...');
    const baseCandidates: Gift[] = reqCandidates || [];
    const result = await filterCandidates(
      baseCandidates,
      selectedCandidates,
      answers,
      secondRoundAnswer
    );

    if (result.filterQuestion) {
      // 需要第二轮筛选
      const response: RecommendResponse = {
        phase: 'filter-question',
        filterQuestion: result.filterQuestion,
      };
      return res.json(response);
    }

    // 直接返回最终结果
    const response: RecommendResponse = {
      phase: 'final',
      finalGifts: result.gifts,
    };
    return res.json(response);

  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      error: '推荐生成失败',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Gift advisor API running on port ${PORT}`);
  if (process.env.ACCESS_CODE) {
    console.log('[Auth] Access code protection enabled');
  }
});
