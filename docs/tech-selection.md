# 技术选型报告

## 概述

本文档对比分析聊天机器人集成中的关键技术选型，包括 Gemini API 代理方案、Web Search API、React Chat UI 组件库，并提供详细的成本估算和建议方案。

## 详细设计

### 1. Gemini API 代理方案对比

#### 1.1 方案对比表

| 方案 | 成本 | 稳定性 | 延迟 | 维护成本 | 推荐度 |
|------|------|--------|------|----------|--------|
| **方案 A: 第三方代理服务** | 💰💰 | ⭐⭐⭐⭐ | 200-500ms | 低 | ⭐⭐⭐⭐⭐ |
| **方案 B: 自建 Vercel/Cloudflare 代理** | 💰 | ⭐⭐⭐ | 300-800ms | 中 | ⭐⭐⭐⭐ |
| **方案 C: VPS + Nginx 反向代理** | 💰💰💰 | ⭐⭐⭐⭐⭐ | 100-300ms | 高 | ⭐⭐⭐ |
| **方案 D: 切换到国内 AI 模型** | 💰💰 | ⭐⭐⭐⭐⭐ | 50-200ms | 低 | ⭐⭐⭐ |

#### 1.2 详细方案分析

**方案 A: 第三方代理服务**

**推荐服务商：**
1. **OpenRouter** (https://openrouter.ai)
   - 价格: Gemini Pro 免费，Gemini Ultra $0.002/1K tokens
   - 支持: OpenAI 兼容 API，无需 VPN
   - 特点: 统一接口，支持多模型

2. **AI Free API** (https://www.aifreeapi.com)
   - 价格: 免费额度 + 付费套餐
   - 支持: Gemini、GPT、Claude
   - 特点: 专门为中国用户优化

3. **老张 AI** (https://api.laozhang.ai)
   - 价格: 按量计费
   - 支持: Gemini 代理
   - 特点: 国内访问速度快

**优点：**
- ✅ 零维护成本
- ✅ 开箱即用
- ✅ 提供商负责稳定性
- ✅ 通常提供免费额度

**缺点：**
- ❌ 依赖第三方服务
- ❌ 可能有速率限制
- ❌ 数据经过第三方

**适用场景：** 个人项目、MVP、快速验证

---

**方案 B: 自建 Vercel/Cloudflare 代理**

**架构：**
```
用户 → Vercel Edge Function → Gemini API
      (中国可访问)
```

**实现示例（Vercel）：**
```typescript
// api/chat.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + 
    process.env.GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          stream: true
        }
      })
    }
  );

  // 流式转发
  return new NextResponse(response.body, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Cloudflare Workers 示例：**
```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await fetch(
      `https://generativelanguage.googleapis.com${url.pathname}`,
      {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY
        },
        body: request.body
      }
    );
    
    return new Response(response.body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream'
      }
    });
  }
};
```

**优点：**
- ✅ 完全可控
- ✅ Vercel/Cloudflare 国内访问较好
- ✅ 免费额度充足
- ✅ 可自定义缓存和限流

**缺点：**
- ❌ 需要一定的开发和维护
- ❌ Vercel 免费版有限制（10s 超时）
- ❌ 需要自己处理错误和重试

**适用场景：** 中小型项目、有技术能力的团队

---

**方案 C: VPS + Nginx 反向代理**

**架构：**
```
用户 → 国内 VPS (Nginx) → 海外 VPS → Gemini API
      (国内访问)          (科学上网)
