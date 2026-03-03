# 数据库架构文档

> 更新时间: 2026-03-03
> 版本: 1.0.0

---

## 📋 概述

本项目使用 SQLite 作为主要数据存储方案，通过 sql.js (WebAssembly) 在浏览器中运行。数据库文件持久化到 IndexedDB。

### 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| 数据库引擎 | SQLite (sql.js) | 纯前端运行，无需后端 |
| 持久化 | IndexedDB | 存储数据库文件，支持 50-500MB |
| 数据访问 | Repository 模式 | 分离数据访问逻辑 |
| 备份恢复 | IndexedDB | 自动备份，支持回滚 |

---

## 🗄️ 数据库表结构

### 1. players 表（球员基本信息）

**用途**: 存储球员的基本信息

**表结构**:
```sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,                        -- 球员 ID (格式: player-{timestamp}-{random})
  name TEXT NOT NULL,                         -- 球员姓名
  position TEXT NOT NULL                      -- 篮球位置
    CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);

CREATE INDEX idx_players_position ON players(position);
```

**字段说明**:
- `id`: 唯一标识符，格式为 `player-{timestamp}-{random}`
- `position`: 篮球位置枚举
  - `PG`: 控球后卫 (Point Guard)
  - `SG`: 得分后卫 (Shooting Guard)
  - `SF`: 小前锋 (Small Forward)
  - `PF`: 大前锋 (Power Forward)
  - `C`: 中锋 (Center)
  - `UTILITY`: 万金油 (可打多个位置)

**索引**:
- `idx_players_position`: 按位置查询优化

---

### 2. player_skills 表（球员能力）

**用途**: 存储球员的详细能力评分

**表结构**:
```sql
CREATE TABLE IF NOT EXISTS player_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL UNIQUE,             -- 关联球员 ID
  
  -- 投篮能力 (1-99)
  two_point_shot INTEGER DEFAULT 50 CHECK(two_point_shot BETWEEN 1 AND 99),
  three_point_shot INTEGER DEFAULT 50 CHECK(three_point_shot BETWEEN 1 AND 99),
  free_throw INTEGER DEFAULT 50 CHECK(free_throw BETWEEN 1 AND 99),
  
  -- 组织能力 (1-99)
  passing INTEGER DEFAULT 50 CHECK(passing BETWEEN 1 AND 99),
  ball_control INTEGER DEFAULT 50 CHECK(ball_control BETWEEN 1 AND 99),
  court_vision INTEGER DEFAULT 50 CHECK(court_vision BETWEEN 1 AND 99),
  
  -- 防守能力 (1-99)
  perimeter_defense INTEGER DEFAULT 50 CHECK(perimeter_defense BETWEEN 1 AND 99),
  interior_defense INTEGER DEFAULT 50 CHECK(interior_defense BETWEEN 1 AND 99),
  steals INTEGER DEFAULT 50 CHECK(steals BETWEEN 1 AND 99),
  blocks INTEGER DEFAULT 50 CHECK(blocks BETWEEN 1 AND 99),
  
  -- 篮板能力 (1-99)
  offensive_rebound INTEGER DEFAULT 50 CHECK(offensive_rebound BETWEEN 1 AND 99),
  defensive_rebound INTEGER DEFAULT 50 CHECK(defensive_rebound BETWEEN 1 AND 99),
  
  -- 身体素质 (1-99)
  speed INTEGER DEFAULT 50 CHECK(speed BETWEEN 1 AND 99),
  strength INTEGER DEFAULT 50 CHECK(strength BETWEEN 1 AND 99),
  stamina INTEGER DEFAULT 50 CHECK(stamina BETWEEN 1 AND 99),
  vertical INTEGER DEFAULT 50 CHECK(vertical BETWEEN 1 AND 99),
  
  -- 篮球智商 (1-99)
  basketball_iq INTEGER DEFAULT 50 CHECK(basketball_iq BETWEEN 1 AND 99),
  teamwork INTEGER DEFAULT 50 CHECK(teamwork BETWEEN 1 AND 99),
  clutch INTEGER DEFAULT 50 CHECK(clutch BETWEEN 1 AND 99),
  
  -- 综合能力（自动计算）
  overall INTEGER DEFAULT 50,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX idx_player_skills_player_id ON player_skills(player_id);
```

