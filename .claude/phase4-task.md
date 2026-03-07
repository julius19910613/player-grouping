# Phase 4: 联网搜索集成 - 剩余任务

## 当前状态

已完成：
- ✅ BraveSearchClient 实现 (`src/lib/brave-search.ts`)
- ✅ 工具定义 (`src/lib/tools/index.ts` - 定义了 `search_web` 工具)
- ✅ 执行器 (`src/lib/tools/executor.ts` - 实现了 `searchWeb` 方法)
- ✅ 基础工具调用组件 (`src/components/chat/ToolCallMessage.tsx`)

## 待完成任务

### 1. 创建 SearchResultDisplay 组件

**文件：** `src/components/chat/SearchResultDisplay.tsx`

**要求：**
- 美观地展示搜索结果
- 与现有 UI 风格一致（参考其他组件）
- 支持点击跳转
- 处理空结果情况
- 显示搜索关键词和结果数量

**接口：**
```typescript
interface SearchResultDisplayProps {
  results: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  query: string;
}
```

### 2. 扩展 ChatMessage 类型

**文件：** `src/types/chat.ts`

**要求：**
添加工具调用相关字段：
```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // 新增字段
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
    status: 'calling' | 'success' | 'error';
    result?: any;
    error?: string;
  }>;
}
```

### 3. 更新 MessageList 组件

**文件：** `src/components/MessageList.tsx`

**要求：**
- 显示工具调用信息（使用 `ToolCallMessage` 组件）
- 对于 `search_web` 工具，使用新的 `SearchResultDisplay` 组件美化展示
- 保持现有布局和样式

### 4. 更新 ChatView 组件（可选）

**文件：** `src/components/ChatView.tsx`

**要求：**
- 如果需要，更新消息处理逻辑以支持工具调用

## 设计参考

### UI 风格
- 使用 shadcn/ui 组件库
- 参考 `PlayerCard.tsx`, `GroupingResultDisplay.tsx` 的样式
- 使用 `lucide-react` 图标库

### 现有组件
- `ToolCallMessage` - 显示工具调用状态
- `ChatInput` - 输入框
- `MessageList` - 消息列表

## 注意事项

1. **TypeScript 类型完整** - 确保所有类型定义完整
2. **错误处理** - 搜索失败时显示友好提示
3. **空状态** - 无结果时显示友好消息
4. **响应式设计** - 移动端友好
5. **代码风格** - 与现有代码保持一致

## 验收标准

- [ ] SearchResultDisplay 组件创建完成
- [ ] ChatMessage 类型扩展完成
- [ ] MessageList 组件更新完成
- [ ] 搜索结果正确展示
- [ ] UI 美观且一致
- [ ] 无 TypeScript 错误
- [ ] 无 lint 错误
