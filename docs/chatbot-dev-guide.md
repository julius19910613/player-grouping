# 聊天助手 - 开发者文档

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                   前端应用 (React)                    │
├─────────────────────────────────────────────────────┤
│  ChatView (UI)                                      │
│    ├── MessageList (消息列表，支持虚拟滚动)          │
│    ├── ChatMessage (消息渲染，支持 Markdown)         │
│    └── ChatInput (输入框，支持防抖、自动补全)         │
├─────────────────────────────────────────────────────┤
│  ChatService (业务逻辑)                              │
│    ├── 消息管理                                      │
│    ├── 历史记录                                      │
│    └── 错误处理                                      │
├─────────────────────────────────────────────────────┤
│  API Layer (Vercel Serverless Function)             │
│    ├── /api/chat (聊天 API)                          │
│    ├── Function Calling (工具调用)                   │
│    └── Brave Search (联网搜索)                       │
├─────────────────────────────────────────────────────┤
│  AI Provider (Gemini)                               │
│    ├── 自然语言理解                                  │
│    ├── 工具选择                                      │
│    └── 响应生成                                      │
└─────────────────────────────────────────────────────┘
```

## 核心模块

### 1. ChatView 组件

**位置：** `src/components/ChatView.tsx`

**职责：**
- 管理聊天状态（消息列表、加载状态、错误）
- 处理用户输入和消息发送
- 集成快捷键和无障碍功能

**主要方法：**
```typescript
// 发送消息
handleSend(content: string): Promise<void>

// 重新生成最后一条 AI 消息
handleRegenerate(): void

// 清空对话
handleClearChat(): void

// 加载更多历史消息
handleLoadMore(): void
```

**状态管理：**
```typescript
interface ChatViewState {
  messages: ChatMessage[];      // 消息列表
  isLoading: boolean;            // 加载状态
  error: string | null;          // 错误信息
  isFocused: boolean;            // 输入框焦点
}
```

### 2. ChatService

**位置：** `src/services/chat-service.ts`

**职责：**
- 统一的聊天 API 客户端
- 消息历史管理
- 错误处理和重试

**主要方法：**
```typescript
// 发送消息（返回完整响应）
sendMessage(message: string): Promise<ChatResponse>

// 发送消息（流式）
sendMessageStream(
  message: string,
  onChunk: (text: string) => void
): Promise<string>

// 清空历史
clearHistory(): void

// 获取历史
getHistory(): ChatMessage[]

// 设置历史
setHistory(history: ChatMessage[]): void
```

**配置选项：**
```typescript
interface ChatServiceConfig {
  provider?: 'gemini' | 'doubao';      // AI 提供商
  enableHistory?: boolean;              // 是否启用历史
  maxHistoryLength?: number;            // 最大历史长度
  enableFunctionCalling?: boolean;      // 是否启用 Function Calling
}
```

### 3. FunctionExecutor

**位置：** `src/lib/function-executor.ts`

**职责：**
- 执行 Function Calling
- 查询球员数据
- 执行分组算法

**支持的函数：**
```typescript
// 查询球员
query_players(args: {
  name?: string;
  position?: string;
  minOverall?: number;
  limit?: number;
}): Promise<PlayerQueryResult>

// 创建分组
create_grouping(args: {
  playerIds: string[];
  teamCount: number;
  strategy?: 'balanced' | 'random';
}): Promise<GroupingResult>

// 获取球员统计
get_player_stats(args: {
  playerId: string;
}): Promise<PlayerStats>

// 建议阵容
suggest_lineup(args: {
  tactic: 'offensive' | 'defensive' | 'balanced';
  playerPool?: string[];
}): Promise<LineupSuggestion>
```

### 4. API Route

**位置：** `api/chat.ts`

**职责：**
- 代理 Gemini API
- 处理 CORS 和速率限制
- 超时处理和降级

**请求格式：**
```typescript
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "..." }
  ],
  "enableFunctionCalling": true
}
```

**响应格式：**
```typescript
{
  "success": true,
  "message": "AI 回复内容",
  "functionResult": { ... },  // 可选
  "searchResults": { ... }     // 可选
}
```

## 性能优化

### 1. 虚拟滚动

**实现：** `react-window`

**触发条件：** 消息数量 > 50

**优点：**
- 只渲染可见消息
- 内存占用低
- 滚动流畅

**示例：**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={120}
  width="100%"
>
  {MessageItem}
</FixedSizeList>
```

### 2. 懒加载历史消息

**实现：** 监听滚动到顶部事件

**流程：**
```
用户滚动到顶部
  ↓
触发 onLoadMore
  ↓
从本地存储/服务器加载
  ↓
追加到消息列表顶部
```

### 3. Markdown 渲染优化

**策略：**
- 使用 `memo` 避免重复渲染
- 缓存渲染结果
- 按需加载语法高亮