**字段说明**:
- 19 项能力值，每项范围 1-99
- `overall`: 综合评分，由应用层根据位置权重自动计算
- 与 `players` 表 1:1 关系

**能力分类**:
1. **投篮能力**: two_point_shot, three_point_shot, free_throw
2. **组织能力**: passing, ball_control, court_vision
3. **防守能力**: perimeter_defense, interior_defense, steals, blocks
4. **篮板能力**: offensive_rebound, defensive_rebound
5. **身体素质**: speed, strength, stamina, vertical
6. **篮球智商**: basketball_iq, teamwork, clutch

**索引**:
- `idx_player_skills_player_id`: 关联查询优化

---

### 3. grouping_history 表（分组历史）

**用途**: 记录每次分组的历史数据

**表结构**:
```sql
CREATE TABLE IF NOT EXISTS grouping_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mode TEXT NOT NULL CHECK(mode IN ('5v5', '3v3', 'custom')),
  team_count INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  balance_score REAL,                          -- 分组平衡度（标准差）
  data TEXT NOT NULL,                          -- JSON 格式的完整分组结果
  note TEXT                                    -- 用户备注
);

CREATE INDEX idx_grouping_history_created_at ON grouping_history(created_at DESC);
CREATE INDEX idx_grouping_history_mode ON grouping_history(mode);
```

**字段说明**:
- `mode`: 分组模式（5v5/3v3/custom）
- `team_count`: 队伍数量
- `player_count`: 参与球员数量
- `balance_score`: 分组平衡度（越小越平衡）
- `data`: 完整分组结果（JSON 格式）
- `note`: 用户备注（可选）

**数据示例**:
```json
{
  "teams": [
    {
      "id": "team-1",
      "name": "团队 1",
      "players": [
        {
          "id": "player-123",
          "name": "张三",
          "position": "PG",
          "overall": 75
        }
      ],
      "totalSkill": 450
    }
  ],
  "stats": {
    "balanceScore": 5.2,
    "positionDistribution": {
      "PG": 2,
      "SG": 2,
      "SF": 2,
      "PF": 2,
      "C": 2
    }
  },
  "createdAt": "2026-03-03T10:30:00Z"
}
```

**索引**:
- `idx_grouping_history_created_at`: 按时间查询优化（降序）
- `idx_grouping_history_mode`: 按模式查询优化

---

## 🔄 数据迁移

### 从 LocalStorage 迁移到 SQLite

**迁移流程**:
1. 检测 LocalStorage 中是否有旧数据
2. 自动创建备份到 IndexedDB
3. 迁移数据到 SQLite
4. 验证迁移完整性
5. 清空 LocalStorage（仅在成功时）

**迁移工具**:
```typescript
import { migrateFromLocalStorage, needsMigration } from './utils/migration';

// 检查是否需要迁移
if (needsMigration()) {
  const result = await migrateFromLocalStorage();
  if (result.success) {
    console.log(`迁移成功: ${result.playersMigrated} 个球员`);
  }
}
```

**回滚**:
```typescript
import { rollbackMigration } from './utils/migration';

// 回滚到迁移前状态
await rollbackMigration();
```

---

## 💾 数据备份和恢复

### 创建备份

```typescript
import { backupManager } from './utils/backup';

// 手动创建备份
const backupId = await backupManager.createBackup('手动备份');
console.log('备份已创建:', backupId);
```

### 恢复备份

```typescript
// 从备份恢复
const result = await backupManager.restoreFromBackup(backupId);
if (result.success) {
  console.log(`恢复成功: ${result.playersRestored} 个球员`);
}
```

### 管理备份

```typescript
// 列出所有备份
const backups = await backupManager.listBackups();
console.log('所有备份:', backups);

// 删除备份
await backupManager.deleteBackup(backupId);
```

---

## 📊 性能优化

### 索引策略

