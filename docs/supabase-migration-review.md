# Supabase 迁移方案审核报告

> 审核日期: 2026-03-04
> 审核人: Technical Review Agent
> 方案版本: 1.0.0

---

## 评分总览

| 评估维度 | 评分 | 等级 | 说明 |
|---------|------|------|------|
| 架构合理性 | 4/5 | 良好 | 分层设计清晰，但缓存策略和批量操作需优化 |
| 安全性 | 3/5 | 一般 | RLS 策略存在安全隐患，认证方案需加强 |
| 性能考量 | 3/5 | 一般 | 有基础优化，但缺少查询缓存和批量处理 |
| 迁移风险 | 3/5 | 一般 | 有回滚机制，但冲突处理和错误恢复不完善 |
| 扩展性 | 4/5 | 良好 | 适配器模式设计良好，易于扩展 |

**综合评分: 3.4/5 (中等到良好)**

---

## 问题列表（按优先级排序）

### 🔴 高优先级问题

#### 1. RLS 策略安全隐患 - user_profiles 表
**位置**: 第 343-353 行

**问题描述**:
```sql
CREATE POLICY "用户可以插入自己的配置"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

该策略允许用户直接向 `user_profiles` 表插入数据，但该表的插入应该由触发器 `handle_new_user` 自动完成。用户手动插入可能绕过业务逻辑，导致数据不一致。

**风险**: 数据完整性受损，可能出现重复配置或不完整配置。

**建议**: 移除 INSERT 策略，或改为使用 SECURITY DEFINER 函数。

**优先级**: 🔴 高

---

#### 2. sync_status 表冲突解决机制缺失
**位置**: 第 259-276 行

**问题描述**:
`sync_status` 表定义了 `conflict` 状态，但没有相应的冲突解决策略。代码中（第 1331-1424 行）的 `OfflineSyncService` 只记录变更，没有处理当本地和云端同时修改同一记录时的冲突。

**风险**: 离线编辑可能导致数据覆盖，用户数据丢失。

**建议**:
- 添加冲突检测逻辑（比较版本号或时间戳）
- 实现冲突解决策略（以最新为准、用户选择、字段合并）
- 在 UI 中提示用户冲突，允许手动解决

**优先级**: 🔴 高

---

#### 3. 数据迁移失败回滚不完整
**位置**: 第 1170-1192 行，第 1285-1288 行

**问题描述**:
```typescript
async migrateToSupabase(userId: string, data: MigrationData): Promise<MigrationResult> {
  const batch = new SupabaseMigrationBatch(this.supabase, userId);
  try {
    const playerResults = await batch.migratePlayers(data.players);
    const skillResults = await batch.migrateSkills(data.skills);
    const historyResults = await batch.migrateHistory(data.groupingHistory);
    return { success: true, playersMigrated: playerResults.length };
  } catch (error) {
    await batch.rollback();
    throw error;
  }
}
```

如果在 `migrateSkills` 或 `migrateHistory` 阶段失败，`migratedPlayerIds` 中的球员会被删除，但本地数据已经导出。如果此时用户重试，本地数据可能丢失（已被删除）。

**风险**: 迁移失败可能导致本地数据丢失。

**建议**:
- 在迁移前创建完整本地备份
- 实现分阶段验证和确认机制
- 添加迁移恢复功能（记录迁移进度）
- 考虑使用数据库事务保证原子性

**优先级**: 🔴 高

---

#### 4. 离线同步队列无持久化保障
**位置**: 第 1363-1366 行

**问题描述**:
```typescript
async recordOfflineChange(operation: SyncOperation): Promise<void> {
  this.syncQueue.push(operation);
  await this.localDb.insert('sync_queue', operation);
}
```

操作同时存储在内存队列和 IndexedDB，但没有处理两者不一致的情况。如果页面刷新，内存队列会丢失，只依赖 IndexedDB。但同步时使用的是内存队列，可能导致某些操作被漏同步。

**风险**: 离线变更可能丢失或重复同步。

**建议**:
- 只使用 IndexedDB 作为同步队列
- 同步时从 IndexedDB 读取操作
- 添加操作去重机制

**优先级**: 🔴 高

---

#### 5. 批量操作缺少事务支持
**位置**: 第 1219-1283 行

**问题描述**:
批量迁移操作使用循环逐批插入，没有使用数据库事务。如果某批次插入失败，已插入的批次无法回滚。

**风险**: 数据不一致，可能导致部分数据迁移成功但整体失败。

**建议**:
- 使用 Supabase RPC 或自定义函数实现批量事务
- 每个批次作为一个事务单元
- 添加分批次验证机制

**优先级**: 🔴 高

---

### 🟡 中优先级问题

#### 6. players 表缺少必要的复合索引
**位置**: 第 156-183 行

**问题描述**:
常见查询模式（如"按位置查询活跃球员"）缺少对应的复合索引：
```sql
CREATE INDEX idx_players_position ON public.players(user_id, position);
CREATE INDEX idx_players_is_active ON public.players(user_id, is_active);
```

但查询经常同时按 `user_id`, `position`, `is_active` 过滤，需要复合索引。

**影响**: 查询性能下降，尤其是球员数量较多时。

**建议**:
```sql
CREATE INDEX idx_players_user_position_active
  ON public.players(user_id, is_active, position);
