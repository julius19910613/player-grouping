# 聊天机器人集成实施计划

## 概述

本文档提供聊天机器人功能的详细实施计划，包括 Phase 划分、任务清单、工时估算、风险点和应对方案。计划采用渐进式开发策略，确保每个阶段都能交付可用功能。

## 详细设计

### Phase 划分

```
Phase 0: 准备工作 (1 天)
    ↓
Phase 1: UI 重构 - 基础组件 (2-3 天)
    ↓
Phase 2: API 集成 - Gemini 连接 (2-3 天)
    ↓
Phase 3: Function Calling - Agent 能力 (3-4 天)
    ↓
Phase 4: 联网搜索集成 (2-3 天)
    ↓
Phase 5: 优化和测试 (2-3 天)
    ↓
Phase 6: 部署和监控 (1-2 天)
```

**总计：16-25 天（约 3-4 周）**

> **调整说明**: Review Agent 反馈 - 问题 7
> **原因**:
> 1. Phase 2 增加了超时处理、CORS 配置、中国访问验证（+1 天）
> 2. Phase 4 增加了 Brave Search 可用性验证（+0.5 天）
> 3. 增加了 2-3 天的缓冲时间用于调试和 Bug 修复
> 4. **新总工时：16-25 天**（比原计划 13-19 天增加约 30%）**

## Phase 0: 准备工作 (1 天)

### 目标
- 配置开发环境
- 准备 API Keys（Vercel + Gemini + Brave Search）
- 创建基础结构

### 任务清单

#### 0.1 环境配置 (2 小时)

> **变更**: Review Agent 反馈 - 问题 1
> **说明**: 不再需要 OpenRouter，改用 Vercel Serverless Function

- [ ] 申请 Gemini API Key
  - 访问 https://makersuite.google.com/app/apikey
  - 创建 API Key
  - ⚠️ **重要**：不要在前端使用，只配置到 Vercel 环境变量

- [ ] 申请 Brave Search API Key
  - 访问 https://brave.com/search/api/
  - 申请 API Key
  - ⚠️ **重要**：不要在前端使用，只配置到 Vercel 环境变量

- [ ] （可选）申请 DeepSeek API Key
  - 访问 https://platform.deepseek.com/
  - 申请 API Key
  - 用途：中国用户降级方案

**验证脚本：**
```bash
# 创建测试脚本（注意：这些测试在后端进行）
cat > test-api-keys.sh << 'EOF'
#!/bin/bash

echo "Testing Gemini API (后端测试)..."
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' | jq .

echo "Testing Brave Search API (后端测试)..."
curl -s "https://api.search.brave.com/res/v1/web/search?q=test&count=1" \
  -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY" | jq .

echo "All API keys validated!"
EOF

chmod +x test-api-keys.sh
./test-api-keys.sh
```

#### 0.2 Vercel 配置 (1 小时)

> **新增**: Review Agent 反馈 - 问题 1

- [ ] 创建 Vercel 项目
  - 访问 https://vercel.com
  - 导入 GitHub 仓库
  - 配置项目设置

- [ ] 配置环境变量（Vercel Dashboard）
  ```
  GEMINI_API_KEY=your_gemini_api_key
  BRAVE_SEARCH_API_KEY=your_brave_api_key
  DEEPSEEK_API_KEY=your_deepseek_api_key (可选)
  ```

- [ ] 创建 API Route 目录
  ```bash
  mkdir -p api
  touch api/chat.ts
  ```

- [ ] 安装依赖
  ```bash
  npm install lru-cache
  ```

- [ ] 配置 .gitignore（**重要：防止 API Key 泄露**）
  ```gitignore
  # 环境变量（⚠️ 永远不要提交这些文件）
  .env
  .env.local
  .env.*.local

  # API Keys（⚠️ 永远不要提交这些文件）
  *.pem
  *.key

  # 依赖
  node_modules/

  # 构建产物
  dist/
  build/
  .vercel/
  .next/

  # 日志
  *.log
  npm-debug.log*

  # 编辑器
  .vscode/
  .idea/

  # 操作系统
  .DS_Store
  Thumbs.db
  ```

#### 0.3 项目结构调整 (2 小时)

#### 0.2 项目结构调整 (2 小时)

- [ ] 创建聊天相关目录
```bash
mkdir -p src/components/chat
mkdir -p src/lib/chat
mkdir -p src/lib/agent
mkdir -p src/__tests__/chat
```