| 表 | 索引 | 用途 |
|---|---|---|
| players | idx_players_position | 按位置查询 |
| player_skills | idx_player_skills_player_id | 关联查询 |
| grouping_history | idx_grouping_history_created_at | 按时间查询 |
| grouping_history | idx_grouping_history_mode | 按模式查询 |

### 防抖保存

数据库修改后不会立即保存到 IndexedDB，而是延迟 1 秒（防抖），避免频繁 IO 操作。

```typescript
// 在 databaseService 中实现
private scheduleSave(): void {
  this.pendingSave = true;
  
  if (this.saveTimer) {
    clearTimeout(this.saveTimer);
  }
  
  this.saveTimer = setTimeout(() => {
    this.saveImmediate();
  }, 1000); // 1 秒延迟
}
```

### 性能指标

| 操作 | 目标性能 |
|------|---------|
| 首次加载 | < 3 秒 |
| 添加球员 | < 500ms |
| 更新球员 | < 500ms |
| 删除球员 | < 300ms |
| 查询所有球员（50个）| < 100ms |
| 数据迁移（50个球员）| < 5 秒 |

---

## 🔒 数据安全

### 备份机制

- 迁移前自动备份
- 保留最近 5 个备份
- 备份存储在 IndexedDB

### 降级方案

如果 SQLite 初始化失败，系统会自动降级到 LocalStorage：

```typescript
async init(): Promise<void> {
  try {
    // 尝试初始化 SQLite
    await this.initSQLite();
    this.usingSQLite = true;
  } catch (error) {
    console.error('SQLite 初始化失败，降级到 LocalStorage');
    this.usingLocalStorage = true;
  }
}
```

### 数据验证

- 所有字段都有类型检查
- 能力值范围检查 (1-99)
- 位置枚举检查
- 外键约束（CASCADE DELETE）

---

## 📚 API 文档

### DatabaseService

```typescript
// 初始化数据库
await databaseService.init();

// 执行查询
const players = databaseService.exec('SELECT * FROM players');

// 执行命令
databaseService.run('INSERT INTO players (...) VALUES (...)');
await databaseService.save();

// 获取状态
const status = databaseService.getStatus();

// 清空数据
await databaseService.clear();
```

### PlayerRepository

```typescript
const repository = new PlayerRepository();

// 查找所有球员
const players = await repository.findAll();

// 根据 ID 查找
const player = await repository.findById(id);

// 创建球员
const newPlayer = await repository.create({
  name: '张三',
  position: 'PG',
  skills: { ... }
});

// 更新球员
await repository.update(id, { name: '李四' });

// 删除球员
await repository.delete(id);
```

### GroupingRepository

```typescript
const repository = new GroupingRepository();

// 保存分组历史
const id = await repository.save({
  mode: '5v5',
  teamCount: 2,
  playerCount: 10,
  balanceScore: 5.2,
  data: { teams: [...] }
});

// 获取最近历史
const history = await repository.getRecent(20);

// 获取统计信息
const stats = await repository.getStatistics();
```

---

## 🐛 常见问题

### 1. 数据迁移失败

**症状**: 控制台显示 "迁移验证失败"

**解决方案**:
```typescript
// 手动回滚
await rollbackMigration();

// 重新迁移
await migrateFromLocalStorage();
```

### 2. SQLite 加载失败

**症状**: 控制台显示 "SQLite 初始化失败"

**可能原因**:
- WASM 文件加载失败
- 浏览器不支持 WebAssembly
- 网络问题

**解决方案**:
- 检查网络连接
- 清除浏览器缓存
- 使用支持的浏览器

### 3. 数据丢失

**预防措施**:
- 定期备份
- 检查备份列表
- 不要清除 IndexedDB

**恢复方法**:
```typescript
const backups = await backupManager.listBackups();
await backupManager.restoreFromBackup(backups[0].id);
```

---

## 📝 更新日志

### v1.0.0 (2026-03-03)
- ✅ 实现 SQLite 数据库
- ✅ 实现数据迁移
- ✅ 实现备份恢复
- ✅ 实现分组历史记录
- ✅ 性能优化

---

*文档创建时间: 2026-03-03*
*维护者: Javis*
