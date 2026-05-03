import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import type { Answers, Gift } from './src/types'

const app = express()
app.use(cors())
app.use(express.json())

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

function validateGift(g: any, index: number): Gift | null {
  if (!g || typeof g !== 'object') return null
  if (!g.name || typeof g.name !== 'string' || g.name.trim() === '') return null
  if (typeof g.priceMin !== 'number' || typeof g.priceMax !== 'number') return null
  if (!g.description || typeof g.description !== 'string') return null
  if (!g.reason || typeof g.reason !== 'string') return null

  let min = g.priceMin
  let max = g.priceMax
  if (min > max) {
    console.warn(`Gift #${index}: priceMin > priceMax, swapping`)
    ;[min, max] = [max, min]
  }
  if (min <= 0) return null

  return {
    id: String(index),
    name: g.name.trim(),
    priceMin: Math.round(min),
    priceMax: Math.round(max),
    description: g.description.trim(),
    reason: g.reason.trim(),
    searchKeywords: (typeof g.searchKeywords === 'string' && g.searchKeywords.trim())
      ? g.searchKeywords.trim()
      : g.name.trim(),
  }
}

function parseBudget(answers: Answers): { amount: number; flexibility: number; maxPrice: number } {
  const amount = parseInt(answers.budget, 10) || 500
  const flexVal = parseInt(answers.budgetFlexibility, 10)
  const flexibility = isNaN(flexVal) ? 20 : flexVal
  const maxPrice = Math.round(amount * (1 + flexibility / 100))
  return { amount, flexibility, maxPrice }
}

/** 格式化用户答案用于 prompt */
function formatAnswers(answers: Answers): string {
  const { amount, flexibility, maxPrice } = parseBudget(answers)

  const ageLabel = answers.ageRange
    ? (() => {
        const n = Number(answers.ageRange)
        if (n <= 12) return `${answers.ageRange} 岁（儿童）`
        if (n <= 17) return `${answers.ageRange} 岁（青少年）`
        if (n <= 25) return `${answers.ageRange} 岁（青年）`
        if (n <= 40) return `${answers.ageRange} 岁（中青年）`
        if (n <= 55) return `${answers.ageRange} 岁（中年）`
        return `${answers.ageRange} 岁（老年）`
      })()
    : '未提供'

  const durationLabel = answers.knowDuration ? `${answers.knowDuration} 年` : '未提供'

  const interestsText = Array.isArray(answers.interests)
    ? answers.interests.join('、') || '未提供'
    : answers.interests

  const personalityText = Array.isArray(answers.personality)
    ? answers.personality.join('、') || '未提供'
    : answers.personality

  const restrictionsText = Array.isArray(answers.restrictions)
    ? answers.restrictions.join('、') || '无特殊限制'
    : answers.restrictions

  const supplementLines = Object.entries(answers.supplement ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => {
      const labels: Record<string, string> = {
        relationship: '关系补充', budget: '预算补充', gender: '性别补充',
        ageRange: '年龄补充', occasion: '场合补充', knowDuration: '认识时长补充',
        interests: '兴趣补充', personality: '性格补充', giftStyle: '风格补充',
        restrictions: '限制补充',
      }
      return `- ${labels[k] ?? k}：${v}`
    })
    .join('\n')

  return [
    `- 与收礼人的关系：${answers.relationship}`,
    `- 预算范围：${amount} 元（可浮动 ±${flexibility}%，即最高 ${maxPrice} 元）`,
    `- 收礼人性别：${answers.gender}`,
    `- 收礼人年龄：${ageLabel}`,
    `- 送礼场合：${answers.occasion}`,
    `- 认识时长：${durationLabel}`,
    `- 兴趣爱好：${interestsText}`,
    `- 性格特点：${personalityText}`,
    `- 礼物风格偏好：${answers.giftStyle}`,
    `- 特殊限制：${restrictionsText}`,
    supplementLines ? supplementLines : '',
  ].filter(Boolean).join('\n')
}

