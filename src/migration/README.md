# 数据迁移工具

> 将 SQLite 数据迁移到 Supabase 云端存储

## 📁 文件结构

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

## 🚀 快速开始

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

## 📊 迁移流程

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

## ⚙️ 配置选项

```typescript
import { MigrationManager } from '@/migration';

const customMigration = new MigrationManager({
  batchSize: 20,        // 批量处理大小（默认 10）
  retryAttempts: 5,     // 重试次数（默认 3）
  retryDelay: 2000,     // 重试延迟 ms（默认 1000）
  createBackup: true,   // 是否创建备份（默认 true）
});

const result = await customMigration.migrateAll();
```

## 🔄 回滚机制

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

### 备份管理

```typescript
// 创建备份
const backupId = await rollbackManager.createBackup('手动备份');

// 列出所有备份
const backups = await rollbackManager.listBackups();

// 删除备份
await rollbackManager.deleteBackup('backup-123');
```

## 📈 进度跟踪

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

// 获取摘要
const summary = migrationProgress.getSummary();
console.log('球员迁移:', summary.players);
console.log('分组历史迁移:', summary.groupingHistory);
console.log('是否有运行中的迁移:', summary.hasRunningMigration);
```

## ✅ 测试

```bash
# 运行迁移测试
npm test migration

# 运行特定测试
npm test migration/__tests__/migration.test.ts
```

### 测试覆盖

- ✅ 数据完整性测试
  - 保留所有球员数据
  - 保留所有分组历史数据
  - 正确处理 skills 的所有字段

- ✅ 迁移正确性测试
  - 正确转换数据格式
  - 正确处理空数据
  - 正确处理错误情况

- ✅ 回滚功能测试
  - 能够创建备份
  - 能够从备份恢复
  - 正确更新迁移进度状态
  - 正确记录迁移错误

- ✅ 进度跟踪测试
  - 正确计算百分比
  - 检测是否有运行中的迁移
  - 正确获取迁移摘要

## 🛡️ 安全保障

### 数据备份

- ✅ 迁移前自动创建 SQLite 备份
- ✅ 备份存储在 IndexedDB 中
- ✅ 支持手动创建和删除备份

### 数据完整性

- ✅ 保留 SQLite 原始数据
- ✅ 验证迁移数量一致性
- ✅ 字段级别数据校验

### 错误处理

- ✅ 网络错误自动重试
- ✅ 失败自动回滚
- ✅ 详细错误日志记录

### 进度持久化

- ✅ 进度保存到 LocalStorage
- ✅ 支持断点续传
- ✅ 页面刷新后可恢复进度

## 📝 注意事项

1. **网络要求**：迁移到 Supabase 需要网络连接
2. **认证要求**：需要先完成 Supabase 匿名认证
3. **备份数据**：迁移前会自动备份 SQLite 数据
4. **保留原数据**：SQLite 数据不会被删除，作为备份保留
5. **错误重试**：网络错误会自动重试 3 次
6. **批量处理**：默认每批处理 10 条记录，避免请求过快

## 🔧 故障排除

### 迁移失败

```typescript
// 1. 检查错误详情
const progress = migrationProgress.getProgress('players');
console.log('错误列表:', progress.errors);

// 2. 重试迁移
const result = await migrationManager.migratePlayers();

// 3. 如果仍然失败，执行回滚
await rollbackManager.rollback('players');
```

### 网络问题

```typescript
// 检查网络状态
if (!navigator.onLine) {
  console.error('网络断开，请检查网络连接');
}
```

### 认证问题

```typescript
// 检查认证状态
import { getCurrentUserId } from '@/lib/auth';

const userId = await getCurrentUserId();
if (!userId) {
  console.error('未认证，请先完成匿名认证');
}
```

## 📚 相关文档

- [Supabase 集成方案设计](../../supabase-planning.md)
- [Repository 模式说明](../repositories/README.md)
- [数据库服务文档](../services/database.ts)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT
