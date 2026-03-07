# Phase 4: 联网搜索集成 - 开发任务

## 工作目录
/Users/ppt/Projects/player-grouping

## 目标
- 验证 Brave Search 在中国的可用性
- 集成 Brave Search API（或备选方案）
- 实现 Web Search Function
- 优化搜索结果展示

---

## 详细任务清单

### 4.1 BraveSearchClient 实现 (2 小时)

**创建文件：** `src/lib/search/brave-search.ts`

```typescript
export interface SearchOptions {
  count?: number;
  searchLang?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  published?: string;
}

export class BraveSearchClient {
  private apiKey: string;
  private endpoint = 'https://api.search.brave.com/res/v1/web/search';

  constructor() {
    this.apiKey = process.env.BRAVE_SEARCH_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('BRAVE_SEARCH_API_KEY not configured');
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { count = 5, searchLang = 'zh-hans' } = options;

    try {
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
      return data.web?.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description,
        published: r.published
      })) || [];
    } catch (error: any) {
      console.error('Brave Search error:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }
}
```

**验收标准：**
- [ ] 文件创建成功
- [ ] 类型定义完整（SearchOptions, SearchResult）
- [ ] 错误处理完善
- [ ] 支持 TypeScript

---

### 4.2 添加 Web Search Function (1 小时)

**更新文件：** `src/lib/agent/functions.ts`

**任务：** 在现有的 function definitions 中添加 `web_search` 函数

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

**验收标准：**
- [ ] 函数定义添加成功
- [ ] 与现有函数定义格式一致
- [ ] 参数定义清晰

---

### 4.3 实现搜索执行器 (2 小时)

**更新文件：** `src/lib/agent/executor.ts`

**任务：** 
1. 导入 BraveSearchClient
2. 在 FunctionExecutor 中添加 searchClient 实例
3. 在 execute 方法中添加 web_search case
4. 实现 webSearch 私有方法

```typescript
import { BraveSearchClient } from '../search/brave-search';

export class FunctionExecutor {
  private searchClient: BraveSearchClient;

  constructor() {
    this.searchClient = new BraveSearchClient();
  }

  async execute(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'get_current_grouping':
        return await this.getCurrentGrouping();
      
      case 'save_grouping':
        return await this.saveGrouping(args);
      
      case 'web_search':
        return await this.webSearch(args);
      
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private async webSearch(args: { query: string; count?: number }) {
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

**验收标准：**
- [ ] BraveSearchClient 正确导入
- [ ] web_search case 添加成功
- [ ] webSearch 方法实现完整
- [ ] 错误处理完善

---

### 4.4 搜索结果展示组件 (3 小时)

**创建文件：** `src/components/chat/SearchResultDisplay.tsx`

```typescript
import { SearchResult } from '@/lib/search/brave-search';
import { ExternalLink, Search } from 'lucide-react';

interface SearchResultDisplayProps {
  results: SearchResult[];
  query: string;
}

export function SearchResultDisplay({ results, query }: SearchResultDisplayProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
        未找到关于 "{query}" 的相关结果
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        <span>找到 {results.length} 个相关结果</span>
      </div>
      
      <div className="space-y-2">
        {results.map((result, idx) => (
          <a
            key={idx}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">
                  {result.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {result.description}
                </p>
                {result.published && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(result.published).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

**验收标准：**
- [ ] 组件创建成功
- [ ] 样式与现有 UI 一致
- [ ] 支持点击跳转
- [ ] 处理空结果情况

---

### 4.5 更新 ChatMessage 组件 (1 小时)

**更新文件：** `src/components/chat/ChatMessage.tsx`

**任务：** 在消息渲染中集成 SearchResultDisplay 组件

```typescript
import { SearchResultDisplay } from './SearchResultDisplay';

// 在消息渲染逻辑中添加
{message.functionCall?.name === 'web_search' && message.functionResult && (
  <div className="mt-2">
    <SearchResultDisplay 
      results={message.functionResult.results} 
      query={message.functionResult.query}
    />
  </div>
)}
```

**验收标准：**
- [ ] SearchResultDisplay 正确导入
- [ ] 搜索结果正确渲染
- [ ] 布局合理

---

## 验收标准（Phase 4 总体）

1. ✅ **功能完整性**
   - BraveSearchClient 实现完整
   - web_search 函数定义正确
   - 执行器正确调用搜索 API
   - 搜索结果正确展示

2. ✅ **代码质量**
   - TypeScript 类型完整
   - 错误处理完善
   - 代码风格一致
   - 无 lint 错误

3. ✅ **用户体验**
   - 搜索结果展示美观
   - 加载状态处理
   - 错误提示友好

4. ✅ **文档**
   - 代码注释清晰
   - 类型定义完整

---

## 重要注意事项

1. **API Key 安全**
   - ⚠️ BRAVE_SEARCH_API_KEY 必须在后端使用
   - 不要在前端暴露 API Key
   - 确保环境变量正确配置

2. **错误处理**
   - API 调用失败时提供友好提示
   - 网络错误时不要崩溃
   - 空结果时显示友好消息

3. **性能优化**
   - 搜索结果限制数量（默认 5 个）
   - 避免重复搜索相同关键词

4. **兼容性**
   - 与现有 Function Calling 系统集成
   - 不影响其他函数（get_current_grouping, save_grouping）

---

## 完成后输出

1. **文件清单**
   - `src/lib/search/brave-search.ts` (新建)
   - `src/lib/agent/functions.ts` (更新)
   - `src/lib/agent/executor.ts` (更新)
   - `src/components/chat/SearchResultDisplay.tsx` (新建)
   - `src/components/chat/ChatMessage.tsx` (更新)

2. **完成报告**
   - 创建 `docs/phase4-completion.md`
   - 包含：已完成的功能、遇到的问题、解决方案

---

## 参考文档
- 详细设计：`docs/implementation-plan.md` Phase 4
- Function Calling 架构：`src/lib/agent/` 目录
- UI 组件风格：参考现有 `src/components/chat/` 组件