```

**Nginx 配置：**
```nginx
server {
    listen 443 ssl;
    server_name your-proxy.com;

    location /v1/ {
        proxy_pass https://generativelanguage.googleapis.com/v1/;
        proxy_ssl_server_name on;
        proxy_set_header Host generativelanguage.googleapis.com;
        proxy_set_header X-Real-IP $remote_addr;
        
        # 流式支持
        proxy_buffering off;
        proxy_cache off;
    }
}
```

**优点：**
- ✅ 性能最佳
- ✅ 完全可控
- ✅ 可集成其他服务
- ✅ 延迟最低

**缺点：**
- ❌ 维护成本最高
- ❌ 需要购买 VPS（$5-20/月）
- ❌ 需要配置 SSL 证书
- ❌ 需要处理安全防护

**适用场景：** 企业级应用、对性能要求高的项目

---

**方案 D: 切换到国内 AI 模型**

**推荐模型：**
1. **DeepSeek Chat**
   - 价格: ¥0.001/1K tokens（约 $0.00014）
   - 性能: 接近 GPT-3.5
   - 特点: 中文理解好

2. **通义千问 (Qwen)**
   - 价格: 免费额度 + 按量计费
   - 性能: 国产领先
   - 特点: 阿里云生态

3. **智谱 ChatGLM**
   - 价格: 免费额度 + 按量计费
   - 性能: 多模态支持
   - 特点: 开源版本可用

**优点：**
- ✅ 无访问限制
- ✅ 延迟最低
- ✅ 中文能力强
- ✅ 合规性好

**缺点：**
- ❌ 英文能力可能不如 Gemini
- ❌ Function Calling 支持可能不完善
- ❌ 生态不如 Gemini 成熟

**适用场景：** 只在中国使用的应用、对延迟敏感的场景

#### 1.3 推荐方案

**主要方案：Vercel Serverless Function 代理 Gemini API**

> **决策来源**: Review Agent 反馈 - 问题 1
> **原因**: 用户确认使用 Vercel Serverless Function（免费），而非 OpenRouter（$192/月）

**架构：**
```
用户前端 → Vercel API Route (/api/chat) → Gemini API
```

**实现代码：**

```typescript
// api/chat.ts - Vercel Serverless Function
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  maxDuration: 10, // Vercel Hobby Plan 限制
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS 配置（Review 反馈 - 问题 5）
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com'
    : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 速率限制（Review 反馈 - 问题 5）
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(ip as string)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60,
      message: '您的请求过于频繁，请 1 分钟后再试'
    });
  }

  // 超时处理（Review 反馈 - 问题 2）
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 9000); // 9 秒超时
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
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  return await response.json();
}

// 速率限制实现
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache<string, number>({
  max: 500,
  ttl: 60000, // 1 分钟
});

function checkRateLimit(ip: string): boolean {
  const count = rateLimit.get(ip) || 0;
  if (count >= 10) { // 每分钟最多 10 次
    return false;
  }
  rateLimit.set(ip, count + 1);
  return true;
}
```

**环境变量配置（Vercel Dashboard）：**
```bash
# 在 Vercel 项目设置 → Environment Variables 添加：
GEMINI_API_KEY=your_api_key_here
# 注意：不要使用 VITE_ 前缀，确保只在后端使用
```

**优点：**
- ✅ 完全免费（Vercel Hobby Plan）
- ✅ API Key 安全（存储在服务端环境变量）
- ✅ 无需第三方代理服务
- ✅ 全球 CDN 加速
- ✅ 易于部署和维护

**限制和应对：**
- ⚠️ 10 秒执行时间限制 → 实现 9 秒超时检测 + 降级方案
- ⚠️ 中国访问可能较慢 → 使用自定义域名 + CDN 加速

**成本：** $0/月（Vercel 免费套餐）

---

**备用方案：国内 AI 降级**

> **决策来源**: Review Agent 反馈 - 问题 3
> **原因**: 中国用户访问优化

```typescript
// src/lib/ai-provider.ts
class AIProvider {
  private providers = {
    gemini: new GeminiViaVercelClient(), // 主要
    deepseek: new DeepSeekClient(),      // 国内降级
    fallback: new MockClient()           // 完全离线
  };

