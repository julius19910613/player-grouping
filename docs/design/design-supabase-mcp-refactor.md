# Supabase MCP 动态查询架构重构设计文档

**项目**: player-grouping-mcp-refactor
**版本**: 1.0
**创建时间**: 2026-03-11
**状态**: design_completed

---

## 目录

- [1. 执行摘要](#1-执行摘要)
- [2. 当前架构分析](#2-当前架构分析)
- [3. 目标架构设计](#3-目标架构设计)
- [4. RLS 安全策略](#4-rls-安全策略)
- [5. 实施路径](#5-实施路径)
- [6. 风险缓解](#6-风险缓解)
- [7. 验收标准](#7-验收标准)

---

## 1. 执行摘要

### 1.1 项目背景

当前 `api/chat.ts` 使用手动 Function Calling 实现，存在以下问题：
- 硬编码的工具定义，扩展性差
- 直接使用 Supabase Client，RLS 策略依赖客户端配置
- 缺乏统一的查询抽象层
- 安全边界不清晰（SQL 注入、权限降级风险）

### 1.2 重构目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| 动态工具注入 | 通过 MCP Server 动态获取工具定义 | P0 |
| 统一查询抽象 | 所有数据库查询通过 Supabase MCP Server | P0 |
| RLS 强化 | 服务端 RLS 策略 + 查询参数验证 | P0 |
| 可观测性 | 集中日志、监控、错误追踪 | P1 |
| 向后兼容 | 保持现有 API 接口不变 | P1 |

### 1.3 预期收益

- **可维护性**: 工具定义与实现解耦，易于扩展
- **安全性**: RLS 在服务端强制执行，防止权限降级
- **性能**: MCP 连接复用，减少客户端实例开销
- **灵活性**: 支持动态添加新工具无需重启服务

---

## 2. 当前架构分析

### 2.1 现有实现

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Function                         │
│                        api/chat.ts                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Manual Tool Definitions (Line 14-137)         │    │
│  │  - get_player_stats                                    │    │
│  │  - get_match_history                                    │    │
│  │  - compare_players                                     │    │
│  │  - analyze_match_performance                            │    │
│  │  - calculate_grouping                                   │    │
│  │  - list_all_players                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Gemini Model with Tools                      │    │
│  │  const model = genAI.getGenerativeModel({             │    │
│  │    model: 'gemini-3.1-flash-lite-preview',             │    │
│  │    tools: [{ functionDeclarations: tools }]            │    │
│  │  })                                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           executeToolCall() Handler (Line 494-541)    │    │
│  │  Switch case dispatch to specific handlers           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Direct Supabase Queries                      │    │
│  │  - getPlayerStatsHandler()                              │    │
│  │  - getMatchHistoryHandler()                            │    │
│  │  - comparePlayersHandler()                            │    │
│  │  - analyzeMatchPerformanceHandler()                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Supabase Client (per request)               │    │
│  │  const supabase = createClient(url, key)               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Database                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 痛点分析

#### 2.2.1 硬编码工具定义

```typescript
// Line 14-137: 硬编码工具数组
const tools: FunctionDeclaration[] = [
  {
    name: "get_player_stats",
    description: "...",
    parameters: { /* ... */ }
  },
  // ... 5 more tools
];
```

**问题**:
- 添加新工具需要修改代码
- 工具描述与实现分离，容易不一致
- 无法动态启用/禁用工具

#### 2.2.2 客户端 RLS 依赖

```typescript
// Line 562: 每个 request 创建新客户端
const supabase = createClient(supabaseUrl, supabaseKey);
// RLS 策略完全依赖 Supabase 服务端配置
```

**问题**:
- 无服务端参数验证
- 无法在代码层面限制查询范围
- 假设 RLS 配置正确，无防护措施

#### 2.2.3 SQL 注入风险

```typescript
// api/lib/db-queries.ts Line 156-160
const { data, error } = await supabase
  .from('players')
  .select('*')
  .ilike('name', `%${playerName}%`)  // 虽然使用了 ilike，但缺乏输入验证
  .limit(10);
```

**风险**: 虽然使用参数化查询，但输入验证不足。

### 2.3 技术债务清单

| 债务项 | 位置 | 影响 | 优先级 |
|--------|------|------|--------|
| 硬编码工具定义 | api/chat.ts:14-137 | 可扩展性 | P0 |
| Switch-case 分发 | api/chat.ts:494-541 | 可维护性 | P0 |
| 缺少输入验证 | api/lib/db-queries.ts | 安全性 | P0 |
| 无查询日志 | 所有 handlers | 可观测性 | P1 |
| 缺少错误分类 | executeToolCall() | 调试效率 | P1 |

---

## 3. 目标架构设计

### 3.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Vercel Function                            │
│                          api/chat.ts (Refactored)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   MCP Client Manager                            │   │
│  │  api/lib/mcp-client.ts (Singleton)                             │   │
│  │                                                                 │   │
│  │  - connect()                                                    │   │
│  │  - getTools()                                                  │   │
│  │  - callTool()                                                  │   │
│  │  - disconnect()                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            ▲                                         │
│                            │ stdio                                   │
│                            │                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Supabase MCP Server                                │   │
│  │  (npx @supabase/mcp-server --project-id=xxx)                   │   │
│  │                                                                 │   │
│  │  Tools:                                                         │   │
│  │  - supabase-player-grouping.query_players                       │   │
│  │  - supabase-player-grouping.query_matches                       │   │
│  │  - supabase-player-grouping.query_stats                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            │ RLS Enforced                            │
│                            │                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Supabase Database                         │   │
│  │  - players (RLS: read only for anon)                           │   │
│  │  - player_skills (RLS: read only for anon)                     │   │
│  │  - matches (RLS: read only for anon)                          │   │
│  │  - player_match_stats (RLS: read only for anon)               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 核心组件

#### 3.2.1 MCP Client Manager

```typescript
// api/lib/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClientManager {
  private static instance: MCPClientManager;
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;

  private constructor() {
    this.client = new Client(
      { name: 'player-grouping-chat', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  async connect(projectId: string): Promise<void> {
    if (this.connected) return;

    this.transport = new StdioClientTransport({
      command: 'npx',
      args: ['@supabase/mcp-server', '--project-id', projectId],
    });

    await this.client.connect(this.transport);
    this.connected = true;
  }

  async getTools(): Promise<Tool[]> {
    const { tools } = await this.client.listTools();
    return tools;
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    const result = await this.client.callTool({ name, arguments: args });
    return result;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.client.close();
      this.transport = null;
      this.connected = false;
    }
  }
}
```

#### 3.2.2 输入验证层

```typescript
// api/lib/validators.ts
import { z } from 'zod';

export const PlayerQuerySchema = z.object({
  player_name: z.string()
    .min(1, 'Player name required')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-]+$/, 'Invalid characters'),
  season: z.string().optional(),
});

export const MatchQuerySchema = z.object({
  player_name: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: any): T {
  return schema.parse(data);
}
```

#### 3.2.3 重构后的 Handler

```typescript
// api/chat.ts (Refactored)
import { MCPClientManager } from './lib/mcp-client.js';
import { validateInput, PlayerQuerySchema, MatchQuerySchema } from './lib/validators.js';

// MCP Manager singleton (init once on cold start)
let mcpManager: MCPClientManager | null = null;
let toolsCache: FunctionDeclaration[] | null = null;

async function initMCPManager() {
  if (mcpManager) return mcpManager;

  const projectId = process.env.SUPABASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('SUPABASE_PROJECT_ID not configured');
  }

  mcpManager = MCPClientManager.getInstance();
  await mcpManager.connect(projectId);

  // Cache tools
  const mcpTools = await mcpManager.getTools();
  toolsCache = mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema as any,
  }));

  return mcpManager;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... CORS and rate limiting code ...

  // Initialize MCP
  const mcp = await initMCPManager();

  // Get tools (from cache)
  const tools = toolsCache || [];

  // Initialize Gemini with dynamic tools
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
    systemInstruction: '...',
  });

  // ... chat logic ...

  // Handle function calls via MCP
  if (functionCall) {
    // Validate input
    if (functionCall.name === 'supabase-player-grouping.query_players') {
      const validated = validateInput(PlayerQuerySchema, functionCall.args);
      // Execute via MCP
      const result = await mcp.callTool(functionCall.name, validated);
      // ...
    }
  }

  // ...
}
```

### 3.3 工具映射表

| 当前工具 | MCP 工具 | 参数映射 |
|----------|----------|----------|
| `get_player_stats` | `supabase-player-grouping.query_players` | `player_name` → `name` |
| `get_match_history` | `supabase-player-grouping.query_matches` | `player_name`, `limit` |
| `list_all_players` | `supabase-player-grouping.query_players` | `limit: 100` |
| `compare_players` | 多次 `query_players` 调用 | 数组展开 |
| `analyze_match_performance` | `supabase-player-grouping.query_stats` | `match_id`, `player_name` |

---

## 4. RLS 安全策略

### 4.1 安全威胁分析

| 威胁类型 | 当前风险 | 缓解措施 |
|----------|----------|----------|
| SQL 注入 | 中 | 参数化查询 + Zod 验证 |
| 权限降级 | 高 | 服务端 RLS + 匿名 token 限制 |
| 数据泄露 | 中 | 列级过滤 + 敏感字段屏蔽 |
| DoS 攻击 | 中 | Rate limiting + 查询超时 |

### 4.2 分层安全模型

```
┌─────────────────────────────────────────────────────────────────┐
│                         Layer 1: API Gateway                    │
│  - CORS 白名单                                                   │
│  - Rate Limiting (10 req/min)                                    │
│  - Request Timeout (10s)                                          │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Layer 2: Input Validation                   │
│  - Zod Schema Validation                                         │
│  - SQL Injection Prevention                                      │
│  - Parameter Sanitization                                        │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 3: MCP Server (RLS)                     │
│  - Supabase RLS Policies                                         │
│  - Anonymous Auth Context                                        │
│  - Row-level Filtering                                           │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 4: Database (PostgreSQL)                │
│  - Column-level Permissions                                       │
│  - Query Result Truncation                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 RLS 策略定义

#### 4.3.1 Players 表

```sql
-- 只读策略（匿名用户只能读取）
CREATE POLICY "Allow anonymous read" ON players
  FOR SELECT
  TO anon
  USING (true);

-- 禁止写入（匿名用户）
CREATE POLICY "Deny anonymous write" ON players
  FOR INSERT
  TO anon
  WITH CHECK (false);
```

#### 4.3.2 Player Skills 表

```sql
-- 关联查询保护
CREATE POLICY "Allow skill read for existing players" ON player_skills
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
    )
  );
```

### 4.4 输入验证规则

| 参数 | 验证规则 | 原因 |
|------|----------|------|
| `player_name` | 1-50 字符, 仅允许字母数字/中文/空格/连字符 | 防止注入 |
| `date_from/date_to` | YYYY-MM-DD 格式 | 防止格式攻击 |
| `limit` | 1-50 整数 | 防止大批量查询 |
| `match_id` | UUID 格式 | 防止非法 ID |

### 4.5 敏感字段屏蔽

```typescript
// api/lib/sanitizers.ts
export function sanitizePlayerData(data: any): any {
  const sensitiveFields = ['password', 'email', 'phone', 'auth_token'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    delete sanitized[field];
  }

  return sanitized;
}
```

---

## 5. 实施路径

### 5.1 Phase 规划

#### Phase 1: 基础设施 (Week 1)

**目标**: 建立 MCP 集成基础设施

**任务**:
1. 安装依赖
   ```bash
   npm install @modelcontextprotocol/sdk zod
   ```

2. 创建 MCP Client Manager
   - 文件: `api/lib/mcp-client.ts`
   - 功能: 单例模式、连接管理、工具查询

3. 集成 Supabase MCP Server
   - 配置: `SUPABASE_PROJECT_ID` 环境变量
   - 测试: 本地连接验证

**验收**:
- [ ] MCP Manager 可实例化
- [ ] 成功连接到 Supabase MCP Server
- [ ] 可列出可用工具

**风险**:
- Vercel Serverless 冷启动时间
- MCP Server 网络连接稳定性

---

#### Phase 2: 动态工具注入 (Week 2)

**目标**: 替换硬编码工具定义

**任务**:
1. 创建工具映射器
   - 文件: `api/lib/tool-mapper.ts`
   - 功能: MCP 工具 → Gemini FunctionDeclaration

2. 重构 `api/chat.ts`
   - 移除硬编码 `tools` 数组
   - 使用 MCP 动态获取工具
   - 添加工具缓存

3. 更新工具执行逻辑
   - 统一使用 `mcp.callTool()`
   - 移除 switch-case 分发

**验收**:
- [ ] 工具定义完全来自 MCP
- [ ] 所有现有工具正常工作
- [ ] 工具缓存生效

**风险**:
- 工具名称不兼容
- 参数格式差异

---

#### Phase 3: 安全加固 (Week 3)

**目标**: 实施多层安全策略

**任务**:
1. 实现输入验证
   - 文件: `api/lib/validators.ts`
   - Zod Schema 定义

2. 添加数据清洗
   - 文件: `api/lib/sanitizers.ts`
   - 敏感字段过滤

3. 强化 RLS 策略
   - SQL 脚本: `docs/sql/rls-policies.sql`
   - 数据库迁移

4. 安全审计
   - SQL 注入测试
   - 权限降级测试

**验收**:
- [ ] 所有输入经过验证
- [ ] RLS 策略在服务端执行
- [ ] 安全测试通过

**风险**:
- RLS 策略影响现有功能
- 验证规则过于严格

---

#### Phase 4: 可观测性 (Week 4)

**目标**: 添加监控和日志

**任务**:
1. 实现结构化日志
   - 文件: `api/lib/logger.ts`
   - JSON 格式日志

2. 添加指标收集
   - MCP 调用计数
   - 查询延迟
   - 错误率

3. 集成错误追踪
   - Sentry 集成
   - 错误分类

**验收**:
- [ ] 关键操作有日志
- [ ] 指标可查询
- [ ] 错误可追踪

---

#### Phase 5: 验证与优化 (Week 5)

**目标**: 端到端验证和性能优化

**任务**:
1. 端到端测试
   - 所有工具测试用例
   - 集成测试

2. 性能优化
   - 连接池复用
   - 工具缓存策略
   - 查询优化

3. 文档更新
   - API 文档
   - 部署指南
   - 故障排查手册

**验收**:
- [ ] 所有测试通过
- [ ] 性能指标达标
- [ ] 文档完整

---

### 5.2 迁移检查清单

#### Pre-migration

- [ ] 备份当前 `api/chat.ts`
- [ ] 记录现有 API 行为（基线测试）
- [ ] 准备回滚计划

#### Migration

- [ ] 创建功能分支 `feature/mcp-refactor`
- [ ] 逐 Phase 实施
- [ ] 每个 Phase 结束后合并到 main

#### Post-migration

- [ ] 运行完整回归测试
- [ ] 监控错误率和性能
- [ ] 用户反馈收集

---

### 5.3 回滚计划

如果出现严重问题：

1. **立即回滚**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Vercel 回滚**
   - 在 Vercel Dashboard 选择部署版本
   - 点击 "Redeploy"

3. **数据恢复**
   - Supabase RLS 策略回滚
   - 环境变量恢复

---

## 6. 风险缓解

### 6.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Vercel 冷启动超时 | 中 | 高 | 预热连接 + 超时降级 |
| MCP Server 不可用 | 低 | 高 | 降级到直接 Supabase Client |
| 工具参数不兼容 | 中 | 中 | 参数转换层 + 单元测试 |
| RLS 策略误配置 | 低 | 高 | 安全审计 + 灰度发布 |
| 性能下降 | 中 | 中 | 基准测试 + 查询优化 |

### 6.2 降级策略

#### 策略 A: MCP 降级到 Supabase Client

```typescript
async function safeMCPCall(toolName: string, args: any) {
  try {
    return await mcp.callTool(toolName, args);
  } catch (error) {
    console.warn('MCP call failed, falling back to Supabase Client', error);

    // 降级到现有实现
    return await legacySupabaseQuery(toolName, args);
  }
}
```

#### 策略 B: 工具降级列表

```typescript
// 配置降级工具列表
const FALLBACK_TOOLS = [
  'list_all_players',  // 简单查询，降级安全
];

if (FALLBACK_TOOLS.includes(toolName)) {
  return await legacySupabaseQuery(toolName, args);
}
```

### 6.3 监控指标

| 指标 | 告警阈值 | 动作 |
|------|----------|------|
| MCP 连接失败率 | > 5% | 检查网络，考虑降级 |
| 查询延迟 P95 | > 2s | 检查查询性能 |
| 错误率 | > 1% | 检查错误日志 |
| 内存使用 | > 512MB | 检查连接泄漏 |

---

## 7. 验收标准

### 7.1 功能验收

| 功能 | 标准 | 测试方法 |
|------|------|----------|
| 动态工具获取 | 成功获取 > 5 个工具 | 集成测试 |
| 工具调用 | 所有工具可正常调用 | 端到端测试 |
| 输入验证 | 无效输入被拒绝 | 安全测试 |
| RLS 保护 | 匿名用户无写权限 | 权限测试 |

### 7.2 性能验收

| 指标 | 目标 | 当前基线 |
|------|------|----------|
| 冷启动时间 | < 3s | 待测量 |
| P50 响应时间 | < 500ms | 待测量 |
| P95 响应时间 | < 2s | 待测量 |
| MCP 连接时间 | < 500ms | 待测量 |

### 7.3 安全验收

| 检查项 | 标准 |
|--------|------|
| OWASP Top 10 | 无高危漏洞 |
| SQL 注入 | 无漏洞 |
| 权限提升 | 无漏洞 |
| 敏感数据泄露 | 无泄露 |

---

## 附录

### A. 相关文件清单

| 文件 | 状态 | 变更类型 |
|------|------|----------|
| `api/chat.ts` | 需重构 | 重构 |
| `api/lib/db-queries.ts` | 保留 | 降级备份 |
| `api/lib/mcp-client.ts` | 新增 | 新建 |
| `api/lib/validators.ts` | 新增 | 新建 |
| `api/lib/sanitizers.ts` | 新增 | 新建 |
| `api/lib/logger.ts` | 新增 | 新建 |
| `api/lib/tool-mapper.ts` | 新增 | 新建 |

### B. 环境变量

```bash
# 新增环境变量
SUPABASE_PROJECT_ID=your-project-id

# 现有环境变量（保持不变）
GEMINI_API_KEY=your-gemini-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### C. 依赖更新

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0",
    "zod-to-json-schema": "^3.22.0"
  }
}
```

### D. 参考资料

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/supabase/mcp-server)
- [Gemini Function Calling](https://ai.google.dev/docs/function_calling)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 8. 评审意见

### 8.1 需要修改的问题

#### 安全相关问题

##### P0 - RLS 策略覆盖不完整

**问题**: 第 4.3 节 RLS 策略定义只包含了 `players` 和 `player_skills` 两个表，但架构图中提到了 `matches` 和 `player_match_stats` 表需要 RLS 保护，这两张表的 RLS 策略未定义。

**修改建议**:
```sql
-- 需要添加 matches 表 RLS 策略
CREATE POLICY "Allow anonymous read matches" ON matches
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Deny anonymous write matches" ON matches
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- 需要添加 player_match_stats 表 RLS 策略
CREATE POLICY "Allow anonymous read player_match_stats" ON player_match_stats
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Deny anonymous write player_match_stats" ON player_match_stats
  FOR INSERT
  TO anon
  WITH CHECK (false);
```

---

##### P0 - MCP Server 认证机制不清晰

**问题**: 设计未明确 MCP Server 如何进行数据库认证。是使用 anon key 直接连接，还是使用服务端 key 后通过 RLS 过滤？

**修改建议**: 在第 3.1 节架构概览中补充说明：
```
Supabase MCP Server 认证流程:
1. MCP Server 使用环境变量中的 SUPABASE_ANON_KEY 连接数据库
2. 所有查询在 anon 上下文中执行
3. RLS 策略在数据库服务端强制执行
4. 不使用 service_role key，避免权限提升风险
```

---

##### P1 - 敏感字段清洗与实际表不匹配

**问题**: 第 4.5 节示例中过滤 `password`, `email`, `phone`, `auth_token` 字段，但本项目使用匿名认证，`players` 表不包含这些字段。

**修改建议**: 更新 `sanitizePlayerData` 函数以匹配实际表结构：
```typescript
export function sanitizePlayerData(data: any): any {
  // 根据本项目实际表结构调整
  const sanitized = { ...data };

  // 如有其他敏感字段（如未来添加），在此添加
  // 例如：delete sanitized.internal_notes;

  return sanitized;
}
```

---

#### 架构相关问题

##### P1 - 缺少容错机制

**问题**: 第 3.2.1 节 MCP Client Manager 没有实现重试逻辑、超时控制或断路器模式。

**修改建议**: 增强 MCP Client Manager：
```typescript
async callTool(
  name: string,
  args: any,
  retries: number = 3,
  timeout: number = 5000
): Promise<CallToolResult> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await Promise.race([
        this.client.callTool({ name, arguments: args }),
        new Promise((_, reject) =>
          controller.signal.addEventListener('abort', () =>
            reject(new Error(`Tool call timeout after ${timeout}ms`))
          )
        ),
      ]);

      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      lastError = error;
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }

  throw new Error(`Tool call failed after ${retries} retries: ${lastError?.message}`);
}
```

---

##### P1 - 错误处理不够健壮

**问题**: 第 6.2 节降级策略只提供了简单示例，没有明确错误分类和恢复逻辑。

**修改建议**: 添加错误分类层：
```typescript
// api/lib/errors.ts
export enum MCPErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RLS_VIOLATION = 'RLS_VIOLATION',
  UNKNOWN = 'UNKNOWN',
}