- [ ] 创建类型定义文件
```typescript
// src/types/chat.ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'function';
  content: string;
  timestamp: number;
  functionCall?: FunctionCall;
  functionResult?: any;
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface AgentEvent {
  type: 'thinking' | 'function_call' | 'function_result' | 'content' | 'error';
  message?: string;
  name?: string;
  args?: any;
  result?: any;
  text?: string;
}
```

#### 0.3 依赖安装 (1 小时)

- [ ] 安装必要依赖
```bash
# Markdown 渲染
npm install react-markdown remark-gfm rehype-highlight

# 代码高亮
npm install highlight.js

# 工具库
npm install uuid date-fns

# 类型定义
npm install -D @types/uuid
```

#### 0.4 文档和规范 (1 小时)

- [ ] 创建开发日志模板
- [ ] 确定代码风格
- [ ] 配置 ESLint 规则

### 交付物
- ✅ `.env.local` 配置完成
- ✅ 项目结构就绪
- ✅ 依赖安装完成
- ✅ API Keys 验证通过

### 风险点
- ⚠️ API Key 申请可能需要时间
- ⚠️ 中国大陆无法直接访问 Gemini

**应对方案：**
- 准备 OpenRouter 作为备用
- 提前申请，避免阻塞开发

---

## Phase 1: UI 重构 - 基础组件 (2-3 天)

### 目标
- 实现聊天界面基础组件
- 集成到现有 Tab 导航
- 实现基本的用户交互

### 任务清单

#### 1.1 ChatView 主容器 (4 小时)

**文件：** `src/components/chat/ChatView.tsx`

```typescript
import React from 'react';
import { Card } from '@/components/ui/card';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (content: string) => {
    // TODO: Phase 2 实现
    setMessages(prev => [...prev, {
      id: uuid(),
      role: 'user',
      content,
      timestamp: Date.now()
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <ChatHeader />
      <Card className="flex-1 flex flex-col overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} />
        <QuickActions onSelect={handleSend} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </Card>
    </div>
  );
}
```

**任务：**
- [ ] 创建 ChatView 组件
- [ ] 实现响应式布局
- [ ] 添加加载状态
- [ ] 编写单元测试

#### 1.2 ChatHeader 组件 (1 小时)

**文件：** `src/components/chat/ChatHeader.tsx`

**功能：**
- 显示标题
- 显示连接状态（在线/离线）
- 清空对话按钮
- 设置按钮

#### 1.3 MessageList 组件 (3 小时)

**文件：** `src/components/chat/MessageList.tsx`

**功能：**
- 渲染消息列表
- 自动滚动到底部
- 虚拟滚动（可选）
- 打字指示器

**实现要点：**
```typescript
import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
```

#### 1.4 ChatMessage 组件 (3 小时)

**文件：** `src/components/chat/ChatMessage.tsx`

**功能：**
- 区分用户/AI 消息样式
- Markdown 渲染
- 代码块高亮
- Function Call 结果展示

**实现要点：**
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-lg p-3",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {message.role === 'function' ? (
          <FunctionResultDisplay result={message.functionResult} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {message.content}
          </ReactMarkdown>
        )}
        <div className="text-xs opacity-70 mt-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
```

#### 1.5 ChatInput 组件 (2 小时)

**文件：** `src/components/chat/ChatInput.tsx`

**功能：**
- 多行文本输入
- Enter 发送 / Shift+Enter 换行
- 字符计数
- 禁用状态

**实现要点：**
```typescript
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Shift+Enter 换行)"
          disabled={disabled}
          className="flex-1 resize-none border rounded-lg p-2"
          rows={1}
        />
        <Button onClick={handleSend} disabled={!input.trim() || disabled}>
          发送
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {input.length} / 1000
      </div>
    </div>
  );
}
```

#### 1.6 QuickActions 组件 (2 小时)

**文件：** `src/components/chat/QuickActions.tsx`

**功能：**
- 显示快捷命令
- 根据上下文生成建议
- 一键执行

**预设快捷命令：**
```typescript
const quickActions = [
  { label: '📊 查看所有球员', action: 'show all players' },
  { label: '🎯 随机分组', action: 'create random grouping' },
  { label: '🏆 最佳阵容', action: 'show best lineup' },
  { label: '📈 能力分析', action: 'analyze player skills' }
];
```

#### 1.7 集成到 Tab 导航 (1 小时)

**修改：** `src/App.tsx`

```typescript
const tabs = [
  { id: 'players', label: '球员管理', icon: '👥' },
  { id: 'chat', label: '智能助手', icon: '🤖' },  // 新增
  { id: 'grouping', label: '分组', icon: '🎯' },
  { id: 'games', label: '比赛记录', icon: '📊' },
];

