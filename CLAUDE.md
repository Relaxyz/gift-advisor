# gift-advisor

AI 驱动的个性化礼物推荐工具。用户回答 10 道题后，AI（DeepSeek）生成量身定制的礼物推荐。

技术栈：React 19 + Vite + TypeScript（前端），Express + OpenAI SDK（后端）。

## 项目结构

```
gift-advisor/
├── server.ts                  ← 后端 API 服务（端口 3001）
├── .env                       ← DEEPSEEK_API_KEY
├── CLAUDE.md                  ← 本文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx               ← 入口，引入 index.css，自定义背景检测
    ├── App.tsx                 ← 主组件，状态机控制 4 个步骤
    ├── App.css                 ← 全部 UI 样式（~830 行）
    ├── index.css               ← CSS 变量、全局基础样式、dark mode
    ├── types.ts                ← 所有类型定义
    ├── version.ts              ← 版本号（Major.Minor.Patch）
    ├── data/
    │   └── questions.ts        ← 10 道问卷题目定义
    └── components/
        ├── WelcomeScreen.tsx   ← 欢迎页（标题 + 开始按钮）
        ├── ProgressBar.tsx     ← 答题进度条
        ├── QuestionCard.tsx    ← 题目卡片（渲染 single/multi/slider/budget 四种题型）
        ├── ReviewPanel.tsx     ← 确认页（展示所有答案，点击可回跳修改）
        └── RecommendationCard.tsx ← 推荐结果页（礼物卡片列表 + 搜索关键词复制）
```

## 前端状态机

App.tsx 用 `step` 状态控制 4 个页面：

```
welcome → questionnaire（10 题）→ review → recommendation
              ↑                        │
              └── editingFromReview ───┘（点击"修改"回到对应题目）
```

- `questionIndex`：当前题目索引（0-9）
- `answers`：用户答案，类型 `Answers`
- `recommendations`：AI 返回的 `Gift[]`
- `loading / apiError`：请求状态
- `history`：最近 5 次推荐记录，存入 `localStorage`

### 状态持久化

- 会话状态（step、questionIndex、answers）自动存入 `localStorage`（key: `gift-advisor-session`）
- 刷新页面后自动恢复到上次停留的步骤
- 点击"重新开始"清除会话
- 历史记录存入 `localStorage`（key: `gift-advisor-history`），最多保留 5 条
- 首页显示最近记录列表，可点击快速查看历史推荐

## 题目类型（QuestionType）

定义在 `types.ts`，QuestionCard 根据类型渲染不同 UI：

| 类型 | 说明 | 示例题目 |
|------|------|---------|
| `single` | 单选按钮 + 可选"补充"项 | 关系、预算、性别、场合、风格 |
| `multi` | 多选按钮 + 可选"补充"项 | 兴趣、性格、限制 |
| `slider` | 单滑块 | 年龄（0-100岁）、认识时长（0-30年） |
| `budget` | 双滑块（金额 + 浮动比例） | 预算（50-3000元，浮动 0-50%） |

### 补充机制

- 大部分题目的选项区末尾有"✏️ 补充（自行填写）"按钮
- 选中后弹出文本输入框，用户可自由输入
- `noSupplement: true` 的题目不显示补充按钮（性别、年龄、认识时长、预算）
- `allowEmpty: true` 的多选题可以不选任何选项
- 常量 `SUPPLEMENT_VALUE = '__supplement__'` 标识用户选择了补充项

## 后端推荐架构（两阶段管道）

`server.ts` 提供 `POST /api/recommend`，接收 `{ answers, candidates?, selectedCandidates?, secondRoundAnswer? }` 返回 `RecommendResponse`。

### 第一阶段：AI 生成（generateCandidates）
- 模型：`deepseek-chat`，temperature=0.7
- 将用户答案格式化为 prompt，要求 AI 自由生成 8-12 个候选礼物
- prompt 中包含：预算硬约束、关系/年龄/场合/兴趣/性格/风格维度、8 种排除规则、中国电商价格参考
- 返回 JSON：`{ gifts: [{ id, name, priceMin, priceMax, description, reason, searchKeywords }] }`

### 第二阶段：AI 筛选（filterCandidates）
- 用户从前端选中多个候选 → 发到后端
- 选中 ≤4 个 → 直接返回最终结果
- 选中 >4 个且无筛选答案 → AI 生成一个筛选问题（3 个选项）
- 有筛选答案 → AI 根据答案从候选中挑出 3-5 个最终推荐

### 安全防护
- IP 限流：express-rate-limit，每 IP 每小时最多 10 次 `/api/recommend` 请求
- 访问口令（可选）：设置 `ACCESS_CODE` 环境变量后，请求需带 `?code=` 参数

### 生产环境
- `NODE_ENV=production` 时，Express 托管 `dist/` 静态文件
- SPA fallback：非 `/api/` 请求返回 `index.html`
- 端口：`process.env.PORT || 3001`
- 前端 `src/api.ts` 通过 `/api/recommend` 调用后端，不再直接调 DeepSeek

## 关键类型