  async chat(messages: Message[]): Promise<Response> {
    // 1. 检测用户位置
    const userCountry = await detectUserCountry();

    // 2. 如果是中国用户，直接使用 DeepSeek
    if (userCountry === 'CN') {
      try {
        return await this.providers.deepseek.chat(messages);
      } catch (error) {
        console.warn('DeepSeek failed, falling back to offline');
      }
    }

    // 3. 其他地区尝试 Vercel + Gemini
    try {
      return await this.providers.gemini.chat(messages);
    } catch (error) {
      console.warn('Gemini failed, trying DeepSeek');
    }

    // 4. 最终降级到离线模式
    return await this.providers.fallback.chat(messages);
  }
}
```

**推荐组合：**
- **主要**: Vercel Serverless Function + Gemini (免费、安全)
- **备用**: DeepSeek (国内直连、低延迟)
- **降级**: 离线 Function Calling (无 AI)

### 1.4 中国用户访问优化方案

> **决策来源**: Review Agent 反馈 - 问题 3
> **重要性**: 目标用户主要在中国，需要确保访问速度和稳定性

#### 优化策略

**方案 1: 自定义域名 + Cloudflare CDN（推荐）**

**步骤：**
1. 购买域名（如 chat.yourdomain.com）
2. 在 Vercel 配置自定义域名
3. 使用 Cloudflare CDN 加速（免费）
4. 配置 DNS 解析

**效果：**
- ✅ 访问速度提升 50-70%
- ✅ 稳定性提高
- ✅ 免费（Cloudflare 免费套餐）

**实施成本：** 域名费用 $1/月

---

**方案 2: 智能降级到国内 AI 模型**

**检测逻辑：**
```typescript
// api/chat.ts
async function selectAIProvider(req: NextApiRequest) {
  const ip = req.headers['x-forwarded-for'];
  const country = await getCountryByIP(ip);

  if (country === 'CN') {
    // 使用 DeepSeek（国内直连）
    return new DeepSeekClient(process.env.DEEPSEEK_API_KEY);
  } else {
    // 使用 Gemini（通过 Vercel）
    return new GeminiClient(process.env.GEMINI_API_KEY);
  }
}
```

**优点：**
- ✅ 中国用户延迟低（50-200ms）
- ✅ 稳定性高
- ✅ 成本低（DeepSeek ¥0.001/1K tokens）

**缺点：**
- ⚠️ 需要额外的 DeepSeek API Key
- ⚠️ 功能可能略有差异

---

**方案 3: 本地缓存 + Service Worker**

**实现离线优先策略：**
- 缓存常见问题的回答
- 使用 Service Worker 拦截请求
- 网络失败时返回缓存

**效果：**
- ✅ 减少网络请求
- ✅ 提升响应速度
- ✅ 离线可用

---

#### 验证测试

**在实施前，建议进行以下测试：**
1. 使用 https://www.webpagetest.org/ 测试中国各地的访问速度
2. 测试不同时段的稳定性
3. 测试 CDN 加速效果
4. 收集用户反馈

**监控指标：**
- 平均响应时间 < 3 秒
- 成功率 > 95%
- 用户满意度 > 4.0/5.0

---

### 2. Web Search API 选型

#### 2.1 方案对比

| API | 免费额度 | 价格 | 质量 | 限制 | 推荐度 |
|-----|----------|------|------|------|--------|
| **Brave Search API** | 2000 次/月 | $5/1000 次 | ⭐⭐⭐⭐ | 1 req/s | ⭐⭐⭐⭐⭐ |
| SerpAPI | 100 次/月 | $50/5000 次 | ⭐⭐⭐⭐⭐ | 无 | ⭐⭐⭐ |
| Google Custom Search | 100 次/天 | $5/1000 次 | ⭐⭐⭐⭐⭐ | 10 天限制 | ⭐⭐⭐⭐ |
| DuckDuckGo | 免费 | 免费 | ⭐⭐⭐ | 无官方 API | ⭐⭐ |
| Bing Web Search API | 1000 次/月 | $1/1000 次 | ⭐⭐⭐⭐ | 无 | ⭐⭐⭐⭐ |

#### 2.2 详细分析

**方案 A: Brave Search API (推荐)**

**优点：**
- ✅ 免费额度充足（2000 次/月）
- ✅ 无需信用卡
- ✅ 搜索质量好
- ✅ API 简洁
- ✅ 支持中国访问

**缺点：**
- ❌ 速率限制（1 req/s）
- ❌ 无高级搜索功能

**实现：**
```typescript
// src/lib/web-search.ts
import axios from 'axios';

