# Phase 4: 数据迁移（SQLite → Supabase）

## 概述

Phase 4 实现了从本地 SQLite 到 Supabase 的数据迁移功能，包括：

### 文件结构

```
src/migration/
├── migrate-to-supabase.ts    # 主迁移脚本
├── migration-progress.ts     # 进度跟踪
├── rollback.ts              # 回滚工具
├── index.ts                 # 统一导出
└── __tests__/
    └── migration.test.ts    # 测试文件

src/components/
└── MigrationWizard.tsx      # 迁移向导 UI
```

### 核心功能

1. **迁移脚本** (`src/migration/migrate-to-supabase.ts`)
   - 读取本地 SQLite 数据（players, player_skills, grouping_history）
   - 通过 SupabaseRepository 写入到云端
   - 批量处理和错误重试
   - 进度跟踪和备份

2. **迁移 UI** (`src/components/MigrationWizard.tsx`)
   - 显示迁移进度（已迁移/总数）
   - 支持回滚操作
   - 显示错误详情
   - 迁移完成后显示结果

3. **测试用例** (`src/migration/__tests__/migration.test.ts`)
   - 数据完整性测试
   - 迁移正确性测试
   - 回滚功能测试
   - 进度跟踪测试

## 使用方式

### 1. 使用迁移向导 UI（推荐）

```tsx
import { MigrationWizard } from '@/migration';

function App() {
  return <MigrationWizard />;
}
```

### 2. 使用 API 编程方式

```typescript
import { migrationManager, rollbackManager } from '@/migration';

// 完整迁移
const result = await migrationManager.migrateAll();
console.log('球员迁移:', result.players);
console.log('分组历史迁移:', result.groupingHistory);

// 仅迁移球员
const playersResult = await migrationManager.migratePlayers();

// 仅迁移分组历史
const groupingResult = await migrationManager.migrateGroupingHistory();

// 回滚
const rollbackResult = await rollbackManager.rollback('players');
```

### 3. 使用快捷函数

```typescript
import { quickMigrate, quickRollback, getMigrationStatus } from '@/migration';

// 快速迁移
const result = await quickMigrate();

// 快速回滚
const rollbackResult = await quickRollback('players');

// 获取状态
const status = getMigrationStatus();
console.log('球员进度:', status.players?.migrated);
```

## API 参考

### MigrationManager 类

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `migrateAll()` | - | `Promise<{players, groupingHistory}>` | 执行完整迁移（球员 + 分组） |
| `migratePlayers()` | `backupId?: string` | `Promise<MigrationResult>` | 仅迁移球员 |
| `migrateGroupingHistory()` | `backupId?: string` | `Promise<MigrationResult>` | 仅迁移分组历史 |
| `verifyMigration()` | - | `Promise<VerificationResult>` | 验证迁移结果 |

#### 类型定义

```typescript
// 迁移配置
interface MigrationConfig {
  batchSize: number;        // 批量处理大小（默认 10）
  retryAttempts: number;    // 重试次数（默认 3）
  retryDelay: number;       // 重试延迟 ms（默认 1000）
  createBackup: boolean;    // 是否创建备份（默认 true）
}

// 迁移结果
interface MigrationResult {
  success: boolean;
  type: 'players' | 'grouping_history';
  total: number;
  migrated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;  // 毫秒
  backupId?: string;
}
```

## 迁移流程

```
┌─────────────────┐
│  检查前置条件    │
│  - 认证状态      │
│  - 数据库初始化  │
│  - 网络连接      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  创建 SQLite    │
│  备份           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  迁移球员数据    │
│  - 批量读取      │
│  - 格式转换      │
│  - 批量写入      │
│  - 错误重试      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  迁移分组历史    │
│  - 批量读取      │
│  - 格式转换      │
│  - 批量写入      │
│  - 错误重试      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  验证迁移结果    │
│  - 数量对比      │
│  - 数据完整性    │
└────────┬────────┘
         │
         ▼
   ✅ 迁移完成
```

## 回滚机制

### 自动回滚

如果迁移过程中发生错误，系统会自动回滚到迁移前的状态。

### 手动回滚

```typescript
// 回滚球员数据
await rollbackManager.rollback('players');

// 回滚分组历史
await rollbackManager.rollback('grouping_history');

// 指定备份 ID 回滚
await rollbackManager.rollback('players', 'backup-123');
```

## 进度跟踪

```typescript
import { migrationProgress } from '@/migration';

// 初始化进度
migrationProgress.startMigration('players', 100);

// 更新进度
migrationProgress.updateProgress('players', 50);

// 记录错误
migrationProgress.recordError('players', 'player-123', '网络错误');

// 完成迁移
migrationProgress.completeMigration('players');

// 获取进度
const progress = migrationProgress.getProgress('players');
console.log('进度:', progress.migrated, '/', progress.total);
```

## 测试

```bash
# 运行迁移测试
npm test migration

# 测试覆盖
- 数据完整性测试
- 迁移正确性测试
- 回滚功能测试
- 进度跟踪测试
```

## 注意事项

1. **网络要求**：迁移到 Supabase 需要网络连接
2. **认证要求**：需要先完成 Supabase 匿名认证
3. **数据备份**：迁移前会自动备份 SQLite 数据
4. **保留原数据**：SQLite 数据不会被删除，作为备份保留
5. **错误重试**：网络错误会自动重试 3 次
6. **批量处理**：默认每批处理 10 条记录，避免请求过快

## 示例场景

### 场景 1: 首次迁移

```tsx
import { MigrationWizard } from '@/migration';

function FirstTimeMigration() {
  return <MigrationWizard />;
}
```

### 场景 2: 断点续传

```typescript
// 获取当前进度
const status = getMigrationStatus();

if (status.players?.status === 'failed') {
  // 重试球员迁移
  await migrationManager.migratePlayers();
}

if (status.groupingHistory?.status === 'failed') {
  // 重试分组历史迁移
  await migrationManager.migrateGroupingHistory();
}
```

### 场景 3: 自定义配置

```typescript
import { MigrationManager } from '@/migration';

const customMigration = new MigrationManager({
  batchSize: 20,        // 批量处理大小
  retryAttempts: 5,     // 重试次数
  retryDelay: 2000,     // 重试延迟 ms
  createBackup: true,   // 是否创建备份
});

const result = await customMigration.migrateAll();
```

## 完成状态

✅ **Phase 4 已完成**

- ✅ 迁移脚本实现
- ✅ UI 组件实现
- ✅ 测试用例
- ✅ 文档完善
- ✅ 进度跟踪
- ✅ 回滚机制

## 下一步

Phase 4 完成后，可以继续：

- **Phase 5**: 完善 Repository 实现（错误处理、重试机制）
- **Phase 6**: 实现数据同步工具（双向同步）
- **Phase 7**: 添加 React Hook（usePlayer, useGrouping）
- **Phase 8**: 编写测试用例（Repository 测试）
- **Phase 9**: 完善文档（用户手册）
- **Phase 10**: 部署配置（环境变量、监控）

## 相关文档

- [迁移工具 README](../src/migration/README.md)
- [使用示例](../src/examples/migration-example.tsx)
- [Supabase 集成方案设计](./supabase-planning.md)