```ts
// 答案（Answers）—— 用户在问卷中填写的所有内容
interface Answers {
  relationship: string;      // 恋人/伴侣 | 家人/亲戚 | ...
  budget: string;            // 数值字符串，如 "500"
  budgetFlexibility: string; // 浮动比例，如 "20"（%）
  gender: string;
  ageRange: string;          // 滑块数值
  occasion: string;
  knowDuration: string;      // 滑块数值
  interests: string[];       // 多选
  personality: string[];     // 多选
  giftStyle: string;
  restrictions: string[];    // 多选，allowEmpty
  supplement: Partial<Record<AnswerKey, string>>; // 各题的补充文本
}

// 礼物（Gift）—— AI 返回的推荐结果
interface Gift {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
  description: string;      // 一句话介绍
  reason: string;           // 个性化推荐理由
  searchKeywords: string;   // 电商搜索关键词（可点击复制）
}
```

## 如何运行

```bash
# 同时启动前端 + 后端
npm run dev:all

# 或分别启动
npm run dev          # Vite 前端（端口 5173）
npm run dev:server   # API 后端（端口 3001）
```

- 前端开发时 Vite 自动代理 `/api` 到 `localhost:3001`（需在 `vite.config.ts` 中配置）
- `.env` 文件中需要 `DEEPSEEK_API_KEY=your_key`
- 构建：`npm run build`（tsc 类型检查 + vite 构建）

## Tauri 桌面应用打包

项目已配置 Tauri v2，可打包为 Windows .exe 安装程序。

VS Community 2026 安装在 `D:\APPs\Microsoft Visual Studio\18\Community\`。

**构建命令**（bash 中执行）：

```bash
export PATH="$HOME/.cargo/bin:$PATH"
export MSVC="D:/APPs/Microsoft Visual Studio/18/Community/VC/Tools/MSVC/14.50.35717"
export SDK="C:/Program Files (x86)/Windows Kits/10"
export SDK_VER=$(ls "$SDK/Lib" | head -1)
export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER="$MSVC/bin/Hostx64/x64/link.exe"
export LIB="$MSVC/lib/x64;$SDK/Lib/$SDK_VER/um/x64;$SDK/Lib/$SDK_VER/ucrt/x64"
export INCLUDE="$MSVC/include;$SDK/Include/$SDK_VER/ucrt;$SDK/Include/$SDK_VER/shared;$SDK/Include/$SDK_VER/um"
npx tauri build
```

输出：`src-tauri/target/release/bundle/nsis/gift-advisor_0.1.0_x64-setup.exe`（~8 MB）

## 重要约定与已知陷阱

### App.css 必须显式 import
App.css 不会自动生效。必须在 `App.tsx` 中 `import './App.css'`。否则 Vite 不会将其打包。排查：`npx vite build` 后检查 `dist/assets/*.css` 大小，如果只有 ~3KB 则说明 App.css 缺失。

### 零值是合法的
`parseInt("0", 10)` 返回 `0`，使用 `||` 会错误地落入默认值。必须用 `isNaN()` 判断。这在 budgetFlexibility 和 ageRange/knowDuration 滑块中都会遇到。

### QuestionCard 参数解构
添加新 props 时，必须同时更新 Props 接口和函数签名的解构参数，否则运行时 ReferenceError。

### 版本号
- `src/version.ts` 中定义 `APP_VERSION`
- 每次修改界面或逻辑后递增（Major.Minor.Patch）
- 版本标签显示在页面右下角

### UI 修改免审批
修改 `src/App.css` 时直接改动，不需确认。修改后给出改动说明。非 UI 改动（逻辑、API、数据）仍需确认。

### 废弃文件（已删除）
- `src/data/gifts.ts` — 旧静态礼物库（31 件），已删除，推荐由 AI 自由生成
- `src/utils/recommender.ts` — 旧本地打分算法，已删除，推荐逻辑在 server.ts

## 线上部署与同步

项目部署在腾讯云服务器，通过 pm2 管理进程。

| 项目 | 值 |
|------|-----|
| 服务器 IP | `43.139.105.225` |
| SSH 登录 | `ssh ubuntu@43.139.105.225` |
| 项目路径 | `~/gift` |
| 进程管理 | `pm2`（进程名 `gift-advisor`） |
| 访问地址 | http://43.139.105.225:3001/ |

### 本地修改后同步到服务器（完整流程）

每次本地修改代码并推送到 GitHub 后，必须在服务器上执行以下步骤：

```bash
# 1. SSH 登录服务器
ssh ubuntu@43.139.105.225

# 2. 拉取最新代码
cd ~/gift
git pull origin master

# 3. 安装依赖（如有新增）
npm install

# 4. 重新构建前端（关键！dist/ 在 .gitignore 中，git pull 不会更新）
npm run build

# 5. 重启服务
pm2 restart gift-advisor
```

### 关键陷阱

- **dist/ 必须重建**：`dist/` 在 `.gitignore` 中，`git pull` 不会更新它。每次前端有改动，必须在服务器上 `npm run build`，否则前端 JS 与后端 API 可能不匹配，导致页面报错
- **GitHub 使用 SSH**：国内 HTTPS 被墙，两边 remote 都已设为 `git@github.com:Relaxyz/gift-advisor.git`
- **API 限流**：每 IP 每小时 10 次 `/api/recommend` 请求，频繁测试会触发限流
- **构建要求**：服务器 `npm run build` 需要 `devDependencies`（typescript、vite 等），注意 `npm install` 时不要用 `--production`
- **查看日志**：`pm2 logs gift-advisor` 可查看运行日志排查 API 错误