CREATE INDEX idx_players_user_name_active
  ON public.players(user_id, is_active) WHERE is_active = TRUE;
```

**优先级**: 🟡 中

---

#### 7. SupabaseAdapter 缓存策略简陋
**位置**: 第 742-749 行

**问题描述**:
```typescript
private cache: Map<string, { data: any; timestamp: number }>;
private cacheTTL = 30000; // 30秒
```

内存缓存的问题：
1. 页面刷新后缓存丢失
2. 多标签页之间缓存不共享
3. 没有缓存失效策略（除插入/更新时全表清空）
4. 没有缓存命中率监控

**影响**: 缓存效果有限，可能反而增加内存占用。

**建议**:
- 使用 IndexedDB 作为持久化缓存层
- 实现基于订阅的缓存失效（Supabase Realtime）
- 添加缓存统计和监控

**优先级**: 🟡 中

---

#### 8. 错误重试机制缺失
**位置**: 第 750-787 行

**问题描述**:
网络请求没有自动重试机制，在网络不稳定环境下容易出现失败。

**建议**:
- 实现指数退避重试策略
- 区分可重试错误（网络超时）和不可重试错误（权限错误）
- 添加请求队列和并发控制

**优先级**: 🟡 中

---

#### 9. 认证状态检查不完整
**位置**: 第 527-551 行

**问题描述**:
认证流程图显示会检查本地 Token，但没有考虑 Token 过期的情况。Token 过期后需要刷新，但流程中没有明确。

**建议**:
- 实现 Token 自动刷新逻辑
- 添加 Token 过期预检
- 处理刷新失败的降级方案

**优先级**: 🟡 中

---

#### 10. 分组历史表 data 字段类型风险
**位置**: 第 238 行

**问题描述**:
```sql
data JSONB NOT NULL,  -- 使用 JSONB 替代 TEXT
```

从 SQLite 的 TEXT JSON 字符串迁移到 PostgreSQL 的 JSONB 是正确的，但需要确保迁移时的数据转换逻辑能正确处理可能的 JSON 格式错误。

**建议**:
- 在迁移时添加 JSON 格式验证
- 对解析失败的记录提供修复机制
- 考虑添加 JSON Schema 验证

**优先级**: 🟡 中

---

### 🟢 低优先级问题

#### 11. 缺少数据库连接池配置
**位置**: 无

**问题描述**:
Supabase 客户端初始化（第 747 行）没有配置连接池相关参数，可能影响高并发场景性能。

**建议**:
- 添加 Supabase 客户端配置选项
- 考虑使用 Service Role 进行批量操作

**优先级**: 🟢 低

---

#### 12. 缺少数据导入验证
**位置**: 第 6.2 节

**问题描述**:
迁移数据结构定义了接口，但没有数据验证逻辑。如果本地数据损坏或格式不正确，可能导致迁移失败或数据污染。

**建议**:
- 使用 Zod 或类似库进行运行时验证
- 添加数据清理逻辑
- 记录验证失败的记录供用户修复

**优先级**: 🟢 低

---

#### 13. 缺少用户数据删除验证
**位置**: 第 347-353 行

**问题描述**:
允许用户删除自己的配置，但没有考虑删除验证（如确认对话框）和不可逆操作的提示。

**建议**:
- 添加删除确认机制
- 实现软删除（添加 `deleted_at` 字段）
- 提供数据恢复窗口期

**优先级**: 🟢 低

---

#### 14. 匿名用户升级逻辑不完整
**位置**: 第 614-631 行

**问题描述**:
`GuestModeService` 定义了 `upgradeToRegisteredUser` 方法，但没有详细说明如何处理游客数据与注册账户的合并。

**建议**:
- 明确数据迁移策略
- 处理可能的 ID 冲突
- 提供数据选择界面

**优先级**: 🟢 低

---

## 改进建议

### 架构层面

#### 1. 引入缓存抽象层
```typescript
interface ICacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}
```

#### 2. 添加领域事件系统
```typescript
interface DomainEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

