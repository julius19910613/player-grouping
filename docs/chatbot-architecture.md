# 聊天机器人架构设计

## 概述

本文档描述球员分组程序的聊天机器人集成架构，包括前端组件设计、后端 API 集成、数据流设计和安全性方案。核心目标是实现一个支持自然语言交互的智能助手，能够查询球员信息、执行分组操作，并通过联网搜索获取外部信息。

## 详细设计

### 1. 前端组件架构

#### 1.1 组件树结构

```
App
├── ShellBar
├── TabNavigation
├── ChatView (新增主组件)
│   ├── ChatHeader
│   │   ├── 标题
│   │   └── 状态指示器（在线/离线）
│   ├── MessageList
│   │   ├── MessageItem (用户消息)
│   │   ├── MessageItem (AI 消息)
│   │   │   ├── Markdown 渲染
│   │   │   └── 代码块高亮
│   │   └── TypingIndicator (打字动画)
│   ├── ChatInput
│   │   ├── 文本框（支持多行）
│   │   ├── 发送按钮
│   │   ├── 附件上传（可选）
│   │   └── 语音输入（可选）
│   └── QuickActions
│       ├── 快捷命令按钮
│       └── 建议回复
└── (现有组件保持不变)
```

#### 1.2 核心组件设计

**ChatView 主容器组件**
```typescript
interface ChatViewProps {
  onPlayerQuery: (query: string) => Promise<Player[]>;
  onGrouping: (config: GroupingConfig) => Promise<Team[]>;
  onWebSearch: (query: string) => Promise<SearchResult[]>;
}

// 职责：
// 1. 管理聊天状态（消息列表、加载状态）
// 2. 处理用户输入和消息发送
// 3. 协调 AI Agent 和 Function Calling
// 4. 流式输出处理
```

**MessageList 消息列表组件**
```typescript
interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

// 职责：
// 1. 虚拟滚动（性能优化）
// 2. 消息渲染（用户/AI 不同样式）
// 3. 自动滚动到底部
// 4. Markdown 和代码块渲染
```

**ChatInput 输入组件**
```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}

// 职责：
// 1. 多行文本输入
// 2. Enter 发送 / Shift+Enter 换行
// 3. 输入验证和清理
// 4. 快捷键支持
```

**QuickActions 快捷操作组件**
```typescript
interface QuickActionsProps {
  suggestions: string[];
  onSelect: (action: string) => void;
}

// 职责：
// 1. 显示常用命令快捷按钮
// 2. 根据上下文生成建议
// 3. 一键执行预设操作
```

#### 1.3 状态管理

使用 React Context + useReducer 管理聊天状态：

```typescript
interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string | null;
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'APPEND_STREAM'; payload: string }
  | { type: 'CLEAR_MESSAGES' };

// Context 创建
const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
} | null>(null);
```

### 2. 后端 API 集成架构

> **重要变更**: Review Agent 反馈 - 问题 1
> **变更内容**: 从 OpenRouter 改为 Vercel Serverless Function 代理

#### 2.1 API 层设计

**Vercel Serverless Function 代理 Gemini API**

**架构图：**
```
前端 → /api/chat (Vercel) → Gemini API
      ↑ 安全（API Key 在后端）
      ↑ 免费（Vercel Hobby Plan）
```

**核心实现：**