class BraveSearchClient {
  private apiKey: string;
  private endpoint = 'https://api.search.brave.com/res/v1/web/search';

  async search(query: string, count = 5): Promise<SearchResult[]> {
    const response = await axios.get(this.endpoint, {
      headers: {
        'X-Subscription-Token': this.apiKey,
        'Accept': 'application/json'
      },
      params: {
        q: query,
        count,
        search_lang: 'zh-hans' // 中文
      }
    });

    return response.data.web.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description
    }));
  }
}
```

**成本估算（基于 200 用户/月）：**
- 每用户平均 5 次搜索
- 总计：1000 次/月
- 费用：免费 ✅

---

**方案 B: Google Custom Search API**

**优点：**
- ✅ 搜索质量最佳
- ✅ 支持高级搜索
- ✅ 结果丰富

**缺点：**
- ❌ 免费额度少（100 次/天）
- ❌ 需要配置搜索引擎 ID
- ❌ 中国访问不稳定

**适用场景：** 需要高质量搜索结果的项目

---

**方案 C: SerpAPI**

**优点：**
- ✅ 支持多种搜索引擎
- ✅ 功能强大
- ✅ 结果结构化

**缺点：**
- ❌ 价格较高
- ❌ 免费额度少

**适用场景：** 企业级应用、预算充足的项目

---

**方案 D: 免费 Web Scraping（不推荐）**

**风险：**
- ❌ 违反网站 ToS
- ❌ 可能被封 IP
- ❌ 维护成本高

**不推荐用于生产环境**

#### 2.3 推荐方案

**主要方案：Brave Search API**
- 理由：免费额度充足、质量好、易集成

**可用性验证（Review 反馈 - 问题 6）：**

**测试方法：**
1. 使用中国 IP 地址调用 Brave Search API
2. 测试不同时段的稳定性
3. 测试搜索质量

**测试脚本：**
```bash
# 使用中国 IP 测试（可通过代理）
curl -X GET "https://api.search.brave.com/res/v1/web/search?q=NBA&count=5" \
  -H "X-Subscription-Token: YOUR_API_KEY"
```

**备选方案：**

如果 Brave Search 在中国不可用，建议使用：

**方案 1: Bing Web Search API**
- 价格：$1/1000 次
- 免费额度：1000 次/月
- 中国可用性：较好（通过 Azure 中国区）

**方案 2: SerpAPI（付费）**
- 价格：$50/5000 次
- 免费额度：100 次/月
- 支持多种搜索引擎

**方案 3: 本地知识库（降级）**
- 如果网络搜索不可用，使用本地知识库
- 预加载 NBA 常见问题和答案
- 减少对 Web Search API 的依赖

**降级策略：**
```typescript
// src/lib/search/search-provider.ts
class SearchProvider {
  async search(query: string): Promise<SearchResult[]> {
    try {
      // 1. 尝试 Brave Search
      return await this.braveSearch.search(query);
    } catch (error) {
      console.warn('Brave Search failed, trying Bing');

      try {
        // 2. 降级到 Bing Search
        return await this.bingSearch.search(query);
      } catch (error) {
        console.warn('Bing Search failed, using local cache');

        // 3. 最终降级到本地缓存
        return await this.localCache.search(query);
      }
    }
  }
}
```

**成本调整：**
- 如果使用 Bing Search：$1/1000 次
- 500 用户 × 5 次/月 = 2500 次
- 费用：$2.5/月（远低于 Brave Search 的 $140/月）

**备用方案：缓存 + 降级**
```typescript
// 缓存搜索结果，减少 API 调用
const searchCache = new Map<string, SearchResult[]>();