// 在 render 中添加
{activeTab === 'chat' && <ChatView />}
```

#### 1.8 样式调整 (2 小时)

- [ ] 确保与 shadcn/ui 风格一致
- [ ] 响应式设计测试
- [ ] 深色/浅色主题适配
- [ ] 动画效果

#### 1.9 单元测试 (3 小时)

**测试文件：** `src/__tests__/chat/ChatView.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatView } from '@/components/chat/ChatView';

describe('ChatView', () => {
  it('should render chat input', () => {
    render(<ChatView />);
    expect(screen.getByPlaceholderText(/输入消息/)).toBeInTheDocument();
  });

  it('should send message on Enter', async () => {
    render(<ChatView />);
    const input = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });
});
```

### 交付物
- ✅ 完整的聊天 UI 组件
- ✅ 集成到现有应用
- ✅ 响应式设计
- ✅ 单元测试通过

### 工时估算
- **乐观：** 2 天
- **预期：** 2.5 天
- **悲观：** 3 天

### 风险点
- ⚠️ Markdown 渲染性能问题
- ⚠️ 样式冲突

**应对方案：**
- 使用虚拟滚动优化长列表
- CSS Modules 隔离样式

---

## Phase 2: API 集成 - Vercel Serverless Function (3-4 天)

> **重大变更**: Review Agent 反馈 - 问题 1
> **变更内容**: 从 OpenRouter 改为 Vercel Serverless Function 代理 Gemini API

### 目标
- 实现 Vercel Serverless Function 代理
- 支持流式输出
- 实现超时处理和降级
- 添加 CORS 和速率限制

### 任务清单

#### 2.1 Vercel API Route 实现 (3 小时)

> **新增**: Review Agent 反馈 - 问题 1

**文件：** `api/chat.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

export const config = {
  maxDuration: 10, // Vercel Hobby Plan 限制
};

// 速率限制
const rateLimit = new LRUCache<string, number>({
  max: 500,
  ttl: 60000, // 1 分钟
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS 配置
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

  // 速率限制
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const count = rateLimit.get(ip) || 0;
  if (count >= 10) {
    return res.status(429).json({
      error: 'Too many requests',
      message: '您的请求过于频繁，请 1 分钟后再试'
    });
  }
  rateLimit.set(ip, count + 1);

  // 超时处理
  const TIMEOUT_MS = 9000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      callGeminiAPI(req.body),
      timeoutPromise
    ]);

    res.json(result);
  } catch (error: any) {
    if (error.message === 'Timeout') {
      res.status(408).json({
        error: 'Request timeout',
        suggestion: '请求超时，请尝试简化问题或使用快捷命令'
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

async function callGeminiAPI(body: any) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  return await response.json();
}
```

#### 2.2 前端 API 客户端 (2 小时)

**文件：** `src/lib/chat/api-client.ts`

```typescript
const TIMEOUT_MS = 9000;

export class ChatAPIClient {
  async sendMessage(message: string, history: Message[]): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 408) {
          const data = await response.json();
          return {
            error: 'timeout',
            suggestion: data.suggestion
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          error: 'timeout',
          suggestion: '请求超时，请尝试简化问题或使用快捷命令'
        };
      }
      throw error;
    }
  }
}
```

#### 2.3 超时处理和降级方案 (3 小时)

> **新增**: Review Agent 反馈 - 问题 2

**文件：** `src/lib/chat/fallback-handler.ts`

```typescript
export class FallbackHandler {
  // 超时降级：返回快捷命令提示
  getTimeoutFallback(): ChatMessage {
    return {
      role: 'assistant',
      content: '⚠️ 请求超时，建议使用快捷命令：\n\n' +
        '- 📊 查看所有球员\n' +
        '- 🎯 快速分组\n' +
        '- 📈 查看统计\n\n' +
        '或尝试简化您的问题。'
    };
  }