export class MCPError extends Error {
  constructor(
    public type: MCPErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export function classifyMCPError(error: unknown): MCPErrorType {
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED')) return MCPErrorType.CONNECTION_ERROR;
    if (error.message.includes('timeout')) return MCPErrorType.TIMEOUT_ERROR;
  }
  return MCPErrorType.UNKNOWN;
}
```

---

##### P1 - Vercel 冷启动风险

**问题**: 第 5.1 节提到冷启动风险，但没有明确的缓解措施。Vercel Serverless 函数有 10 秒执行限制，MCP 连接可能占用 500ms+，留给查询的时间可能不足。

**修改建议**: 添加预热机制和连接池优化：
```typescript
// 在 Vercel 函数入口处预热
let mcpManager: MCPClientManager | null = null;
let toolsCache: FunctionDeclaration[] | null = null;

// 使用全局变量复用连接（Vercel 环境中的热启动复用）
declare global {
  var __mcpManager: MCPClientManager | undefined;
  var __toolsCache: FunctionDeclaration[] | undefined;
}

async function initMCPManager() {
  // 复用全局实例
  if (global.__mcpManager) {
    mcpManager = global.__mcpManager;
    toolsCache = global.__toolsCache;
    return mcpManager;
  }

  const projectId = process.env.SUPABASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('SUPABASE_PROJECT_ID not configured');
  }