class EventBus {
  publish(event: DomainEvent): void;
  subscribe(type: string, handler: (event: DomainEvent) => void): () => void;
}
```

#### 3. 实现统一的错误处理
```typescript
class ErrorHandler {
  handle(error: Error, context: ErrorContext): void;
  classify(error: Error): ErrorType;
}
```

---

### 安全性层面

#### 1. 增强 RLS 策略
```sql
-- 使用 SECURITY DEFINER 函数处理敏感操作
CREATE OR REPLACE FUNCTION public.update_player_skills(
  p_player_id TEXT,
  p_skills JSONB
) RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.player_skills
  SET skills = p_skills, version = version + 1, updated_at = NOW()
  WHERE player_id = p_player_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;
```

#### 2. 添加审计日志表
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 性能层面

#### 1. 实现查询结果缓存
```typescript
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; hash: string }>();

  async query<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // 实现基于 Hash 的缓存验证
  }
}
```

#### 2. 添加分页支持
```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

### 迁移层面

#### 1. 实现分阶段迁移确认
```typescript
class MigrationService {
  async prepareMigration(data: MigrationData): Promise<MigrationPlan> {
    // 分析数据，生成迁移计划
  }

  async executePlan(plan: MigrationPlan): Promise<MigrationResult> {
    // 按计划执行迁移
  }
}
```

#### 2. 添加数据验证工具
```typescript
class DataValidator {
  validate(data: any, schema: Schema): ValidationResult;
  clean(data: any, schema: Schema): any;
}
```

---

### 用户体验层面

#### 1. 实现迁移进度显示
```typescript
interface MigrationProgress {
  stage: MigrationStage;
  current: number;
  total: number;
  estimatedTimeRemaining: number;
  errors: MigrationError[];
}
```

#### 2. 添加数据对比功能
```typescript
class DataDiffViewer {
  compare(local: any, remote: any): DiffResult;
  render(diff: DiffResult): Component;
}
```

---

## 实施优先级建议

### P0 - 必须修复
1. RLS 策略安全隐患
2. 同步冲突解决机制
3. 迁移失败回滚保护
4. 离线同步队列持久化
5. 批量操作事务支持

### P1 - 强烈建议
6. 复合索引优化
7. 缓存策略改进
8. 错误重试机制
9. Token 刷新逻辑
10. JSON 迁移验证

### P2 - 可以延后
11. 连接池配置
12. 数据导入验证
13. 删除确认机制
14. 匿名用户升级

---

## 总结

### 设计优点
1. **分层架构清晰**: Repository 模式和适配器抽象设计良好
2. **降级方案完备**: 保留了本地存储作为后备方案
3. **安全性考虑周全**: RLS 策略基本覆盖，但需完善
4. **扩展性良好**: 接口抽象设计合理，易于扩展

### 主要问题
1. **高优先级问题较多**: 5 个高优先级问题需要立即解决
2. **冲突处理缺失**: 离线同步没有完善的冲突解决策略
3. **事务支持不足**: 批量操作缺少原子性保证
4. **缓存策略简陋**: 内存缓存效果有限

### 建议
建议在实施迁移前优先解决高优先级问题，特别是：
1. 修复 RLS 策略安全隐患
2. 实现完善的冲突解决机制
3. 添加迁移失败保护措施

中等优先级问题可以在迁移后逐步优化。

---

**审核完成时间**: 2026-03-04
**审核结论**: 方案基础扎实，但存在部分关键问题，建议修复高优先级问题后再进行实施。
