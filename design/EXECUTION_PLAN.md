# SQLite 迁移分步执行计划

> 创建时间: 2026-03-03
> 执行方式: 双 Agent 协作（开发 + 测试）

---

## 📋 执行概览

### 总体时间
- **预计总时间**: 6.5-7.5 小时
- **阶段数量**: 10 个阶段（Phase 0-10）

### 协作模式
```
开发 Agent
    ↓ 完成 Phase N
写入状态文件
    ↓
测试 Agent
    ↓ 检测状态，执行测试
写入测试结果
    ↓
开发 Agent
    ↓ 检测测试结果
如果通过 → 继续 Phase N+1
如果失败 → 修复并重测
    ↓
飞书同步进度
```

---

## 📊 Phase 详情

### Phase 0: 备份和准备（30 分钟）
**目标**: 创建备份机制，确保数据安全

**开发任务**:
- [ ] 创建 `scripts/backup-localstorage.ts`
- [ ] 实现导出/导入 LocalStorage 功能
- [ ] 实现手动备份脚本

**测试任务**:
- [ ] 测试备份脚本可正常导出数据
- [ ] 测试导入功能可恢复数据
- [ ] 测试备份文件格式正确

**检查点**:
- `npm run backup` 命令可正常执行
- 备份文件包含所有球员数据
- 导入后数据完整无损

**状态文件**: `.sqlite-migration/phase-0-status.json`

---

### Phase 1: 安装依赖（15 分钟）
**目标**: 安装所需依赖

**开发任务**:
- [ ] `npm install sql.js@1.10.3 idb@8.0.0`
- [ ] `npm install --save-dev @types/sql.js@1.0.0`
- [ ] 下载 sql.js WASM 文件到 `public/wasm/`

**测试任务**:
- [ ] 验证 sql.js 可正常加载
- [ ] 验证 idb 可正常使用
- [ ] 验证 WASM 文件可正常访问

**检查点**:
- `npm list sql.js idb` 显示正确版本
- `public/wasm/sql-wasm.wasm` 文件存在
- 浏览器控制台无加载错误

**状态文件**: `.sqlite-migration/phase-1-status.json`

---

### Phase 2: 创建类型定义（30 分钟）
**目标**: 创建完整的类型系统

**开发任务**:
- [ ] 创建 `src/types/database.ts`
- [ ] 定义 DatabaseConfig, MigrationStatus 等类型
- [ ] 定义数据库行类型（PlayerRow, SkillRow 等）
- [ ] 定义备份和迁移相关类型

**测试任务**:
- [ ] TypeScript 编译无错误
- [ ] 类型导出正确
- [ ] 类型推断正常

**检查点**:
- `npm run build` 编译成功
- 可从其他文件导入类型
- 无 TypeScript 错误

**状态文件**: `.sqlite-migration/phase-2-status.json`

---

### Phase 3: 创建备份恢复工具（45 分钟）
**目标**: 实现数据安全保障

**开发任务**:
- [ ] 创建 `src/utils/backup.ts`
- [ ] 实现 BackupManager 类
- [ ] 实现 createBackup() 方法
- [ ] 实现 restoreFromBackup() 方法
- [ ] 实现 listBackups() 和 deleteBackup()

**测试任务**:
- [ ] 测试创建备份功能
- [ ] 测试恢复备份功能
- [ ] 测试备份列表功能
- [ ] 测试删除备份功能
- [ ] 测试自动备份机制

**检查点**:
- 可创建和恢复备份
- 备份存储在 IndexedDB
- 最多保留 5 个备份
- 自动备份功能正常

**状态文件**: `.sqlite-migration/phase-3-status.json`

---

### Phase 4: 创建核心服务（60 分钟）
**目标**: 实现数据库服务

**开发任务**:
- [ ] 创建 `src/services/database.ts`
- [ ] 实现 DatabaseService 类
- [ ] 实现 init() 方法（含降级方案）
- [ ] 实现 createTables() 方法
- [ ] 实现 CRUD 操作方法
- [ ] 实现 save() 方法（防抖优化）

**测试任务**:
- [ ] 测试数据库初始化
- [ ] 测试表创建
- [ ] 测试 CRUD 操作
- [ ] 测试持久化（刷新后数据不丢失）
- [ ] 测试降级方案

**检查点**:
- 数据库可正常初始化
- 所有 CRUD 操作正常
- 刷新页面数据持久化
- SQLite 失败可降级到 LocalStorage

**状态文件**: `.sqlite-migration/phase-4-status.json`

---

### Phase 5: 创建 Repository（60 分钟）
**目标**: 实现数据访问层

**开发任务**:
- [ ] 创建 `src/repositories/player.repository.ts`
- [ ] 创建 `src/repositories/grouping.repository.ts`
- [ ] 实现 PlayerRepository 的所有方法
- [ ] 实现 GroupingRepository 的所有方法

**测试任务**:
- [ ] 测试 PlayerRepository.findAll()
- [ ] 测试 PlayerRepository.create()
- [ ] 测试 PlayerRepository.update()
- [ ] 测试 PlayerRepository.delete()
- [ ] 测试 GroupingRepository.save()
- [ ] 测试 GroupingRepository.getRecent()

**检查点**:
- 所有 Repository 方法正常工作
- 数据映射正确
- 错误处理完善
- 测试覆盖率 > 80%

**状态文件**: `.sqlite-migration/phase-5-status.json`

---

### Phase 6: 创建迁移工具（45 分钟）
**目标**: 实现自动迁移功能