  // 网络错误降级：使用本地缓存
  async handleNetworkError(query: string): Promise<ChatMessage | null> {
    const cached = localStorage.getItem(`chat_cache_${hashQuery(query)}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  // API 错误降级：切换到备用 AI
  async handleAPIError(query: string): Promise<ChatMessage> {
    // 尝试使用 DeepSeek（如果配置）
    if (process.env.DEEPSEEK_API_KEY) {
      return await this.callDeepSeek(query);
    }

    // 最终降级：仅使用 Function Calling
    return await this.executeFunctionOnly(query);
  }
}
```

#### 2.4 CORS 和速率限制测试 (1 小时)

> **新增**: Review Agent 反馈 - 问题 5

- [ ] 测试 CORS 配置
  - 本地开发环境测试
  - 生产环境测试
  - 跨域请求验证

- [ ] 测试速率限制
  - 单 IP 10 次/分钟限制
  - 超限后的错误响应
  - 恢复后的正常访问

- [ ] 测试错误处理
  - 超时场景
  - 网络错误
  - API 错误

#### 2.5 中国用户访问验证 (2 小时)

> **新增**: Review Agent 反馈 - 问题 3

- [ ] 测试 Vercel 在中国的访问速度
  - 使用 https://www.webpagetest.org/
  - 测试不同地区（北京、上海、广州）
  - 记录平均响应时间

- [ ] 验证 CDN 加速效果（如果使用）
  - 对比有/无 CDN 的速度
  - 测试稳定性

- [ ] 准备降级方案
  - DeepSeek API 集成
  - IP 检测逻辑
  - 自动切换机制

#### 2.6 集成到 ChatView (2 小时)

#### 2.5 集成到 ChatView (2 小时)

> **修正**: 删除了错误的 API Key 使用方式，改为通过后端 API 调用

```typescript
// src/components/chat/ChatView.tsx
import { ChatAPIClient } from '@/lib/chat/api-client';

const apiClient = new ChatAPIClient();

const handleSend = async (content: string) => {
  // 添加用户消息
  const userMessage: ChatMessage = {
    id: uuid(),
    role: 'user',
    content,
    timestamp: Date.now()
  };
  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);

  try {
    // ✅ 正确：通过后端 API 调用，不使用任何前端 API Key
    const response = await apiClient.sendMessage(content, messages);

    if (response.error === 'timeout') {
      // 超时处理：显示降级建议
      setMessages(prev => [...prev, {
        id: uuid(),
        role: 'assistant',
        content: response.suggestion || '请求超时，请尝试简化问题或使用快捷命令',
        timestamp: Date.now()
      }]);
    } else {
      // 流式生成 AI 回复
      let aiContent = '';
      for await (const chunk of response.stream) {
        aiContent += chunk;

        // 更新 UI（流式显示）
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last.role === 'assistant' && last.id === 'streaming') {
            return [...prev.slice(0, -1), { ...last, content: aiContent }];
          } else {
            return [...prev, {
              id: 'streaming',
              role: 'assistant',
              content: aiContent,
              timestamp: Date.now()
            }];
          }
        });
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    toast.error('发送失败，请重试');
  } finally {
    setIsLoading(false);
  }
};
```

#### 2.6 测试和调试 (3 小时)

- [ ] 测试 Gemini 直连
- [ ] 测试 OpenRouter 代理
- [ ] 测试流式输出
- [ ] 测试错误处理
- [ ] 性能测试

### 交付物
- ✅ Vercel Serverless Function 代理
- ✅ CORS 和速率限制配置
- ✅ 超时处理和降级机制
- ✅ 中国用户访问验证

### 工时估算
> **调整**: Review Agent 反馈 - 问题 7
> **说明**: 增加了超时处理、CORS 配置、中国访问验证等任务

- **乐观：** 3 天
- **预期：** 3.5 天
- **悲观：** 4 天

### 风险点
- ⚠️ API 速率限制
- ⚠️ 网络不稳定

**应对方案：**
- 实现智能重试
- 添加请求缓存
- 提供离线降级

---

## Phase 3: Function Calling - Agent 能力 (3-4 天)

### 目标
- 实现 Function Calling 机制
- 集成球员查询和分组功能
- 实现 Agent 编排逻辑

### 任务清单

#### 3.1 Function Schemas 定义 (2 小时)

**文件：** `src/lib/agent/functions.ts`

```typescript
export const agentFunctions: FunctionDefinition[] = [
  {
    name: 'query_players',
    description: '查询球员信息，支持按姓名、位置、能力筛选',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '球员姓名（模糊匹配）' },
        position: { 
          type: 'string', 
          enum: ['guard', 'forward', 'center'],
          description: '球员位置'
        },
        minOverall: { 
          type: 'number', 
          description: '最低总体能力 (1-99)' 
        },
        limit: { 
          type: 'number', 
          description: '返回数量限制，默认 10',
          default: 10
        }
      }
    }
  },
  {
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
        teamCount: { 
          type: 'number', 
          description: '团队数量' 
        },
        strategy: { 
          type: 'string', 
          enum: ['balanced', 'random'],
          default: 'balanced'
        }
      },
      required: ['playerIds', 'teamCount']
    }
  },
  {
    name: 'get_player_stats',
    description: '获取球员详细统计信息',
    parameters: {
      type: 'object',
      properties: {
        playerId: { 
          type: 'string', 
          description: '球员 ID' 
        }
      },
      required: ['playerId']
    }
  },
  {
    name: 'suggest_lineup',
    description: '基于战术需求建议最佳阵容',
    parameters: {
      type: 'object',
      properties: {
        tactic: {
          type: 'string',
          enum: ['offensive', 'defensive', 'balanced'],
          description: '战术类型'
        },
        playerPool: {
          type: 'array',
          items: { type: 'string' },
          description: '可选球员 ID 列表'
        }
      },
      required: ['tactic']
    }
  }
];
```

#### 3.2 FunctionExecutor 实现 (4 小时)

**文件：** `src/lib/agent/executor.ts`

```typescript
export class FunctionExecutor {
  constructor(
    private playerRepository: PlayerRepository,
    private groupingAlgorithm: typeof GroupingAlgorithm
  ) {}

  async execute(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'query_players':
        return await this.queryPlayers(args);
      
      case 'create_grouping':
        return await this.createGrouping(args);
      
      case 'get_player_stats':
        return await this.getPlayerStats(args);
      
      case 'suggest_lineup':
        return await this.suggestLineup(args);
      
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private async queryPlayers(args: QueryPlayersArgs) {
    const { name, position, minOverall, limit = 10 } = args;
    let players = await this.playerRepository.findAll();
    
    if (name) {
      players = players.filter(p => 
        p.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    
    if (position) {
      players = players.filter(p => p.position === position);
    }
    
    if (minOverall) {
      players = players.filter(p => p.skills.overall >= minOverall);
    }
    
    return {
      count: players.length,
      players: players.slice(0, limit).map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        overall: p.skills.overall
      }))
    };
  }

  private async createGrouping(args: CreateGroupingArgs) {
    const { playerIds, teamCount, strategy = 'balanced' } = args;
    const players = await this.playerRepository.findByIds(playerIds);
    
    if (players.length < teamCount) {
      throw new Error(`需要至少 ${teamCount} 名球员`);
    }
    
    const teams = this.groupingAlgorithm.groupPlayers(players, {
      teamCount,
      strategy
    });
    
    return {
      teams: teams.map(t => ({
        name: t.name,
        totalSkill: t.totalSkill,
        players: t.players.map(p => ({
          id: p.id,
          name: p.name,
          overall: p.skills.overall
        }))
      })),
      balance: this.groupingAlgorithm.calculateBalance(teams),
      timestamp: new Date().toISOString()
    };
  }

  private async getPlayerStats(args: GetPlayerStatsArgs) {
    const player = await this.playerRepository.findById(args.playerId);
    if (!player) {
      throw new Error('球员不存在');
    }
    
    return {
      name: player.name,
      position: player.position,
      skills: player.skills,
      gamesPlayed: player.gamesPlayed || 0,
      winRate: player.winRate || 0
    };
  }

  private async suggestLineup(args: SuggestLineupArgs) {
    const { tactic, playerPool } = args;
    const players = playerPool 
      ? await this.playerRepository.findByIds(playerPool)
      : await this.playerRepository.findAll();
    
    // 基于战术选择最佳球员
    const lineup = this.selectBestLineup(players, tactic);
    
    return {
      tactic,
      lineup: lineup.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        reason: this.getSelectionReason(p, tactic)
      }))
    };
  }
}
```

#### 3.3 ChatAgent 编排逻辑 (4 小时)

**文件：** `src/lib/agent/chat-agent.ts`

```typescript
export class ChatAgent {
  private aiProvider: AIProvider;
  private executor: FunctionExecutor;

  async *processMessage(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): AsyncGenerator<AgentEvent> {
    // 构建消息历史
    const messages = this.buildMessages(conversationHistory, userMessage);

    // 第一轮：询问 AI 是否需要调用函数
    yield { type: 'thinking', message: '正在思考...' };

    const response = await this.aiProvider.chatWithFunctions(
      messages,
      agentFunctions
    );

    // 检查是否需要调用函数
    if (response.functionCall) {
      yield {
        type: 'function_call',
        name: response.functionCall.name,
        args: response.functionCall.args
      };

      // 执行函数
      try {
        const result = await this.executor.execute(
          response.functionCall.name,
          response.functionCall.args
        );

        yield { type: 'function_result', result };

        // 第二轮：将函数结果反馈给 AI，生成最终回复
        messages.push(
          { role: 'assistant', content: null, functionCall: response.functionCall },
          { role: 'function', name: response.functionCall.name, content: JSON.stringify(result) }
        );

        // 流式生成最终回复
        for await (const chunk of this.aiProvider.streamChat(messages)) {
          yield { type: 'content', text: chunk };
        }
      } catch (error: any) {
        yield {
          type: 'error',
          message: `函数执行失败: ${error.message}`
        };
      }
    } else {
      // 没有函数调用，直接流式输出
      for await (const chunk of this.aiProvider.streamChat(messages)) {
        yield { type: 'content', text: chunk };
      }
    }
  }

  private buildMessages(history: ChatMessage[], newMessage: string): Message[] {
    const messages: Message[] = [
      {
        role: 'system',
        content: `你是一个篮球助手，帮助用户管理球员和分组。

可用的功能：
- query_players: 查询球员信息
- create_grouping: 创建分组
- get_player_stats: 获取球员统计
- suggest_lineup: 建议最佳阵容

当用户需要这些功能时，调用相应的函数。否则直接回答。`
      }
    ];

    // 添加历史消息（最近 10 条）
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      } else if (msg.role === 'function') {
        messages.push({
          role: 'function',
          name: msg.functionCall!.name,
          content: JSON.stringify(msg.functionResult)
        });
      }
    }

    // 添加新消息
    messages.push({ role: 'user', content: newMessage });

    return messages;
  }
}
```

#### 3.4 集成到 ChatView (3 小时)

```typescript
// src/components/chat/ChatView.tsx
const agent = new ChatAgent(
  new AIProvider(),
  new FunctionExecutor(playerRepository, GroupingAlgorithm)
);

const handleSend = async (content: string) => {
  const userMessage: ChatMessage = {
    id: uuid(),
    role: 'user',
    content,
    timestamp: Date.now()
  };
  
  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);

  try {
    let aiMessage: ChatMessage = {
      id: uuid(),
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    for await (const event of agent.processMessage(content, messages)) {
      switch (event.type) {
        case 'thinking':
          aiMessage.content += `\n\n🤔 ${event.message}`;
          break;
        
        case 'function_call':
          aiMessage.content += `\n\n🔧 正在执行: ${event.name}...`;
          break;
        
        case 'function_result':
          // 可选：显示函数结果
          break;
        
        case 'content':
          aiMessage.content += event.text;
          break;
        
        case 'error':
          aiMessage.content += `\n\n❌ ${event.message}`;
          break;
      }

      // 更新消息
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === aiMessage.id);
        if (idx === -1) {
          return [...prev, aiMessage];
        } else {
          return [...prev.slice(0, idx), aiMessage, ...prev.slice(idx + 1)];
        }
      });
    }
  } catch (error) {
    console.error('Agent error:', error);
    toast.error('处理失败，请重试');
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.5 测试用例 (3 小时)

**文件：** `src/__tests__/agent/chat-agent.test.ts`

```typescript
describe('ChatAgent', () => {
  it('should query players when asked', async () => {
    const agent = new ChatAgent(mockAIProvider, mockExecutor);
    const events = [];

    for await (const event of agent.processMessage('Show me all guards', [])) {
      events.push(event);
    }

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'function_call',
        name: 'query_players'
      })
    );
  });

  it('should handle grouping request', async () => {
    const agent = new ChatAgent(mockAIProvider, mockExecutor);
    const events = [];

    for await (const event of agent.processMessage(
      'Create 2 teams from all players',
      []
    )) {
      events.push(event);
    }

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'function_call',
        name: 'create_grouping'
      })
    );
  });

  it('should answer general questions without function call', async () => {
    const agent = new ChatAgent(mockAIProvider, mockExecutor);
    const events = [];

    for await (const event of agent.processMessage(
      'What is basketball?',
      []
    )) {
      events.push(event);
    }

    expect(events.some(e => e.type === 'content')).toBe(true);
    expect(events.some(e => e.type === 'function_call')).toBe(false);
  });
});
```

### 交付物
- ✅ Function Calling 完整实现
- ✅ Agent 编排逻辑
- ✅ 集成到 ChatView
- ✅ 测试用例通过

### 工时估算
- **乐观：** 3 天
- **预期：** 3.5 天
- **悲观：** 4 天

### 风险点
- ⚠️ Function Calling 准确性
- ⚠️ 函数执行超时

**应对方案：**
- 优化 Function 描述
- 添加超时处理
- 提供用户反馈

---

## Phase 4: 联网搜索集成 (2-3 天)

### 目标
- 验证 Brave Search 在中国的可用性
- 集成 Brave Search API（或备选方案）
- 实现 Web Search Function
- 优化搜索结果展示

### 任务清单

#### 4.1 Brave Search 可用性验证 (1 小时)

> **新增**: Review Agent 反馈 - 问题 6

- [ ] 测试 Brave Search 在中国的访问
  - 使用中国 IP 测试 API 调用
  - 测试不同时段的稳定性
  - 记录成功率和延迟

- [ ] 测试脚本
  ```bash
  # 使用中国 IP 测试（通过代理）
  curl -X GET "https://api.search.brave.com/res/v1/web/search?q=NBA&count=5" \
    -H "X-Subscription-Token: YOUR_API_KEY"
  ```

- [ ] 如果不可用，准备备选方案
  - Bing Web Search API
  - SerpAPI
  - 本地知识库降级

#### 4.2 BraveSearchClient 实现 (2 小时)

**文件：** `src/lib/search/brave-search.ts`

```typescript
export class BraveSearchClient {
  private apiKey: string;
  private endpoint = 'https://api.search.brave.com/res/v1/web/search';

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { count = 5, searchLang = 'zh-hans' } = options;

