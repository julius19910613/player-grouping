# Supabase MCP 集成方案

## 目标
让聊天机器人能够查询后台录入的球员和比赛数据，而不是搜索公开信息。

## 当前状态
- ✅ Supabase MCP 已配置并测试通过
- ✅ 可以通过 mcporter 查询数据库
- ✅ 测试查询"骚当"成功

## 实施方案

### 架构设计

```
用户提问 → Gemini API → Function Calling
                            ↓
                    检测到需要查询球员
                            ↓
                调用 search_players 工具
                            ↓
            后端执行 SQL 查询（通过 Supabase MCP）
                            ↓
                返回球员数据给 Gemini
                            ↓
                    Gemini 生成回答
```

### 新增工具定义

#### 1. `search_players` - 搜索球员
```typescript
{
  name: "search_players",
  description: "搜索后台录入的球员信息，包括技能数据",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "球员姓名或昵称（支持模糊匹配）"
      }
    },
    required: ["query"]
  }
}
```

#### 2. `get_match_history` - 查询比赛历史
```typescript
{
  name: "get_match_history",
  description: "查询比赛历史记录",
  parameters: {
    type: "object",
    properties: {
      player_name: {
        type: "string",
        description: "球员姓名（可选）"
      },
      limit: {
        type: "number",
        description: "返回记录数量（默认 10）"
      }
    }
  }
}
```

#### 3. `get_player_stats` - 获取球员比赛统计
```typescript
{
  name: "get_player_stats",
  description: "获取球员在比赛中的表现统计",
  parameters: {
    type: "object",
    properties: {
      player_name: {
        type: "string",
        description: "球员姓名"
      },
      match_id: {
        type: "string",
        description: "比赛 ID（可选，不提供则返回所有比赛）"
      }
    },
    required: ["player_name"]
  }
}
```

### 实施步骤

#### Phase 1: 创建查询工具（30分钟）
1. 创建 `src/lib/tools/supabase-tools.ts`
2. 实现查询函数：
   - `searchPlayers(query: string)`
   - `getMatchHistory(playerName?: string, limit?: number)`
   - `getPlayerStats(playerName: string, matchId?: string)`

#### Phase 2: 更新工具定义（15分钟）
1. 在 `src/lib/tools/index.ts` 添加新工具
2. 更新 `src/lib/tools/executor.ts` 添加执行逻辑
3. 移除或降级 `search_web` 工具

#### Phase 3: 集成到后端（30分钟）
1. 在 `api/chat.ts` 添加 Supabase MCP 调用
2. 使用 `child_process` 执行 mcporter 命令
3. 解析返回结果并格式化

#### Phase 4: 测试（30分钟）
1. 测试搜索"骚当"
2. 测试查询比赛历史
3. 测试多轮对话

### 技术细节

#### Supabase MCP 调用方式

**方式 A: 通过 mcporter CLI（推荐）**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function searchPlayers(query: string) {
  const sql = `SELECT p.name, p.position, ps.*
    FROM players p
    LEFT JOIN player_skills ps ON p.id = ps.player_id
    WHERE p.name ILIKE '%${query}%'
    LIMIT 10;`;
  
  const { stdout } = await execAsync(
    `mcporter call supabase-player-grouping.execute_sql ` +
    `project_id=saeplsevqechdnlkwjyz ` +
    `query="${sql}" --output json`
  );
  
  const result = JSON.parse(stdout);
  // 解析并返回数据
}
```

**优势**:
- ✅ 简单直接
- ✅ 无需额外依赖
- ✅ 利用现有的 MCP 配置

**劣势**:
- ⚠️ 需要在生产环境安装 mcporter
- ⚠️ 进程调用有开销

#### 方式 B: 直接使用 Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function searchPlayers(query: string) {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      player_skills (*)
    `)
    .ilike('name', `%${query}%`);
  
  return data;
}
```

**优势**:
- ✅ 更高效（直接查询）
- ✅ 无需额外工具
- ✅ 类型安全

**劣势**:
- ⚠️ 需要处理 RLS（Row Level Security）
- ⚠️ 需要配置 user_id

### 推荐方案

**混合方案**:
1. **开发阶段**: 使用 mcporter CLI（快速验证）
2. **生产阶段**: 迁移到 Supabase Client（性能优化）

### 文件结构

```
src/lib/tools/
├── index.ts              # 工具定义
├── executor.ts           # 工具执行器
├── supabase-tools.ts     # Supabase 查询工具（新增）
└── brave-search.ts       # Brave Search（保留，可选）

api/
└── chat.ts               # 后端 API（更新）
```

### 时间估算

- Phase 1: 创建查询工具 - 30分钟
- Phase 2: 更新工具定义 - 15分钟
- Phase 3: 集成到后端 - 30分钟
- Phase 4: 测试 - 30分钟
- **总计**: 1.5-2小时

### 成功标准

- [ ] 可以搜索球员（如"骚当"）
- [ ] 返回球员技能数据
- [ ] 可以查询比赛历史
- [ ] 可以查询球员比赛统计
- [ ] 多轮对话正常
- [ ] 前端 UI 正常显示

### 下一步

1. **用户确认**: 同意此方案？
2. **选择实施方式**: mcporter CLI vs Supabase Client？
3. **开始开发**: 使用 Claude Code agent

---

**创建时间**: 2026-03-08 22:00
**状态**: 待用户确认