/** 第一阶段：AI 生成礼物推荐 */
async function generateGifts(answers: Answers): Promise<any[]> {
  const answersBlock = formatAnswers(answers)
  const { amount, flexibility, maxPrice } = parseBudget(answers)

  const prompt = `你是一个经验丰富的礼物推荐专家。用户填写了一份关于收礼人的详细问卷。请根据问卷内容，**从你的知识中自由推荐 4~6 个最合适的礼物**（后面会再做一轮筛选，所以多推荐几个），不要从任何固定列表中选择，也不要推荐泛泛的万能型礼物。

## 用户问卷答案
${answersBlock}

## 推荐规则（请严格遵守）
1. **预算硬约束（最重要）**：用户预算为 ${amount} 元，允许上浮 ${flexibility}%，即单个礼物最高价格为 ${maxPrice} 元。每个推荐礼物的 priceMax 必须 ≤ ${maxPrice}。绝对不要推荐任何价格超过 ${maxPrice} 元的礼物。
2. **高度个性化**：不要推荐"鲜花"、"巧克力"这类万能但不走心的通用礼物。每个推荐都要结合收礼人的关系、年龄、场合、兴趣、性格、风格偏好这六大维度，生成真正量身定制的礼物方案。
3. **多样性与场景感**：4~6 个礼物应覆盖不同类型（实用类、体验类、创意类、品质类等），避免全是一个品类。不同场合的礼物策略要完全不同。
4. **礼物要具体可操作**：礼物名称要具体到品牌或品类（如"JBL GO4 便携蓝牙音箱"而不是"音箱"），让用户一看就知道该买什么。
5. **中国市场价格参考**：价格区间要符合中国电商平台的真实价格水平，参考京东/淘宝/拼多多的常见售价。
6. **严格排除**：${Array.isArray(answers.restrictions) && answers.restrictions.length > 0
    ? answers.restrictions.map((r) => {
        if (r === '不要食品') return '绝不推荐任何食品、零食、饮料类礼物'
        if (r === '不要衣物') return '绝不推荐任何衣物、配饰、鞋帽类礼物'
        if (r === '偏好数码') return '优先推荐数码科技类产品'
        if (r === '偏好手工') return '优先推荐手工定制类礼物'
        if (r === '偏好体验') return '优先推荐体验类礼物（旅行、演出、课程等）'
        return ''
      }).filter(Boolean).join('；')
    : '无特殊限制'}
7. **补充优先**：如果用户填写了补充内容，其中包含的具体需求应被优先考虑。

## 返回格式
请严格按以下 JSON 格式返回，不要输出任何其他内容：
{
  "gifts": [
    {
      "name": "具体品牌/品类名称",
      "priceMin": 数字（人民币元，整数）,
      "priceMax": 数字（人民币元，整数）,
      "description": "一句话介绍，15-30字",
      "reason": "推荐理由，2-3句，50-100字。必须结合用户的具体条件说明",
      "searchKeywords": "京东/淘宝搜索关键词"
    }
  ]
}`

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4096,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw)
  return parsed.gifts ?? []
}

/** 第二阶段：AI 过滤不合格的礼物 */
async function filterGifts(candidates: any[], answers: Answers): Promise<any[]> {
  const answersBlock = formatAnswers(answers)
  const { maxPrice } = parseBudget(answers)

  const candidatesBlock = candidates
    .map((g, i) => `[${i}] ${g.name}｜¥${g.priceMin}-${g.priceMax}｜${g.description}｜理由：${g.reason}`)
    .join('\n')

  const restrictions = Array.isArray(answers.restrictions) && answers.restrictions.length > 0
    ? answers.restrictions.join('、')
    : '无特殊限制'

  const prompt = `你是一个严格的礼物推荐审核员。下面是用户的需求和一批候选礼物，请逐一审核每个礼物是否符合用户的**所有条件**，剔除不符合的，只保留合格的。

## 用户条件
${answersBlock}

## 审核标准
- ❌ 价格超过 ${maxPrice} 元 → 直接剔除。价格必须 ≤ ${maxPrice} 元，没有任何例外。
- ❌ 与收礼人关系不匹配（比如送给同事的却推荐了情侣款）→ 剔除
- ❌ 与送礼场合完全不符合 → 剔除
- ❌ 与用户设置的特殊限制冲突 → 用户限制为「${restrictions}」。如有"不要食品"则绝对不能推荐任何食品/零食/饮料；如有"不要衣物"则绝对不能推荐任何衣物/配饰/鞋帽。违反限制 = 直接剔除。
- ❌ 价格明显不合理（远超中国电商实际价格）→ 剔除
- ✅ 其他情况 → 保留

## 候选礼物
${candidatesBlock}

请按以下 JSON 格式返回审核结果，只保留合格的礼物：
{
  "passed": [0, 2, 4],
  "rejected": [
    { "index": 1, "reason": "价格超出预算 50%" },
    { "index": 3, "reason": "用户要求不要食品类" }
  ]
}`

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2048,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw)

  // 记录被剔除的
  if (parsed.rejected?.length > 0) {
    console.log('Filtered out gifts:')
    for (const r of parsed.rejected) {
      console.log(`  #${r.index}: ${r.reason}`)
    }
  }

  const passed = parsed.passed ?? []
  return passed.map((i: number) => candidates[i]).filter(Boolean)
}