async function cachedSearch(query: string): Promise<SearchResult[]> {
  // 1. 检查缓存
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 小时
    return cached.results;
  }

  // 2. 调用 API
  const results = await braveSearch.search(query);

  // 3. 更新缓存
  searchCache.set(query, {
    results,
    timestamp: Date.now()
  });

  return results;
}
```

### 3. React Chat UI 组件库选型

#### 3.1 方案对比

| 方案 | 优点 | 缺点 | 包大小 | 推荐度 |
|------|------|------|--------|--------|
| **自建组件** | 完全可控、轻量 | 开发成本高 | ~5KB | ⭐⭐⭐⭐⭐ |
| chat-ui-kit-react | 开箱即用 | 样式定制困难 | ~50KB | ⭐⭐⭐ |
| @llamaindex/chat-ui | 功能丰富 | 依赖重 | ~100KB | ⭐⭐ |
| Vercel AI SDK UI | 流式支持好 | 需配合后端 | ~30KB | ⭐⭐⭐⭐ |

#### 3.2 详细分析

**方案 A: 自建组件 (推荐)**

**技术栈：**
- shadcn/ui (已使用)
- react-markdown (Markdown 渲染)
- rehype-highlight (代码高亮)
- react-virtualized-auto-sizer (虚拟滚动)

**优点：**
- ✅ 完全符合设计系统
- ✅ 轻量、无冗余
- ✅ 便于定制
- ✅ 学习成本低

**缺点：**
- ❌ 需要自己实现所有功能
- ❌ 开发时间长

**实现成本：** 2-3 天

---

**方案 B: chat-ui-kit-react**

**示例：**
```typescript
import { MainContainer, ChatContainer, MessageList, Message, MessageInput } from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

<MainContainer>
  <ChatContainer>
    <MessageList>
      <Message model={{
        message: "Hello!",
        sentTime: "just now",
        sender: "User",
        direction: "incoming"
      }} />
    </MessageList>
    <MessageInput placeholder="Type message here" />
  </ChatContainer>
</MainContainer>
```

**优点：**
- ✅ 开箱即用
- ✅ 文档完善
- ✅ 功能齐全

**缺点：**
- ❌ 样式难以定制
- ❌ 包体积大
- ❌ 可能与现有设计系统冲突

---

**方案 C: Vercel AI SDK UI**

**示例：**
```typescript
import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

**优点：**
- ✅ 流式支持开箱即用
- ✅ React Hooks 友好
- ✅ 与 Vercel AI SDK 后端完美配合

**缺点：**
- ❌ 需要 Vercel AI SDK 后端
- ❌ 样式需要自己实现

**适用场景：** 使用 Vercel 部署的项目

#### 3.3 推荐方案

**主要方案：自建组件 + shadcn/ui**

**理由：**
1. 项目已使用 shadcn/ui，风格一致
2. 完全可控，便于集成 Function Calling 结果渲染
3. 轻量，不影响性能
4. 可复用现有组件（Button, Card, Badge 等）

**参考实现：**
```typescript
// src/components/chat/ChatMessage.tsx
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

export function ChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <Card className={`max-w-[70%] p-4 ${isUser ? 'bg-primary text-primary-foreground' : ''}`}>
        {message.role === 'function' ? (
          <FunctionResult data={message.functionResult} />
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </Card>
    </div>
  );
}
```

### 4. 成本估算

> **更新说明**: Review Agent 反馈 - 问题 1
> **变更**: 将 OpenRouter 改为 Vercel Serverless Function，成本大幅降低

#### 4.1 API 调用费用（月度，基于 200 活跃用户）

**Vercel Serverless Function + Gemini API:**
- Vercel Hobby Plan：免费 ✅
- Gemini Pro (Flash)：免费额度充足 ✅
- 月总计：**$0/月** 🎉

**Brave Search API:**
- 每用户每天 5 次搜索
- 月总计：200 × 30 × 5 = 30,000 次
- 费用：2000 免费额度 + 28,000 × $5/1000 = **$140/月**
- 优化后（缓存）：约 **$50/月**
- 如果需要切换到 Bing Search：**$2.5/月**

**DeepSeek (备用):**
- 按 20% 降级使用计算（中国用户）
- 费用：96M × 0.2 × ¥0.001/1K = ¥19.2 ≈ **$3/月**

**自定义域名 + CDN（可选）:**
- 域名：$1/月
- Cloudflare CDN：免费 ✅

