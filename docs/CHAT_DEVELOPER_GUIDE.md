# 智能助手开发者文档

## 架构概览

```
src/
├── components/
│   ├── ChatView.tsx              # 主聊天视图
│   ├── ChatInput.tsx             # 输入组件
│   ├── ChatMessage.tsx           # 消息组件
│   ├── MessageList.tsx           # 普通消息列表
│   ├── MessageListVirtualized.tsx # 虚拟滚动消息列表
│   └── MarkdownRenderer.tsx      # Markdown 渲染器
├── hooks/
│   ├── useDebounce.ts            # 防抖 Hook
│   └── useKeyboardShortcut.ts    # 快捷键 Hook
├── lib/
│   └── accessibility.ts          # 无障碍工具
├── services/
│   └── chat-service.ts           # 聊天服务
└── types/
    └── chat.ts                   # 类型定义
```

## 核心组件

### 1. ChatView

主聊天视图组件，负责：
- 管理消息状态
- 处理发送/接收消息
- 快捷键监听
- 条件性渲染（普通 vs 虚拟滚动）

```typescript
interface ChatViewProps {
  // 暂无 props，内部管理状态
}

// 使用示例
<ChatView />
```

**关键功能：**
- 少于 50 条消息：使用 `MessageList`（普通渲染）
- 超过 50 条消息：使用 `MessageListVirtualized`（虚拟滚动）

### 2. ChatInput

输入组件，支持：
- 防抖输入
- 自动补全
- 快捷键
- 字符计数

```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  enableAutocomplete?: boolean;
  quickCommands?: string[];
}
```

**防抖策略：**
- 输入值防抖：300ms
- 自动补全过滤：基于防抖值

### 3. MessageListVirtualized

虚拟滚动消息列表，使用 `react-window`：
- 自动滚动到底部
- 懒加载历史消息（预留接口）
- 固定高度项渲染

```typescript
interface MessageListVirtualizedProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;      // 懒加载回调
  hasMore?: boolean;             // 是否有更多历史消息
  onRegenerate?: (messageId: string) => void;
}
```

**性能优化：**
- 使用 `memo` 包裹 `MessageItem`
- 自定义比较函数避免不必要渲染
- 懒加载支持（滚动到顶部触发）

### 4. MarkdownRenderer

优化的 Markdown 渲染器：
- GFM 支持
- 代码高亮
- 组件缓存

```typescript
interface MarkdownRendererProps {
  content: string;
  className?: string;
}
```

**优化策略：**
- `memo` 包裹
- 自定义比较函数
- 组件缓存（基于内容前 100 字符）

## 自定义 Hooks

### useDebounce

防抖值 Hook：

```typescript
function useDebounce<T>(value: T, delay: number): T

// 使用示例
const debouncedInput = useDebounce(input, 300);
```

### useDebouncedCallback

防抖函数 Hook：

```typescript
function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void
```

### useKeyboardShortcut

快捷键 Hook：

```typescript
interface KeyboardShortcutOptions {
  key: string;
  metaKey?: boolean;     // Cmd/Ctrl
  ctrlKey?: boolean;
  handler: () => void;
  enabled?: boolean;
}

function useKeyboardShortcut(options: KeyboardShortcutOptions): void
```

## 性能优化详解

### 1. 虚拟滚动

**何时启用：**
- 消息数量 > 50 条

**实现细节：**
```typescript
// ChatView.tsx
{messages.length < 50 ? (
  <MessageList ... />          // 普通渲染
) : (
  <MessageListVirtualized ... /> // 虚拟滚动
)}
```

**配置：**
- 列表高度：动态计算（容器高度）
- 项高度：固定 120px（可优化为动态）
- 缓冲区：react-window 默认

### 2. Markdown 渲染优化

**优化点：**
1. **memo 包裹**：避免相同内容重复渲染
2. **自定义比较**：基于 content 和 className
3. **插件配置**：
   - `remark-gfm`：GFM 支持
   - `rehype-highlight`：代码高亮