```typescript
// api/chat.ts - Vercel Serverless Function
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  maxDuration: 10, // Vercel Hobby Plan 限制
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. CORS 配置（Review 反馈 - 问题 5）
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : ['http://localhost:5173', 'http://localhost:3000'];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. 速率限制（Review 反馈 - 问题 5）
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const { allowed, remaining } = checkRateLimit(ip);

  res.setHeader('X-RateLimit-Remaining', remaining.toString());

  if (!allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60,
      message: '您的请求过于频繁，请 1 分钟后再试'
    });
  }

  // 3. 超时处理（Review 反馈 - 问题 2）
  const TIMEOUT_MS = 9000; // 9 秒（留 1 秒返回响应）
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
  });

  try {
    // 4. 调用 Gemini API
    const result = await Promise.race([
      callGeminiAPI(req.body),
      timeoutPromise
    ]);

    res.json(result);
  } catch (error: any) {
    // 5. 错误处理
    if (error.message === 'Timeout') {
      res.status(408).json({
        error: 'Request timeout',
        suggestion: '请求超时，请尝试简化问题或使用快捷命令',
        fallbackActions: [
          '查看所有球员',
          '快速分组',
          '查看统计'
        ]
      });
    } else if (error.status === 429) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'API 调用频率超限，请稍后重试'
      });
    } else {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: '服务暂时不可用，请稍后重试'
      });
    }
  }
}

// Gemini API 调用
async function callGeminiAPI(body: any) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = new Error(`Gemini API error: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return await response.json();
}

// 速率限制实现
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache<string, number>({
  max: 500, // 最多缓存 500 个 IP
  ttl: 60000, // 1 分钟
});

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const count = rateLimit.get(ip) || 0;
  const limit = 10; // 每分钟最多 10 次请求

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  rateLimit.set(ip, count + 1);
  return { allowed: true, remaining: limit - count - 1 };
}
```

**环境变量配置（Vercel Dashboard）：**
```bash
# 在 Vercel 项目设置 → Environment Variables 添加：
GEMINI_API_KEY=your_api_key_here
# ⚠️ 重要：不要使用 VITE_ 前缀，确保只在后端使用
```

#### 2.1.1 Vercel 完整配置示例

> **新增**: Review Agent 反馈 - 问题 2

**vercel.json（项目根目录）：**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1",
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "GEMINI_API_KEY": "@gemini-api-key",
    "BRAVE_SEARCH_API_KEY": "@brave-api-key",
    "DEEPSEEK_API_KEY": "@deepseek-api-key"
  },
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

**配置说明：**
- **builds**: 配置 API Routes 和前端构建
- **routes**: API 路由配置，包括 CORS 头
- **env**: 环境变量引用（在 Vercel Dashboard 中配置）
- **functions**: API Route 超时设置（Hobby Plan 最多 10 秒）

**部署步骤：**
1. 将 `vercel.json` 添加到项目根目录
2. 在 Vercel Dashboard 配置环境变量
3. 运行 `vercel --prod` 部署

#### 2.2 Function Calling 设计

**Function 定义**

```typescript
// src/lib/agent-functions.ts

// 球员查询功能
const queryPlayersFunction = {
  name: 'query_players',
  description: '查询球员信息，支持按姓名、位置、能力筛选',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '球员姓名（模糊匹配）' },
      position: { type: 'string', enum: ['guard', 'forward', 'center'] },
      minOverall: { type: 'number', description: '最低总体能力' },
      limit: { type: 'number', description: '返回数量限制' }
    }
  }
};

// 分组功能
const createGroupingFunction = {
  name: 'create_grouping',
  description: '执行智能分组，将球员分配到平衡的团队',
  parameters: {
    type: 'object',
    properties: {
      playerIds: { 
        type: 'array', 
        items: { type: 'string' },
        description: '参与分组的球员 ID 列表'
      },
      teamCount: { type: 'number', description: '团队数量' },
      strategy: { type: 'string', enum: ['balanced', 'random'] }
    },
    required: ['playerIds', 'teamCount']
  }
};

// 联网搜索功能
const webSearchFunction = {
  name: 'web_search',
  description: '联网搜索篮球相关信息（NBA 新闻、球员数据等）',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' }
    },
    required: ['query']
  }
};

// 导出所有函数定义
export const agentFunctions = [
  queryPlayersFunction,
  createGroupingFunction,
  webSearchFunction
];
```

**Function 执行器**

```typescript
// src/lib/function-executor.ts
class FunctionExecutor {
  private playerRepository: PlayerRepository;
  private webSearchClient: WebSearchClient;