**示例：**
```typescript
export const MarkdownRenderer = memo(
  ({ content }) => <ReactMarkdown>{content}</ReactMarkdown>,
  (prev, next) => prev.content === next.content
);
```

### 4. 防抖输入

**实现：** `lodash.debounce` 或自定义 Hook

**延迟：** 300ms

**应用场景：**
- 搜索建议
- 自动保存
- API 调用

**示例：**
```typescript
const debouncedInput = useDebounce(input, 300);

useEffect(() => {
  // 只在防抖后的值变化时触发
  fetchSuggestions(debouncedInput);
}, [debouncedInput]);
```

## 无障碍优化

### 1. ARIA 标签

**关键元素：**
```tsx
<div role="main" aria-label="聊天助手">
  <div role="log" aria-label="聊天消息列表" aria-live="polite">
    {/* 消息列表 */}
  </div>
  <input aria-label="消息输入框" aria-describedby="char-counter" />
</div>
```

### 2. 键盘导航

**支持的快捷键：**
| 快捷键 | 功能 | ARIA 属性 |
|--------|------|-----------|
| `Tab` | 焦点切换 | `tabindex` |
| `Enter` | 发送消息 | - |
| `Shift + Enter` | 换行 | - |
| `Escape` | 关闭弹窗 | - |
| `Arrow Up/Down` | 导航列表 | `aria-activedescendant` |

### 3. 屏幕阅读器

**公告机制：**
```typescript
// 创建公告元素
const announcer = document.createElement('div');
announcer.setAttribute('role', 'status');
announcer.setAttribute('aria-live', 'polite');

// 公告消息
announcer.textContent = '正在处理您的消息...';
```

**关键时机：**
- 消息发送
- 收到回复
- 发生错误
- 状态变化

## 测试

### 1. 单元测试

**工具：** Vitest + Testing Library

**覆盖范围：**
- ChatView 组件（~85% 覆盖率）
- ChatService（~90% 覆盖率）
- FunctionExecutor（~90% 覆盖率）

**运行测试：**
```bash
npm test                    # 运行所有测试
npm run test:coverage       # 生成覆盖率报告
npm run test:watch          # 监听模式
```

### 2. 集成测试

**工具：** Vitest

**测试场景：**
- API 请求/响应
- Function Calling 流程
- 错误处理
- CORS 配置

### 3. E2E 测试

**工具：** Playwright

**测试场景：**
- 完整用户流程
- 跨浏览器兼容性
- 无障碍检查
- 性能测试

**运行 E2E 测试：**
```bash
npx playwright test              # 运行所有测试
npx playwright test --ui         # UI 模式
npx playwright test --debug      # 调试模式
```

## 部署

### 1. 环境变量

**必需：**
```bash
GEMINI_API_KEY=your_gemini_api_key
BRAVE_SEARCH_API_KEY=your_brave_api_key
```

**可选：**
```bash
DEEPSEEK_API_KEY=your_deepseek_api_key  # 降级方案
NODE_ENV=production
```

### 2. Vercel 部署

**步骤：**
1. 连接 GitHub 仓库
2. 配置环境变量
3. 设置构建命令：`npm run build`
4. 设置输出目录：`dist`

**注意事项：**
- API Routes 自动部署为 Serverless Functions
- 免费版限制：10s 超时
- 速率限制：10 次/分钟/IP

### 3. 监控

**关键指标：**
- API 响应时间
- 错误率
- Function Calling 成功率
- 用户满意度

**工具：**
- Vercel Analytics
- Logflare（日志）
- Sentry（错误追踪）

## 故障排查

### 1. API 错误

**常见错误：**
| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| 400 | 请求格式错误 | 检查请求体 |
| 401 | API Key 无效 | 检查环境变量 |
| 429 | 速率限制 | 等待 1 分钟 |
| 500 | 服务器错误 | 查看日志 |
| 504 | 超时 | 简化请求 |

### 2. Function Calling 失败

**调试步骤：**
1. 检查函数定义是否正确
2. 验证参数格式
3. 查看服务器日志
4. 测试函数单独执行

### 3. 性能问题

**排查清单：**
- [ ] 是否启用了虚拟滚动？
- [ ] 是否使用了防抖？
- [ ] 是否缓存了 Markdown 渲染？
- [ ] 是否优化了图片和资源？

## 未来规划

### Phase 6: 部署和监控
- [ ] 生产环境部署
- [ ] 监控和告警
- [ ] 用户反馈收集

### 未来功能
- [ ] 语音输入
- [ ] 多轮对话上下文
- [ ] 对话导出
- [ ] 球员推荐算法优化
- [ ] 多语言支持

---

**更新时间：** 2026-03-08  
**版本：** 1.0.0  
**维护者：** Julius