    const response = await fetch(
      `${this.endpoint}?q=${encodeURIComponent(query)}&count=${count}&search_lang=${searchLang}`,
      {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    return data.web.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      published: r.published
    }));
  }
}
```

#### 4.2 添加 Web Search Function (1 小时)

**更新：** `src/lib/agent/functions.ts`

```typescript
{
  name: 'web_search',
  description: '联网搜索篮球相关信息（NBA 新闻、球员数据、战术分析等）',
  parameters: {
    type: 'object',
    properties: {
      query: { 
        type: 'string', 
        description: '搜索关键词' 
      },
      count: { 
        type: 'number', 
        description: '返回结果数量，默认 5',
        default: 5
      }
    },
    required: ['query']
  }
}
```

#### 4.3 实现搜索执行器 (2 小时)

**更新：** `src/lib/agent/executor.ts`

```typescript
export class FunctionExecutor {
  private searchClient: BraveSearchClient;

  async execute(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      // ... 现有函数
      
      case 'web_search':
        return await this.webSearch(args);
      
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private async webSearch(args: WebSearchArgs) {
    const { query, count = 5 } = args;
    
    try {
      const results = await this.searchClient.search(query, { count });
      
      return {
        query,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
          published: r.published
        }))
      };
    } catch (error: any) {
      throw new Error(`搜索失败: ${error.message}`);
    }
  }
}
```

#### 4.4 搜索结果展示优化 (3 小时)

**文件：** `src/components/chat/SearchResultDisplay.tsx`

```typescript
export function SearchResultDisplay({ results }: { results: SearchResult[] }) {
  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SearchIcon className="h-4 w-4" />
        <span>找到 {results.length} 个相关结果</span>
      </div>
      
      {results.map((result, idx) => (
        <Card key={idx} className="p-3">
          <a 
            href={result.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            {result.title}
          </a>
          <p className="text-sm text-muted-foreground mt-1">
            {result.snippet}
          </p>
          {result.published && (
            <p className="text-xs text-muted-foreground mt-1">
              📅 {formatDate(result.published)}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
```

#### 4.5 缓存和限流 (2 小时)

**文件：** `src/lib/search/cache.ts`

```typescript
export class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 3600000; // 1 hour

  get(query: string): SearchResult[] | null {
    const entry = this.cache.get(query);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(query);
      return null;
    }

    return entry.results;
  }

  set(query: string, results: SearchResult[]): void {
    this.cache.set(query, {
      results,
      timestamp: Date.now()
    });
  }
}

// 使用缓存
const searchCache = new SearchCache();

async function cachedSearch(query: string): Promise<SearchResult[]> {
  const cached = searchCache.get(query);
  if (cached) return cached;

  const results = await braveSearch.search(query);
  searchCache.set(query, results);
  return results;
}
```

#### 4.6 测试 (2 小时)

- [ ] 测试搜索功能
- [ ] 测试缓存机制
- [ ] 测试错误处理
- [ ] 测试结果展示

### 交付物
- ✅ Web Search Function
- ✅ 搜索结果展示
- ✅ 缓存机制
- ✅ 测试通过

### 工时估算
- **乐观：** 2 天
- **预期：** 2.5 天
- **悲观：** 3 天

---

## Phase 5: 优化和测试 (2-3 天)

### 目标
- 性能优化
- 用户体验优化
- 全面测试

### 任务清单

#### 5.1 性能优化 (3 小时)

- [ ] 实现虚拟滚动（react-window）
- [ ] 懒加载历史消息
- [ ] 优化 Markdown 渲染
- [ ] 防抖用户输入

#### 5.2 用户体验优化 (4 小时)

- [ ] 添加快捷键（Cmd/Ctrl + K 打开聊天）
- [ ] 输入自动补全
- [ ] 消息复制按钮
- [ ] 消息重新生成
- [ ] 语音输入（可选）

#### 5.3 无障碍优化 (2 小时)

- [ ] ARIA 标签
- [ ] 键盘导航
- [ ] 屏幕阅读器支持

#### 5.4 单元测试 (3 小时)

- [ ] ChatView 组件测试
- [ ] ChatAgent 测试
- [ ] FunctionExecutor 测试
- [ ] 覆盖率 > 80%

#### 5.5 集成测试 (3 小时)

- [ ] 端到端测试（Playwright）
- [ ] API 集成测试
- [ ] Function Calling 流程测试

#### 5.6 文档编写 (2 小时)

- [ ] 用户使用指南
- [ ] 开发者文档
- [ ] API 文档

### 交付物
- ✅ 性能优化完成
- ✅ 测试覆盖率 > 80%
- ✅ 文档齐全

---

## Phase 6: 部署和监控 (1-2 天)

### 目标
- 生产环境部署
- 监控和告警
- 用户反馈收集

### 任务清单

#### 6.1 部署准备 (2 小时)

- [ ] 环境变量配置
- [ ] 生产构建
- [ ] CDN 配置
- [ ] HTTPS 配置

#### 6.2 监控设置 (2 小时)

- [ ] API 调用量监控
- [ ] 错误率监控
- [ ] 性能监控
- [ ] 成本告警

#### 6.3 用户反馈 (2 小时)

- [ ] 添加反馈按钮
- [ ] 收集用户建议
- [ ] 分析使用数据

#### 6.4 上线检查 (1 小时)

- [ ] 功能验证
- [ ] 性能测试
- [ ] 安全检查
- [ ] 文档发布

### 交付物
- ✅ 生产环境部署
- ✅ 监控告警配置
- ✅ 用户反馈机制

---

## 风险点和应对方案

### 风险矩阵

| 风险 | 概率 | 影响 | 应对方案 |
|------|------|------|----------|
| API 速率限制 | 高 | 中 | 实现缓存、降级策略 |
| 网络不稳定 | 中 | 高 | 重试机制、离线模式 |
| Function Calling 不准确 | 中 | 中 | 优化描述、人工反馈 |
| 成本超支 | 低 | 高 | 监控、限流、降级 |
| 用户体验不佳 | 中 | 中 | 用户测试、快速迭代 |

### 降级策略

```typescript
// 完整降级链路
const strategies = [
  { level: 0, name: 'Full AI + Functions', cost: '$$$' },
  { level: 1, name: 'Cheaper AI + Functions', cost: '$$' },
  { level: 2, name: 'No AI, Functions Only', cost: '$' },
  { level: 3, name: 'Offline Mode', cost: '$0' }
];

function selectStrategy(usage: UsageMetrics): Strategy {
  if (usage.monthlyCost > BUDGET_LIMIT) {
    return strategies[2]; // Functions only
  }
  if (!navigator.onLine) {
    return strategies[3]; // Offline
  }
  if (usage.dailyCalls > RATE_LIMIT * 0.8) {
    return strategies[1]; // Cheaper model
  }
  return strategies[0]; // Full
}
```

## 注意事项

### 1. 时间管理
- 每日站会同步进度
- 及时识别阻塞
- 灵活调整计划

### 2. 质量保证
- 每个 Phase 完成后进行 demo
- 持续集成测试
- 代码审查

### 3. 成本控制
- 每周监控 API 使用量
- 设置预算告警
- 优化请求频率

### 4. 用户反馈
- 早期用户测试
- 快速迭代
- 数据驱动决策

## 里程碑

- **Week 1**: Phase 0-1 完成，基础 UI 可用
- **Week 2**: Phase 2-3 完成，AI 对话 + Function Calling
- **Week 3**: Phase 4-6 完成，全功能 + 优化 + 部署

## 下一步

开始执行 **Phase 0: 准备工作**

1. 申请所有必要的 API Keys
2. 配置开发环境
3. 创建项目结构
4. 准备开发！
