# 选礼物助手 (gift-advisor)

AI 驱动的个性化礼物推荐工具。回答几个关于收礼人的简单问题，AI 自动生成量身定制的礼物方案，附带价格区间和电商搜索关键词。

## 功能

- 问卷覆盖：关系、预算、年龄、场合、兴趣、性格偏好、排除项等
- 预算支持双滑块（金额 + 浮动比例）
- DeepSeek AI 两阶段推荐：生成候选 → 智能筛选
- 每个推荐含：礼物名称、价格区间、简介、个性化理由、电商搜索关键词（可点击复制）
- 历史记录：最近 5 次推荐保存到本地
- 会话持久化：刷新页面自动恢复到上次停留的步骤
- 支持导出 .md 格式推荐结果

## 快速开始（本地开发）

```bash
# 安装依赖
npm install

# 配置 API Key
echo "DEEPSEEK_API_KEY=你的密钥" > .env

# 同时启动前端 + 后端
npm run dev:all
```

浏览器访问 `http://localhost:5173`。

## 部署到线上（Zeabur）

构建后由 Express 统一托管前后端，一个端口即可运行。

### 1. 推送到 GitHub

将代码上传到 GitHub 仓库（公开或私有均可）。

### 2. Zeabur 部署

1. 注册 [Zeabur](https://zeabur.com)，用 GitHub 账号登录
2. 新建项目 → 选择仓库 → Zeabur 自动识别 Node.js 项目
3. 配置环境变量：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API 密钥 |
| `NODE_ENV` | 是 | 设为 `production` |
| `ACCESS_CODE` | 否 | 访问口令，设置后需在 URL 中传入 `?code=口令` |

4. 部署完成后获得 `项目名.zeabur.app` 域名，直接访问即可。

### 3. 安全防护

- **IP 限流**：每个 IP 每小时最多 10 次推荐请求（防爬虫耗尽 API 额度）
- **访问口令**：可选，设置 `ACCESS_CODE` 后分享 `xxx.zeabur.app?code=你的口令`

### 4. 本地测试生产模式

```bash
npm run build
NODE_ENV=production node server.ts
# 浏览器访问 http://localhost:3001
```

## 项目结构

```
gift-advisor/
├── server.ts              ← 后端 API（Express + DeepSeek）
├── src/
│   ├── api.ts             ← 前端 API 调用封装
│   ├── App.tsx            ← 主组件，状态机控制页面流转
│   ├── App.css            ← 全部 UI 样式
│   ├── index.css          ← CSS 变量、全局样式、dark mode
│   ├── types.ts           ← 类型定义
│   ├── version.ts         ← 版本号
│   ├── data/questions.ts  ← 问卷题目
│   └── components/        ← UI 组件
```

## 技术栈

- 前端：React 19 + Vite + TypeScript
- 后端：Express 5 + OpenAI SDK
- AI：DeepSeek API
- 部署：Zeabur（或任意 Node.js 托管平台）

## 打包桌面应用

已配置 Tauri v2，可打包为 Windows .exe：

```bash
npx tauri build
```

输出：`src-tauri/target/release/bundle/nsis/gift-advisor_0.1.0_x64-setup.exe`

## 许可证

MIT