**开发任务**:
- [ ] 创建 `src/utils/migration-v2.ts`
- [ ] 实现 migrateFromLocalStorage()
- [ ] 实现自动备份机制
- [ ] 实现验证机制
- [ ] 实现回滚机制

**测试任务**:
- [ ] 测试迁移流程（空数据）
- [ ] 测试迁移流程（有数据）
- [ ] 测试迁移验证
- [ ] 测试回滚功能
- [ ] 测试多次迁移（幂等性）

**检查点**:
- 迁移自动执行
- 迁移后数据完整
- 迁移可回滚
- 迁移是幂等的

**状态文件**: `.sqlite-migration/phase-6-status.json`

---

### Phase 7: 修改 Hook（45 分钟）
**目标**: 更新 React Hook

**开发任务**:
- [ ] 修改 `src/hooks/usePlayerManager.ts`
- [ ] 替换状态管理为 Repository 调用
- [ ] 添加异步支持
- [ ] 添加错误处理
- [ ] 添加迁移初始化逻辑

**测试任务**:
- [ ] 测试添加球员
- [ ] 测试编辑球员
- [ ] 测试删除球员
- [ ] 测试刷新后数据持久化
- [ ] 测试错误处理

**检查点**:
- 所有 Hook 功能正常
- 数据持久化正常
- 错误提示正确
- 现有功能无回归

**状态文件**: `.sqlite-migration/phase-7-status.json`

---

### Phase 8: 测试和验证（90 分钟）
**目标**: 全面测试

**开发任务**:
- [ ] 创建单元测试文件
- [ ] 创建集成测试文件
- [ ] 创建 E2E 测试场景

**测试任务**:
- [ ] 运行所有单元测试
- [ ] 运行所有集成测试
- [ ] 执行性能测试
- [ ] 执行兼容性测试
- [ ] 执行数据迁移测试

**检查点**:
- 所有测试通过
- 性能指标达标（加载<3s, 保存<500ms, 查询<100ms）
- 兼容性测试通过
- 数据迁移无丢失

**状态文件**: `.sqlite-migration/phase-8-status.json`

---

### Phase 9: 更新文档（30 分钟）
**目标**: 更新项目文档

**开发任务**:
- [ ] 更新 README.md
- [ ] 添加数据库架构说明
- [ ] 添加迁移指南
- [ ] 添加 API 文档

**测试任务**:
- [ ] 验证文档准确性
- [ ] 验证示例代码可运行

**检查点**:
- 文档清晰完整
- 示例代码正确

**状态文件**: `.sqlite-migration/phase-9-status.json`

---

### Phase 10: 部署和监控（30 分钟）
**目标**: 部署到生产环境

**开发任务**:
- [ ] 构建生产版本
- [ ] 部署到 GitHub Pages
- [ ] 添加错误监控

**测试任务**:
- [ ] 测试生产环境功能
- [ ] 测试数据迁移
- [ ] 测试回滚流程

**检查点**:
- 生产环境正常
- 迁移流程顺畅
- 监控正常工作

**状态文件**: `.sqlite-migration/phase-10-status.json`

---

## 📂 状态文件格式

每个 Phase 完成后，开发 Agent 写入状态文件：

```json
{
  "phase": 0,
  "status": "done",
  "completedAt": "2026-03-03T10:50:00Z",
  "tasks": {
    "backup-script": "done",
    "import-export": "done",
    "manual-backup": "done"
  },
  "files": [
    "scripts/backup-localstorage.ts"
  ]
}
```

测试 Agent 写入测试结果：

```json
{
  "phase": 0,
  "testStatus": "passed",
  "testedAt": "2026-03-03T10:55:00Z",
  "results": {
    "backup-export": "passed",
    "backup-import": "passed",
    "file-format": "passed"
  },
  "issues": []
}
```

如果测试失败：

```json
{
  "phase": 0,
  "testStatus": "failed",
  "testedAt": "2026-03-03T10:55:00Z",
  "results": {
    "backup-export": "passed",
    "backup-import": "failed",
    "file-format": "skipped"
  },
  "issues": [
    {
      "task": "backup-import",
      "error": "导入后数据缺失字段",
      "file": "scripts/backup-localstorage.ts",
      "line": 45
    }
  ]
}
```

---

## 🔄 Agent 协作流程

### 开发 Agent 工作流程
1. 读取当前 Phase 状态
2. 如果上一 Phase 测试未通过，修复问题
3. 如果上一 Phase 已通过，开始当前 Phase
4. 完成所有任务
5. 写入状态文件
6. 通知测试 Agent
7. 等待测试结果
8. 如果测试失败，修复并重试
9. 如果测试通过，进入下一 Phase

### 测试 Agent 工作流程
1. 监控状态文件变化
2. 检测到新 Phase 完成通知
3. 读取该 Phase 的开发任务
4. 执行测试用例
5. 写入测试结果
6. 通知开发 Agent
7. 如果测试失败，等待修复并重测

### 通知机制
使用飞书作为通知渠道：
- 开发 Agent: "✅ Phase N 开发完成，等待测试"
- 测试 Agent: "✅ Phase N 测试通过" 或 "❌ Phase N 测试失败，发现 X 个问题"

---

## 🎯 成功标准

- 所有 10 个 Phase 开发完成
- 所有测试通过
- 性能指标达标
- 兼容性测试通过
- 数据迁移无丢失
- 文档更新完整
- 生产环境部署成功

---

*执行计划创建时间: 2026-03-03*
*预计完成时间: 6.5-7.5 小时*