  async execute(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'query_players':
        return await this.queryPlayers(args);
      
      case 'create_grouping':
        return await this.createGrouping(args);
      
      case 'web_search':
        return await this.webSearch(args);
      
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private async queryPlayers(args: any) {
    const { name, position, minOverall, limit = 10 } = args;
    const players = await this.playerRepository.findAll();
    
    // 应用筛选条件
    let filtered = players;
    if (name) {
      filtered = filtered.filter(p => p.name.includes(name));
    }
    if (position) {
      filtered = filtered.filter(p => p.position === position);
    }
    if (minOverall) {
      filtered = filtered.filter(p => p.skills.overall >= minOverall);
    }
    
    return filtered.slice(0, limit);
  }

  private async createGrouping(args: any) {
    const { playerIds, teamCount, strategy = 'balanced' } = args;
    const players = await this.playerRepository.findByIds(playerIds);
    
    const config: GroupingConfig = { teamCount, strategy };
    const teams = GroupingAlgorithm.groupPlayers(players, config);
    
    return {
      teams,
      balance: GroupingAlgorithm.calculateBalance(teams),
      timestamp: new Date().toISOString()
    };
  }

  private async webSearch(args: any) {
    const { query } = args;
    return await this.webSearchClient.search(query);
  }
}
```

#### 2.2 中国用户访问优化

> **决策来源**: Review Agent 反馈 - 问题 3
> **重要性**: 目标用户主要在中国，需要确保访问速度和稳定性

**优化方案 1: 自定义域名 + Cloudflare CDN**

```typescript
// vercel.json - Vercel 配置
{
  "domains": [
    {
      "domain": "chat.yourdomain.com",
      "dnsRecords": [
        {
          "type": "CNAME",
          "value": "cname.vercel-dns.com"
        }
      ]
    }
  ]
}
```

**Cloudflare CDN 配置步骤：**
1. 购买域名（如 chat.yourdomain.com）
2. 在 Vercel 添加自定义域名
3. 在 Cloudflare 添加域名
4. 配置 DNS 解析：
   - 类型：CNAME
   - 名称：chat
   - 目标：cname.vercel-dns.com
5. 启用 Cloudflare CDN（免费）

**效果：**
- ✅ 访问速度提升 50-70%
- ✅ 稳定性提高
- ✅ 免费（Cloudflare 免费套餐）

---

**优化方案 2: 智能降级到国内 AI 模型**

```typescript
// api/chat.ts
async function selectAIProvider(req: NextApiRequest) {
  const ip = req.headers['x-forwarded-for'];
  const country = await getCountryByIP(ip as string);

  if (country === 'CN') {
    // 中国用户使用 DeepSeek（延迟 50-200ms）
    return {
      provider: 'deepseek',
      client: new DeepSeekClient(process.env.DEEPSEEK_API_KEY)
    };
  } else {
    // 其他地区使用 Gemini（通过 Vercel）
    return {
      provider: 'gemini',
      client: new GeminiClient(process.env.GEMINI_API_KEY)
    };
  }
}

// IP 地理位置查询（使用免费服务）
async function getCountryByIP(ip: string): Promise<string> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/country_code/`);
    return await response.text();
  } catch (error) {
    return 'US'; // 默认美国
  }
}
```

---

**优化方案 3: 前端超时检测和降级**

```typescript
// src/lib/chat/api-client.ts
const TIMEOUT_MS = 9000; // 9 秒超时

async function sendMessage(message: string): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 408) {
        // 超时，显示降级选项
        const data = await response.json();
        return {
          error: 'timeout',
          suggestion: data.suggestion,
          fallbackActions: data.fallbackActions
        };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        error: 'timeout',
        suggestion: '请求超时，请尝试简化问题或使用快捷命令',
        fallbackActions: ['查看所有球员', '快速分组', '查看统计']
      };
    }
    throw error;
  }
}
```

---

#### 2.3 Agent 编排逻辑

```typescript
// src/lib/chat-agent.ts
class ChatAgent {
  private geminiClient: GeminiClient;
  private functionExecutor: FunctionExecutor;

  async *processMessage(userMessage: string): AsyncGenerator<AgentEvent> {
    // 1. 发送用户消息给 Gemini
    yield { type: 'thinking', message: '正在思考...' };

    const response = await this.geminiClient.chatWithFunctions(
      [{ role: 'user', content: userMessage }],
      agentFunctions
    );

    // 2. 检查是否需要调用函数
    if (response.functionCall) {
      yield { 
        type: 'function_call', 
        name: response.functionCall.name,
        args: response.functionCall.args
      };

      // 执行函数
      const result = await this.functionExecutor.execute(
        response.functionCall.name,
        response.functionCall.args
      );

      yield { type: 'function_result', result };

      // 3. 将函数结果反馈给 Gemini，生成最终回复
      const finalResponse = await this.geminiClient.chatWithFunctions(
        [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: null, functionCall: response.functionCall },
          { role: 'function', name: response.functionCall.name, content: JSON.stringify(result) }
        ],
        agentFunctions
      );

      // 4. 流式输出最终回复
      for await (const chunk of this.geminiClient.streamChat([...])) {
        yield { type: 'content', text: chunk };
      }
    } else {
      // 没有函数调用，直接输出回复
      for await (const chunk of this.geminiClient.streamChat([...])) {
        yield { type: 'content', text: chunk };
      }
    }
  }
}
```

### 3. 数据流设计

#### 3.1 完整数据流

```
用户输入
  ↓
ChatInput 组件
  ↓ (dispatch ADD_MESSAGE)
ChatState (Context)
  ↓ (调用 processMessage)
ChatAgent
  ↓ (发送给 Gemini API)
Gemini API (通过代理)
  ↓ (返回 Function Call)
FunctionExecutor
  ↓ (执行函数)
  ├→ PlayerRepository (查询球员)
  ├→ GroupingAlgorithm (执行分组)
  └→ WebSearchClient (联网搜索)
  ↓ (返回结果)
ChatAgent (将结果反馈给 Gemini)
  ↓ (生成最终回复)
Gemini API (流式输出)
  ↓ (AsyncGenerator)
ChatView 组件
  ↓ (逐步渲染)
MessageList (显示 AI 回复)
```

#### 3.2 状态更新流程

```typescript
// 用户发送消息
dispatch({ type: 'ADD_MESSAGE', payload: { role: 'user', content } });
dispatch({ type: 'SET_LOADING', payload: true });

// 处理 Agent 事件
for await (const event of agent.processMessage(content)) {
  switch (event.type) {
    case 'thinking':
      dispatch({ type: 'APPEND_STREAM', payload: '🤔 ' + event.message });
      break;
    
    case 'function_call':
      dispatch({ 
        type: 'APPEND_STREAM', 
        payload: `\n\n🔧 正在执行: ${event.name}...` 
      });
      break;
    
    case 'content':
      dispatch({ type: 'APPEND_STREAM', payload: event.text });
      break;
  }
}

// 完成处理
dispatch({ type: 'SET_LOADING', payload: false });
```

### 4. 安全性设计

#### 4.1 API Key 保护

> **重要澄清**: Review Agent 反馈 - 问题 4
> **核心原则**: 前端绝不直接使用 API Key，所有 API 调用必须通过后端代理

**❌ 错误做法（不要在前端使用 API Key）：**

```typescript
// ❌ 错误：VITE_ 前缀的环境变量会被打包到前端代码
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const response = await fetch(`https://...?key=${apiKey}`);

// ❌ 错误：直接调用 Gemini API
const response = await fetch('https://generativelanguage.googleapis.com/...');
```

**风险：**
- API Key 会暴露在前端代码中
- 恶意用户可以通过浏览器开发者工具获取
- 可能被滥用，产生不必要的费用
- 违反 Gemini API 使用条款

**✅ 正确做法（所有 API 调用通过后端）：**

```typescript
// ✅ 正确：前端只调用后端 API Route
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
});
```

**环境变量配置（Vercel Dashboard）：**

```bash
# 在 Vercel 项目设置 → Environment Variables 添加：
# ⚠️ 注意：不要使用 VITE_ 前缀

