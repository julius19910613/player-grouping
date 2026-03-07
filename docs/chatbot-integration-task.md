# 球员分组程序 - 聊天机器人集成任务

## 📋 任务概述

对现有的 player-grouping 程序进行重大改造，将核心功能从列表页面转换为对话式交互。

### 改造目标

1. **UI 重构**
   - 将球员列表和分组管理功能移至菜单页面（次要页面）
   - 主页面改为聊天对话框界面
   - 保持现有功能不变，只是改变交互方式

2. **Gemini API 集成**
   - 接入 Gemini API 实现聊天机器人
   - 需要考虑中国地区的访问限制（API 代理方案）
   - 实现流式响应（streaming）

3. **机器人能力设计**
   机器人需要具备两个核心能力：
   
   **能力 1: 查询球员**
   - 从 Supabase 数据库查询球员信息
   - 支持自然语言查询（如"查询投篮能力最强的球员"）
   - 返回结构化的球员数据
   
   **能力 2: 联网查询**
   - 当用户问题涉及实时信息时，进行 web search
   - 例如："最新的篮球训练技巧"、"NBA 最新新闻"等
   - 需要集成 web search API（如 Brave Search）

## 🏗️ 技术栈

### 现有技术
- React 18 + TypeScript
- Vite
- Supabase (PostgreSQL + Auth)
- Tailwind CSS + shadcn/ui

### 新增技术（待确认）
- Gemini API（需要代理方案）
- Web Search API（Brave Search 或其他）
- Function Calling / Tool Use

## 📐 架构设计需求

### 1. 前端架构

```
App
├── ShellBar (顶部导航)
│   ├── Logo + 标题
│   └── 菜单（球员管理 | 分组工具 | 设置）
│
├── MainContent (主内容区)
│   ├── ChatView (默认首页)
│   │   ├── MessageList (消息列表)
│   │   └── ChatInput (输入框)
│   │
│   ├── PlayerManagement (菜单跳转)
│   └── GroupingTool (菜单跳转)
│
└── Sidebar (可选)
    └── 对话历史
```

### 2. 后端架构（前端调用）

```typescript
// Gemini API 集成
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatRequest {
  messages: ChatMessage[]
  tools?: Tool[] // Function calling
}

// Function Calling 定义
const tools = [
  {
    name: 'query_players',
    description: '查询球员信息',
    parameters: {
      query: string, // 自然语言查询
      filters?: { position?, skill?, min_rating? }
    }
  },
  {
    name: 'web_search',
    description: '联网搜索信息',
    parameters: {
      query: string
    }
  }
]
```

### 3. 数据流

```
User Input 
  → Gemini API (with Function Calling)
  → Function Execution (query_players / web_search)
  → Function Result
  → Gemini API (continue conversation)
  → Response to User
```

## 🚧 技术挑战

### 挑战 1: Gemini API 中国访问

**问题**: Gemini API 在中国地区不可用

**解决方案（已确定）**: **Vercel Serverless Function 代理**

**部署方案**:
- **本地开发**: 直连 Gemini API（有科学上网环境）
- **Vercel 部署**: 
  - 使用 Vercel Serverless Function 做代理
  - API Key 存储在 Vercel 环境变量（安全）
  - 用户通过 Vercel 访问（无需科学上网）

**优势**:
- ✅ 免费（Vercel Hobby Plan）
- ✅ 全球 CDN（访问速度快）
- ✅ API Key 安全（不暴露在前端）
- ✅ 无需第三方代理服务

**需要实现**:
```typescript
// /api/chat.ts (Vercel Serverless Function)
export default async function handler(req, res) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
  
  const data = await response.json();
  res.json(data);
}
```

**~~其他可能的解决方案~~**（不再需要）:
1. ~~API 代理服务~~ - 使用第三方代理（如灵芽API、ApiYi 等）
2. ~~自建代理~~ - 在海外服务器搭建 Nginx 反向代理
3. ~~切换模型~~ - 使用 OpenAI API 或国内大模型（通义千问、文心一言等）

**~~需要调研~~**（已确定方案）:
- ~~哪些代理服务稳定可靠？~~
- ~~成本如何？~~
- ~~是否支持 Function Calling？~~

### 挑战 2: Function Calling 实现

**问题**: 需要实现 Agent 能力（查询球员 + 联网搜索）

**需要调研**:
- Gemini API 的 Function Calling 如何使用？
- 如何处理多次函数调用？
- 如何实现流式响应 + Function Calling？

### 挑战 3: Web Search API 集成

**问题**: 需要联网搜索能力

**可选方案**:
1. Brave Search API（免费额度）
2. SerpAPI（付费）
3. Google Custom Search（有配额限制）
4. Bing Web Search API

**需要调研**:
- 哪个 API 最适合？
- 如何集成到 Function Calling 流程？

## 📦 交付物

### 设计阶段交付
1. **架构设计文档** (`chatbot-architecture.md`)
   - 前端组件设计
   - API 集成方案
   - Function Calling 流程图
   - 数据流图

2. **技术选型报告** (`tech-selection.md`)
   - Gemini API 代理方案对比
   - Web Search API 选型
   - 成本估算

3. **实现计划** (`implementation-plan.md`)
   - Phase 划分
   - 每个 Phase 的任务清单
   - 预估工时

### 实现阶段交付
- 重构后的前端代码
- API 集成代码
- 测试用例
- 使用文档

## 🎯 设计要求

1. **用户体验优先**
   - 聊天界面要简洁美观
   - 响应速度要快（流式输出）
   - 错误提示要友好

2. **可扩展性**
   - 未来可能添加更多能力（如：自动分组、训练建议等）
   - 代码结构要支持快速添加新功能

3. **成本控制**
   - API 调用要考虑成本
   - 尽量使用免费额度
   - 做好缓存和优化

4. **安全性**
   - API Key 不能暴露在前端
   - 需要后端代理或 Supabase Edge Functions

## 📝 补充说明

### 现有项目信息
- **路径**: `/Users/ppt/Projects/player-grouping`
- **当前状态**: Supabase 迁移完成（Phase 1-3），数据层已就绪
- **数据库**: Supabase PostgreSQL，包含球员表、比赛记录表等
- **已有功能**: 球员管理、智能分组、数据可视化

### 参考资源
- React Chat UI 组件库: https://github.com/chatscope/chat-ui-kit-react
- LlamaIndex Chat UI: https://github.com/run-llama/chat-ui
- OpenAI Function Calling Guide: https://platform.openai.com/docs/guides/function-calling
- Gemini API 中国使用指南: https://www.aifreeapi.com/en/posts/how-to-use-gemini-in-china

## 🤖 Agent 任务

### 设计 Agent
- **目标**: 完成架构设计和技术选型
- **输出**: 
  1. `docs/chatbot-architecture.md` - 架构设计文档
  2. `docs/tech-selection.md` - 技术选型报告
  3. `docs/implementation-plan.md` - 实现计划

### Review Agent
- **目标**: 审核设计方案的合理性
- **检查点**:
  - 架构设计是否合理？
  - 技术选型是否考虑了成本和可行性？
  - 实现计划是否可执行？
  - 是否有遗漏的技术挑战？
  - 是否考虑了中国的网络环境？

---

**创建时间**: 2026-03-07 19:50
**创建人**: Julius + Javis
**状态**: 待设计