/** 程序化过滤：对 AI 过滤后的结果再做一次确定性检查 */
function programmaticFilter(gifts: any[], answers: Answers): any[] {
  const { maxPrice } = parseBudget(answers)
  const restrictions: string[] = Array.isArray(answers.restrictions) ? answers.restrictions : []

  const foodKw = ['食品', '零食', '巧克力', '糖果', '饼干', '蛋糕', '坚果', '月饼', '粽子', '糕点', '蜂蜜', '果酱', '熟食', '腊肉', '香肠', '小吃', '甜点', '曲奇', '特产', '美食', '咖啡豆', '茶叶']
  const clothingKw = ['衣服', '衣物', '衬衫', 'T恤', '裤子', '裙', '帽子', '围巾', '手套', '袜子', '鞋子', '腰带', '领带', '配饰', '首饰', '项链', '手链', '耳环', '戒指', '香水', '墨镜', '太阳镜', '包包']

  const filtered = gifts.filter((g, i) => {
    if (typeof g.priceMax === 'number' && g.priceMax > maxPrice) {
      console.log(`[programmatic] #${i} "${g.name}" priceMax=${g.priceMax} > ${maxPrice}, removed`)
      return false
    }

    const haystack = ((g.name ?? '') + (g.description ?? '')).toLowerCase()

    if (restrictions.includes('不要食品')) {
      for (const kw of foodKw) {
        if (haystack.includes(kw)) {
          console.log(`[programmatic] #${i} "${g.name}" matches food keyword "${kw}", removed`)
          return false
        }
      }
    }

    if (restrictions.includes('不要衣物')) {
      for (const kw of clothingKw) {
        if (haystack.includes(kw)) {
          console.log(`[programmatic] #${i} "${g.name}" matches clothing keyword "${kw}", removed`)
          return false
        }
      }
    }

    return true
  })

  if (filtered.length < gifts.length) {
    console.log(`[programmatic] ${gifts.length} → ${filtered.length} gifts after deterministic check`)
  }
  return filtered
}

app.post('/api/recommend', async (req, res) => {
  try {
    const { answers } = req.body as { answers: Answers }

    // 第一阶段：AI 生成
    const rawGifts = await generateGifts(answers)
    if (rawGifts.length === 0) {
      res.status(500).json({ error: 'AI 未生成有效推荐，请调整条件后重试' })
      return
    }

    // 第二阶段：AI 过滤
    let filtered = rawGifts
    try {
      filtered = await filterGifts(rawGifts, answers)
    } catch (err) {
      console.warn('Filter pass failed, using unfiltered results:', err)
    }

    // 第三阶段：程序化确定性过滤（兜底）
    filtered = programmaticFilter(filtered, answers)

    // 校验并组装最终结果
    const gifts: Gift[] = filtered
      .map((g: any, i: number) => validateGift(g, i))
      .filter(Boolean) as Gift[]

    if (gifts.length === 0) {
      console.warn('All gifts filtered out, falling back to unfiltered + programmatic')
      const fallback = programmaticFilter(rawGifts, answers)
        .map((g: any, i: number) => validateGift(g, i))
        .filter(Boolean) as Gift[]
      if (fallback.length === 0) {
        res.status(500).json({ error: 'AI 未生成有效推荐，请调整条件后重试' })
        return
      }
      res.json({ gifts: fallback })
      return
    }

    res.json({ gifts })
  } catch (err: any) {
    console.error('AI recommend error:', err)
    res.status(500).json({ error: err?.message ?? 'unknown' })
  }
})

const PORT = process.env.API_PORT ?? 3001
app.listen(PORT, () => {
  console.log(`AI gift server running on http://localhost:${PORT}`)
})