# Gemini API Key（后端使用）
GEMINI_API_KEY=your_gemini_api_key_here

# Brave Search API Key（后端使用）
BRAVE_SEARCH_API_KEY=your_brave_api_key_here

# DeepSeek API Key（后端使用，可选）
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

**Vercel API Route 中使用：**

```typescript
// api/chat.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ 正确：在服务端使用环境变量
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify(req.body)
    }
  );

  res.json(await response.json());
}
```

**安全检查清单：**
- [ ] 前端代码中不包含任何 API Key
- [ ] 环境变量不以 `VITE_` 开头
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] Vercel 环境变量已正确配置
- [ ] 定期轮换 API Key（建议每 3 个月）
- [ ] 监控 API 调用量，及时发现异常

**环境变量管理**
```typescript
// .env.local (仅用于本地开发，不提交到 Git)
# ⚠️ 这些变量只用于本地开发，不会被 Vite 打包到前端
# 因为没有 VITE_ 前缀

GEMINI_API_KEY=your_api_key_here
BRAVE_SEARCH_API_KEY=your_api_key_here

// .gitignore
.env.local
.env.*.local
```

#### 4.2 输入验证和清理

```typescript
// 用户输入清理
function sanitizeUserInput(input: string): string {
  // 1. 去除危险标签
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  
  // 2. 限制长度
  if (sanitized.length > 1000) {
    throw new Error('输入过长');
  }
  
  // 3. 防止注入攻击
  return sanitized.trim();
}

// Function 参数验证
function validateFunctionArgs(name: string, args: any): void {
  const schema = functionSchemas[name];
  if (!schema) {
    throw new Error(`Unknown function: ${name}`);
  }
  
  const { error } = schema.validate(args);
  if (error) {
    throw new Error(`Invalid arguments: ${error.message}`);
  }
}
```