  mcpManager = MCPClientManager.getInstance();
  await mcpManager.connect(projectId);

  const mcpTools = await mcpManager.getTools();
  toolsCache = mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema as any,
  }));

  // 保存到全局变量
  global.__mcpManager = mcpManager;
  global.__toolsCache = toolsCache;

  return mcpManager;
}
```

---

##### P2 - 可观测性不完整

**问题**: 第 5.4 节计划实现日志，但没有提到分布式追踪，难以跨 MCP 调用链追踪问题。

**修改建议**: 添加请求追踪 ID：
```typescript
// api/lib/tracer.ts
import { randomUUID } from 'crypto';

export function generateTraceId(): string {
  return randomUUID();
}

// 在每个请求中传递 traceId
export async function withTrace<T>(
  fn: (traceId: string) => Promise<T>,
  traceId?: string
): Promise<T> {
  const id = traceId || generateTraceId();
  console.log(`[${id}] Starting operation`);
  try {
    const result = await fn(id);
    console.log(`[${id}] Operation completed`);
    return result;
  } catch (error) {
    console.error(`[${id}] Operation failed`, error);
    throw error;
  }
}
```

---

#### 其他建议

##### 建议 1 - 添加集成测试计划

在 Phase 5 验收标准中明确列出需要覆盖的测试场景：
- [ ] SQL 注入攻击测试
- [ ] RLS 权限边界测试
- [ ] MCP Server 故障降级测试
- [ ] 超时和重试机制测试
- [ ] 并发请求测试

---

##### 建议 2 - 明确降级策略的触发条件

第 6.2 节降级策略没有明确何时触发降级。建议添加：
```typescript
// 配置降级阈值
const DEGRADATION_THRESHOLDS = {
  mcpFailureRate: 0.1,      // 失败率超过 10% 降级
  consecutiveFailures: 3,   // 连续失败 3 次降级
  responseTimeP95: 3000,     // P95 超过 3s 降级
};

// 监控和自动降级逻辑
class DegradationMonitor {
  private failures = 0;
  private lastFailureTime = 0;

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  shouldDegrade(): boolean {
    return this.failures >= DEGRADATION_THRESHOLDS.consecutiveFailures;
  }

  reset() {
    this.failures = 0;
  }
}
```

---

### 8.2 审核状态

**状态**: ❌ **需要修改**

**原因**: 存在 P0 级别安全问题（RLS 策略不完整、MCP 认证不清晰），需要在实施前补充完善。

**下一步**: 设计负责人应更新设计文档，解决上述问题后可重新提交审核。

---

**文档版本**: 1.1
**最后更新**: 2026-03-11
**审核人**: Claude (AI Code Review)
**状态**: review_completed - needs_modifications