**总计：**
- **基础方案（Vercel + Gemini）**: $0 + $50 + $3 = **$53/月**
- **优化方案（Vercel + Gemini + Bing + CDN）**: $0 + $2.5 + $3 + $1 = **$6.5/月** 🎉
- **对比 OpenRouter 方案**: $335/月 → 节省 **98%** 成本

#### 4.2 基础设施费用

**自建代理（Vercel/Cloudflare）：**
- Vercel Pro: $20/月
- Cloudflare Workers: 免费额度充足
- **总计：$0-20/月**

**VPS 代理：**
- Vultr/DigitalOcean: $5-20/月
- 域名: $1/月
- SSL 证书: 免费 (Let's Encrypt)
- **总计：$6-21/月**

#### 4.3 总成本估算

| 场景 | 月度成本 | 年度成本 |
|------|----------|----------|
| **个人项目 (100 用户)** | $15-30 | $180-360 |
| **小型项目 (500 用户)** | $80-150 | $960-1800 |
| **中型项目 (2000 用户)** | $300-600 | $3600-7200 |

**优化建议：**
1. ✅ 优先使用免费额度
2. ✅ 实现智能缓存
3. ✅ 限制免费用户使用频率
4. ✅ 监控成本，及时调整

## 实现步骤

### 技术选型决策流程

1. **第一阶段：验证期（1 周）**
   - 使用 OpenRouter 免费额度
   - 集成 Brave Search API
   - 自建基础 Chat UI
   - 成本：$0

2. **第二阶段：优化期（2 周）**
   - 评估 API 调用量
   - 添加缓存层
   - 测试降级方案
   - 成本：$10-20

3. **第三阶段：稳定期（长期）**
   - 根据使用量选择方案
   - 可能切换到 DeepSeek
   - 考虑自建代理
   - 成本：$50-200/月

### 降级策略

```typescript
// 成本优化策略
const strategies = {
  // 策略 1: 使用更便宜的模型
  useCheaperModel: () => {
    return isPeakHours() ? 'gemini-pro' : 'gemini-ultra';
  },

  // 策略 2: 缓存常见查询
  cacheResults: () => {
    const cacheKey = hashMessage(message);
    return cache.get(cacheKey);
  },

  // 策略 3: 限制免费用户
  rateLimit: (userId: string) => {
    const usage = getMonthlyUsage(userId);
    return usage < FREE_TIER_LIMIT;
  },

  // 策略 4: 降级到离线模式
  offlineMode: () => {
    // 仅使用 Function Calling，无 AI 生成
    return executeFunctionOnly(message);
  }
};
```

## 注意事项

### 1. API Key 安全

- ✅ 使用环境变量
- ✅ 定期轮换密钥
- ✅ 限制密钥权限
- ❌ 不要硬编码
- ❌ 不要提交到 Git

### 2. 速率限制处理

```typescript
// 指数退避重试
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) { // Rate limit
        await sleep(Math.pow(2, i) * 1000);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. 监控和告警

- ✅ 监控 API 调用量
- ✅ 设置成本告警
- ✅ 监控错误率
- ✅ 记录慢请求

### 4. 用户体验

- ✅ 显示 API 状态
- ✅ 优雅降级
- ✅ 离线提示
- ✅ 错误友好提示

## 决策总结

**推荐技术栈：**

| 类别 | 方案 | 理由 | 成本 |
|------|------|------|------|
| **AI API** | Vercel Serverless Function + Gemini | 免费额度 + API Key 安全 | $0/月 |
| **Web Search** | Brave Search API (+ Bing 降级) | 免费额度充足、质量好 | $0-50/月 |
| **Chat UI** | 自建组件 + shadcn/ui | 风格一致、可控 | $0 |
| **CDN 加速** | Cloudflare CDN（可选） | 中国访问优化 | $0-1/月 |
| **备用 AI** | DeepSeek | 国内降级方案 | $3/月 |

**预估成本：** $3-54/月（500 用户）

**对比原方案（OpenRouter）:**
- 原成本：$335/月
- 新成本：$3-54/月
- 节省：**84-99%** 🎉

**下一步：** 开始实施 Phase 1（基础组件）