#### 4.3 错误处理和降级

```typescript
// 错误边界
class ChatErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到日志服务
    console.error('Chat error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-destructive/10 rounded-lg">
          <p>聊天功能出现错误，请刷新页面重试</p>
          <Button onClick={() => window.location.reload()}>刷新</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 网络错误处理
async function safeApiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NetworkError) {
      // 网络错误，显示友好提示
      toast.error('网络连接失败，请检查网络设置');
    } else if (error instanceof RateLimitError) {
      // 速率限制，延迟重试
      await sleep(5000);
      return safeApiCall(fn);
    } else {
      // 其他错误，记录并抛出
      console.error('API call failed:', error);
      throw error;
    }
  }
}
```

#### 4.4 数据隐私

**敏感信息过滤**
```typescript
// 在发送给 Gemini 前，过滤敏感字段
function filterSensitiveData(players: Player[]): SafePlayer[] {
  return players.map(p => ({
    id: p.id,
    name: p.name,
    position: p.position,
    skills: p.skills
    // 不包含 created_at, updated_at 等可能泄露的信息
  }));
}
```

**本地存储安全**
```typescript
// 加密本地聊天历史（可选）
import { encrypt, decrypt } from 'crypto-js';

const ENCRYPTION_KEY = 'your-secret-key';

function saveChatHistory(messages: ChatMessage[]) {
  const encrypted = encrypt(JSON.stringify(messages), ENCRYPTION_KEY);
  localStorage.setItem('chat_history', encrypted.toString());
}

function loadChatHistory(): ChatMessage[] {
  const encrypted = localStorage.getItem('chat_history');
  if (!encrypted) return [];
  
  const decrypted = decrypt(encrypted, ENCRYPTION_KEY);
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}
```