**性能对比：**
- 优化前：每次父组件更新都重新渲染
- 优化后：仅内容变化时渲染

### 3. 防抖策略

**应用场景：**
| 场景 | 延迟 | 目的 |
|------|------|------|
| 输入值 | 300ms | 减少状态更新 |
| 自动补全 | 300ms | 减少过滤计算 |
| 搜索查询 | 500ms | 减少 API 调用 |

## 无障碍优化

### ARIA 标签

```typescript
// 消息列表
<div role="log" aria-label="聊天消息列表" aria-live="polite">

// 消息项
<div role="article" aria-label="用户消息">

// 输入框
<textarea aria-label="消息输入框" aria-autocomplete="list">

// 自动补全
<div role="listbox" aria-label="自动补全建议">
  <button role="option" aria-selected={true}>
```

### 键盘导航

**Tab 顺序：**
1. 输入框
2. 自动补全列表（如果有）
3. 发送按钮

**快捷键：**
- `Tab`：焦点移动
- `Enter`：发送/选择
- `Esc`：取消/关闭

### 屏幕阅读器

```typescript
// 实时公告
screenReader.announce('正在处理您的消息...', 'polite');
screenReader.announce('错误：网络错误', 'assertive');
```

## 测试策略

### 单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test ChatView

# 覆盖率报告
npm run test:coverage
```

**测试重点：**
- 组件渲染
- 用户交互
- 快捷键
- 消息发送/接收
- 错误处理

### 集成测试

**测试场景：**
1. 完整对话流程
2. 虚拟滚动切换
3. 快捷键触发
4. 无障碍访问

## 最佳实践

### 1. 性能优化

```typescript
// ✅ 好：使用 memo
const MessageItem = memo(({ msg }) => {
  return <div>{msg.content}</div>;
});

// ❌ 差：每次都重新渲染
const MessageItem = ({ msg }) => {
  return <div>{msg.content}</div>;
};
```

### 2. 防抖使用

```typescript
// ✅ 好：使用防抖 Hook
const debouncedValue = useDebounce(input, 300);

// ❌ 差：直接使用原始值
useEffect(() => {
  // 每次 input 变化都执行
}, [input]);
```

### 3. 条件渲染

```typescript
// ✅ 好：条件性使用虚拟滚动
{messages.length > 50 ? (
  <MessageListVirtualized />
) : (
  <MessageList />
)}

// ❌ 差：总是使用虚拟滚动
<MessageListVirtualized messages={messages} />
```

## 故障排查

### 问题 1：虚拟滚动不流畅

**可能原因：**
- 项高度计算不准确
- 大量 DOM 操作

**解决方案：**
```typescript
// 使用动态高度
const getItemSize = (index: number) => {
  const msg = messages[index];
  return calculateMessageHeight(msg);
};
```

### 问题 2：Markdown 渲染慢

**可能原因：**
- 大量代码块
- 未使用 memo

**解决方案：**
```typescript
// 使用 memo 和缓存
const MarkdownRenderer = memo(({ content }) => {
  // ...
}, (prev, next) => prev.content === next.content);
```

### 问题 3：快捷键冲突

**可能原因：**
- 全局快捷键被其他组件拦截

**解决方案：**
```typescript
// 检查 enabled 状态
useKeyboardShortcut({
  key: 'k',
  metaKey: true,
  handler: () => {},
  enabled: !isLoading && isFocused,
});
```

## 未来优化

### 计划中
1. **懒加载历史消息**
   - 从 IndexedDB 加载
   - 分页查询

2. **消息持久化**
   - 本地存储
   - 云同步

3. **更多快捷键**
   - `Cmd/Ctrl + L`：清空对话
   - `Cmd/Ctrl + S`：保存对话

4. **动态高度计算**
   - 根据消息内容计算高度
   - 优化虚拟滚动性能

---

如有问题或建议，请联系开发团队。
