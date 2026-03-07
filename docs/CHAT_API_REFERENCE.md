# 智能助手 API 文档

## 目录

- [组件 API](#组件-api)
- [Hooks API](#hooks-api)
- [服务 API](#服务-api)
- [类型定义](#类型定义)

---

## 组件 API

### ChatView

主聊天视图组件。

```typescript
import { ChatView } from '@/components/ChatView';

// 使用示例
<ChatView />
```

**Props:** 无

**状态管理:**
- `messages: ChatMessage[]` - 消息列表
- `isLoading: boolean` - 加载状态
- `error: string | null` - 错误信息

---

### ChatInput

输入组件。

```typescript
import { ChatInput } from '@/components/ChatInput';

interface ChatInputProps {
  onSend: (message: string) => void;    // 发送回调
  disabled?: boolean;                    // 禁用状态
  placeholder?: string;                  // 占位符
  maxLength?: number;                    // 最大长度
  enableAutocomplete?: boolean;          // 启用自动补全
  quickCommands?: string[];              // 快捷命令列表
}

// 使用示例
<ChatInput
  onSend={handleSend}
  disabled={isLoading}
  maxLength={1000}
  enableAutocomplete={true}
/>
```

**默认 Props:**
```typescript
{
  placeholder: '输入消息... (Shift+Enter 换行)',
  maxLength: 1000,
  enableAutocomplete: true,
  quickCommands: [
    '查看所有球员',
    '随机分组',
    '最佳阵容',
    '能力分析',
    '搜索球员',
    '查看统计',
  ]
}
```

---

### ChatMessage

单个消息组件。

```typescript
import { ChatMessage } from '@/components/ChatMessage';

interface ChatMessageProps {
  message: ChatMessage;          // 消息对象
  onRegenerate?: () => void;     // 重新生成回调
  isLast?: boolean;              // 是否为最后一条消息
}

// 使用示例
<ChatMessage
  message={msg}
  onRegenerate={handleRegenerate}
  isLast={index === messages.length - 1}
/>
```

---

### MessageListVirtualized

虚拟滚动消息列表。

```typescript
import { MessageListVirtualized } from '@/components/MessageListVirtualized';

interface MessageListVirtualizedProps {
  messages: ChatMessage[];               // 消息列表
  isLoading?: boolean;                    // 加载状态
  error?: string | null;                  // 错误信息
  onLoadMore?: () => void;               // 加载更多回调
  hasMore?: boolean;                      // 是否有更多历史
  onRegenerate?: (messageId: string) => void; // 重新生成回调
}

// 使用示例
<MessageListVirtualized
  messages={messages}
  isLoading={isLoading}
  error={error}
  onLoadMore={handleLoadMore}
  hasMore={hasMoreHistory}
  onRegenerate={handleRegenerate}
/>
```

**性能特性:**
- 使用 `react-window` 实现
- 自动滚动到底部
- 支持 memo 优化

---

### MarkdownRenderer

Markdown 渲染组件。

```typescript
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface MarkdownRendererProps {
  content: string;       // Markdown 内容
  className?: string;    // 样式类名
}

// 使用示例
<MarkdownRenderer
  content={message.content}
  className="prose prose-sm"
/>
```

**支持特性:**
- GFM (GitHub Flavored Markdown)
- 代码高亮
- 自定义组件
- memo 优化

---

## Hooks API

### useDebounce

防抖值 Hook。

```typescript
import { useDebounce } from '@/hooks/useDebounce';

function useDebounce<T>(value: T, delay: number): T

// 使用示例
const [input, setInput] = useState('');
const debouncedInput = useDebounce(input, 300);

useEffect(() => {
  // 仅在防抖值变化时执行
  searchAPI(debouncedInput);
}, [debouncedInput]);
```

**参数:**
- `value: T` - 需要防抖的值
- `delay: number` - 延迟时间（毫秒）

**返回:**
- `T` - 防抖后的值

---

### useDebouncedCallback

防抖函数 Hook。

```typescript
import { useDebouncedCallback } from '@/hooks/useDebounce';

function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void

// 使用示例
const handleSearch = useDebouncedCallback((query: string) => {
  searchAPI(query);
}, 500);

// 调用（自动防抖）
handleSearch('test');
```

**参数:**
- `fn: T` - 需要防抖的函数
- `delay: number` - 延迟时间（毫秒）

**返回:**
- `(...args: Parameters<T>) => void` - 防抖后的函数

---

### useDebouncedSearch

防抖搜索 Hook。

```typescript
import { useDebouncedSearch } from '@/hooks/useDebounce';

function useDebouncedSearch(
  initialQuery?: string,
  delay?: number
): [string, (query: string) => void, string]

// 使用示例
const [query, setQuery, debouncedQuery] = useDebouncedSearch('', 300);

// query: 原始输入值
// setQuery: 更新函数
// debouncedQuery: 防抖后的值
```

**参数:**
- `initialQuery?: string` - 初始搜索词（默认 ''）
- `delay?: number` - 延迟时间（默认 300ms）

**返回:**
- `[string, (query: string) => void, string]` - [原始值, 设置函数, 防抖值]

---

### useKeyboardShortcut

快捷键 Hook。

```typescript
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

interface KeyboardShortcutOptions {
  key: string;              // 按键
  metaKey?: boolean;        // Cmd/Ctrl
  ctrlKey?: boolean;        // Ctrl
  shiftKey?: boolean;       // Shift
  altKey?: boolean;         // Alt
  handler: () => void;      // 回调函数
  enabled?: boolean;        // 是否启用
}

function useKeyboardShortcut(options: KeyboardShortcutOptions): void

// 使用示例
useKeyboardShortcut({
  key: 'k',
  metaKey: true,
  handler: () => {
    inputRef.current?.focus();
  },
  enabled: !isLoading,
});
```

---

## 服务 API

### chatService

聊天服务。

```typescript
import { chatService } from '@/services/chat-service';

class ChatService {
  // 发送消息
  async sendMessage(content: string): Promise<string | ChatResponse>;
  
  // 清空历史
  clearHistory(): void;
  
  // 获取历史
  getHistory(): ChatMessage[];
}

// 使用示例
const response = await chatService.sendMessage('Hello');
chatService.clearHistory();
```

**方法:**

#### sendMessage

发送消息到 AI。

```typescript
async sendMessage(content: string): Promise<string | ChatResponse>

interface ChatResponse {
  message: string;
  searchResults?: {
    query: string;
    results: SearchResult[];
  };
}
```

**参数:**
- `content: string` - 消息内容

**返回:**
- `Promise<string | ChatResponse>` - AI 响应

**错误:**
- `ChatError` - 网络错误、API 错误等

---

#### clearHistory

清空对话历史。

```typescript
clearHistory(): void
```

---

#### getHistory

获取对话历史。

```typescript
getHistory(): ChatMessage[]
```

---

### screenReader

屏幕阅读器工具。

```typescript
import { screenReader } from '@/lib/accessibility';

const screenReader = {
  // 创建公告器
  createAnnouncer(): void;
  
  // 销毁公告器
  destroy(): void;
  
  // 发送公告
  announce(message: string, priority?: 'polite' | 'assertive'): void;
};

// 使用示例
screenReader.createAnnouncer();
screenReader.announce('消息已发送', 'polite');
screenReader.destroy();
```

---

## 类型定义

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  searchResults?: {
    query: string;
    results: SearchResult[];
  };
}
```

---

### ChatSession

```typescript
interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

### ToolCall

```typescript
interface ToolCall {
  name: string;
  args: Record<string, any>;
  status: 'calling' | 'success' | 'error';
  result?: any;
  error?: string;
}
```

---

### ChatError

```typescript
interface ChatError extends Error {
  code: string;
  retryable: boolean;
  originalError?: Error;
}
```

**错误代码:**
- `NETWORK_ERROR` - 网络错误
- `API_ERROR` - API 错误
- `AUTH_ERROR` - 认证错误
- `RATE_LIMIT` - 速率限制

---

## 快捷键常量

```typescript
export const SHORTCUTS = {
  OPEN_CHAT: {
    key: 'k',
    description: '打开聊天窗口',
    metaKey: true,
  },
  FOCUS_INPUT: {
    key: '/',
    description: '聚焦输入框',
  },
  SEND_MESSAGE: {
    key: 'Enter',
    description: '发送消息',
  },
  NEW_LINE: {
    key: 'Enter',
    shiftKey: true,
    description: '换行',
  },
} as const;
```

---

## 事件

### onSend

发送消息事件。

```typescript
interface SendEvent {
  content: string;
  timestamp: Date;
}

onSend={(message: string) => {
  console.log('发送消息:', message);
}}
```

---

### onRegenerate

重新生成事件。

```typescript
onRegenerate={(messageId: string) => {
  console.log('重新生成消息:', messageId);
}}
```

---

### onLoadMore

加载更多事件。

```typescript
onLoadMore={() => {
  console.log('加载更多历史消息');
  loadHistory();
}}
```

---

## 配置

### 默认配置

```typescript
const CHAT_CONFIG = {
  // 消息相关
  MAX_MESSAGE_LENGTH: 1000,
  VIRTUAL_SCROLL_THRESHOLD: 50,
  MESSAGE_HEIGHT: 120,
  
  // 防抖延迟
  INPUT_DEBOUNCE: 300,
  AUTOCOMPLETE_DEBOUNCE: 300,
  
  // 自动补全
  ENABLE_AUTOCOMPLETE: true,
  
  // 无障碍
  ANNOUNCER_PRIORITY: 'polite' as const,
};
```

---

## 示例

### 完整聊天集成

```typescript
import { ChatView } from '@/components/ChatView';

function App() {
  return (
    <div className="app">
      <h1>球员分组工具</h1>
      <ChatView />
    </div>
  );
}
```

### 自定义输入组件

```typescript
<ChatInput
  onSend={handleSend}
  disabled={isLoading}
  maxLength={500}
  placeholder="输入消息..."
  enableAutocomplete={false}
/>
```

### 虚拟滚动列表

```typescript
<MessageListVirtualized
  messages={messages}
  isLoading={isLoading}
  error={error}
  onLoadMore={loadMoreHistory}
  hasMore={hasMoreMessages}
  onRegenerate={regenerateMessage}
/>
```

---

如有问题或建议，请联系开发团队。