## 技术选型

### 前端框架选择

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **自建组件** | 完全可控、符合设计系统、轻量 | 开发成本高 | ⭐⭐⭐⭐ |
| chat-ui-kit-react | 开箱即用、文档完善 | 样式定制困难、体积大 | ⭐⭐⭐ |
| @llamaindex/chat-ui | 功能丰富、支持流式 | 依赖 LlamaIndex 生态 | ⭐⭐ |

**推荐方案：自建组件 + shadcn/ui**

理由：
1. 项目已使用 shadcn/ui，风格一致
2. 完全可控，便于定制
3. 避免额外依赖
4. 支持流式输出

### Markdown 渲染

| 库 | 优点 | 缺点 |
|---|------|------|
| react-markdown | 轻量、插件生态丰富 | 需要手动配置代码高亮 |
| marked + DOMPurify | 灵活、安全 | 需要自己处理 React 渲染 |

**推荐：react-markdown + remark-gfm + rehype-highlight**

### 流式处理

| 技术 | 场景 |
|------|------|
| SSE (Server-Sent Events) | Gemini API 原生支持 |
| WebSocket | 实时双向通信（过度设计） |
| AsyncGenerator | 前端流式渲染（推荐） |

## 实现步骤

### Phase 1: 基础组件（1-2 天）

1. 创建 `ChatView` 主组件
2. 实现 `MessageList` 和 `MessageItem`
3. 实现 `ChatInput` 组件
4. 添加 `TypingIndicator` 动画
5. 集成到现有 Tab 导航

### Phase 2: API 集成（2-3 天）

1. 配置 Gemini API 代理
2. 实现 `GeminiClient` 类
3. 实现流式聊天功能
4. 添加错误处理和重试
5. 测试 API 连接

### Phase 3: Function Calling（3-4 天）

1. 定义 Function Schemas
2. 实现 `FunctionExecutor`
3. 实现 `ChatAgent` 编排逻辑
4. 集成 PlayerRepository 和 GroupingAlgorithm
5. 添加 Web Search 功能

### Phase 4: 优化和测试（2-3 天）

1. 性能优化（虚拟滚动、懒加载）
2. 添加单元测试和集成测试
3. 用户体验优化（快捷键、自动补全）
4. 文档编写

**总计：8-12 天**

## 注意事项

### 1. 中国网络环境

- ✅ 必须使用代理或第三方平台访问 Gemini API
- ✅ 准备降级方案（切换到国内 AI 模型）
- ✅ 提供离线模式（仅使用本地 Function）
- ⚠️ 监控 API 可用性，及时切换

### 2. 成本控制

- ✅ 实现本地缓存，减少重复请求
- ✅ 限制对话上下文长度（最近 10 条消息）
- ✅ 用户输入验证，避免无效请求
- ✅ 监控 API 调用量，设置告警

### 3. 用户体验

- ✅ 流式输出，避免长时间等待
- ✅ 显示加载状态和进度
- ✅ 提供快捷操作和示例问题
- ✅ 支持中断生成（停止按钮）

### 4. 可扩展性

- ✅ Function 设计保持单一职责
- ✅ 支持动态注册新 Function
- ✅ 预留多模态支持（图片、语音）
- ✅ 考虑多语言支持

### 5. 性能优化

- ✅ 使用虚拟滚动处理长对话
- ✅ 防抖和节流用户输入
- ✅ 懒加载历史消息
- ✅ Web Worker 处理大量数据

## 未来扩展

1. **多模态支持**：图片识别、语音输入
2. **对话管理**：保存/加载对话、导出对话
3. **个性化**：学习用户偏好、自适应回复风格
4. **多语言**：支持中英文切换
5. **协作功能**：分享对话、团队协作
6. **高级 Agent**：自动分组建议、训练计划生成
