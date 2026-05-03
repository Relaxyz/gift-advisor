# 选礼物助手 (gift-advisor)

AI 驱动的个性化礼物推荐工具。回答 10 个关于收礼人的简单问题，AI 自动生成量身定制的礼物方案。

## 功能

- 10 道问卷覆盖：关系、预算、性别、年龄、场合、认识时长、兴趣、性格、风格偏好、特殊限制
- 预算支持双滑块（金额 + 浮动比例），每道题支持自定义补充
- DeepSeek AI 三阶段推荐：生成 → 审查过滤 → 程序化兜底校验
- 每个推荐含：礼物名称、价格区间、一句话介绍、个性化理由、电商搜索关键词（可点击复制）

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API Key
echo "DEEPSEEK_API_KEY=你的密钥" > .env

# 同时启动前端 + 后端
npm run dev:all
```

启动后浏览器访问 `http://localhost:5173`。

## 项目结构

```
gift-advisor/
├── server.ts              ← 后端 API（Express + DeepSeek）
├── src/
│   ├── App.tsx            ← 主组件，状态机控制页面流转
│   ├── App.css            ← 全部 UI 样式
│   ├── index.css          ← CSS 变量、全局样式、dark mode
│   ├── types.ts           ← 类型定义
│   ├── version.ts         ← 版本号
│   ├── data/questions.ts  ← 10 道问卷题目
│   └── components/        ← UI 组件
```

## 技术栈

- 前端：React 19 + Vite + TypeScript
- 后端：Express + OpenAI SDK
- AI：DeepSeek API

## 许可证

MIT
