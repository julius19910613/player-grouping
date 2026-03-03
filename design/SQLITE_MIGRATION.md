# SQLite 数据存储迁移计划

> 创建时间: 2026-03-03
> 状态: 待 Review
> 目标: 将球员数据从 LocalStorage 迁移到 SQLite

---

## 📋 背景

### 当前状态
- 数据存储: LocalStorage
- 存储限制: ~5MB
- 数据类型: JSON 序列化
- 问题:
  - 存储容量有限
  - 无法执行复杂查询
  - 数据结构不够灵活
  - 不支持多表关联

### 目标状态
- 数据存储: SQLite (via sql.js)
- 存储限制: IndexedDB 限制 (~50MB-500MB)
- 数据类型: 结构化 SQL 表
- 优势:
  - 更大存储容量
  - 支持 SQL 查询
  - 支持多表关联
  - 便于后续扩展（历史记录、比赛数据等）

---

## 🎯 技术方案

### 方案选择: sql.js

**为什么选择 sql.js？**

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **sql.js** | 纯前端、无需后端、兼容 GitHub Pages | 需要将数据库存到 IndexedDB | ✅ 推荐 |
| 后端 API + SQLite | 真正的数据库、无限容量 | 需要服务器、部署复杂 | ❌ 过度设计 |
| Tauri/Electron | 原生 SQLite | 需要打包成桌面应用 | ❌ 改变部署方式 |

**sql.js 简介**:
- SQLite 编译成 WebAssembly
- 在浏览器中运行完整的 SQLite
- 数据库文件存储在 IndexedDB 中
- 支持所有标准 SQL 功能

---

## 📊 数据库设计

### 表结构

#### 1. players 表（球员信息）

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. player_skills 表（球员能力）

```sql
CREATE TABLE player_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  
  -- 投篮能力
  two_point_shot INTEGER DEFAULT 50,
  three_point_shot INTEGER DEFAULT 50,
  free_throw INTEGER DEFAULT 50,
  
  -- 组织能力
  passing INTEGER DEFAULT 50,
  ball_control INTEGER DEFAULT 50,
  court_vision INTEGER DEFAULT 50,
  
  -- 防守能力
  perimeter_defense INTEGER DEFAULT 50,
  interior_defense INTEGER DEFAULT 50,
  steals INTEGER DEFAULT 50,
  blocks INTEGER DEFAULT 50,
  
  -- 篮板能力
  offensive_rebound INTEGER DEFAULT 50,
  defensive_rebound INTEGER DEFAULT 50,
  
  -- 身体素质
  speed INTEGER DEFAULT 50,
  strength INTEGER DEFAULT 50,
  stamina INTEGER DEFAULT 50,
  vertical INTEGER DEFAULT 50,
  
  -- 篮球智商
  basketball_iq INTEGER DEFAULT 50,
  teamwork INTEGER DEFAULT 50,
  clutch INTEGER DEFAULT 50,
  
  -- 综合能力（自动计算）
  overall INTEGER DEFAULT 50,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

#### 3. grouping_history 表（分组历史）- 新增

```sql
CREATE TABLE grouping_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mode TEXT NOT NULL,  -- '5v5' or '3v3'
  team_count INTEGER NOT NULL,
  data TEXT NOT NULL   -- JSON 格式的分组结果
);
```

### 索引优化

```sql
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_player_skills_player_id ON player_skills(player_id);
CREATE INDEX idx_grouping_history_created_at ON grouping_history(created_at);
```

---

## 🔧 实现计划

### Phase 1: 基础设施（1-2天）

#### 1.1 安装依赖

```bash
npm install sql.js
npm install idb  # IndexedDB 封装库，用于持久化 SQLite 数据库
```

#### 1.2 创建数据库服务

**新建文件**: `src/services/database.ts`

```typescript
import initSqlJs, { Database } from 'sql.js';
import { openDB } from 'idb';

class DatabaseService {
  private db: Database | null = null;
  private dbName = 'player-grouping-db';
  private storeName = 'sqlite-data';
  
  async init(): Promise<void> {
    // 初始化 sql.js
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });
    
    // 尝试从 IndexedDB 加载现有数据库
    const savedData = await this.loadFromIndexedDB();
    if (savedData) {
      this.db = new SQL.Database(savedData);
    } else {
      this.db = new SQL.Database();
      this.createTables();
    }
  }
  
  private createTables(): void {
    this.db!.run(`CREATE TABLE players (...)`);
    this.db!.run(`CREATE TABLE player_skills (...)`);
    this.db!.run(`CREATE TABLE grouping_history (...)`);
    this.save();
  }
  
  async save(): Promise<void> {
    const data = this.db!.export();
    await this.saveToIndexedDB(data);
  }
  
  // ... 其他方法
}

export const databaseService = new DatabaseService();
```

#### 1.3 创建球员仓库

**新建文件**: `src/repositories/playerRepository.ts`

```typescript
import { databaseService } from '../services/database';

export class PlayerRepository {
  async findAll(): Promise<Player[]> {
    const result = databaseService.db!.exec(`
      SELECT p.*, s.*
      FROM players p
      JOIN player_skills s ON p.id = s.player_id
    `);
    return this.mapResultToPlayers(result);
  }
  
  async findById(id: string): Promise<Player | null> {
    // ...
  }
  
  async create(player: Player): Promise<void> {
    databaseService.db!.run(
      'INSERT INTO players (id, name, position) VALUES (?, ?, ?)',
      [player.id, player.name, player.position]
    );
    databaseService.db!.run(
      'INSERT INTO player_skills (player_id, ...) VALUES (?, ...)',
      [player.id, ...]
    );
    await databaseService.save();
  }
  
  async update(id: string, updates: Partial<Player>): Promise<void> {
    // ...
  }
  
  async delete(id: string): Promise<void> {
    databaseService.db!.run('DELETE FROM players WHERE id = ?', [id]);
    await databaseService.save();
  }
}
```

---

### Phase 2: 数据迁移（1天）

#### 2.1 迁移工具

**新建文件**: `src/utils/migration.ts`

```typescript
import { Storage } from './storage';
import { PlayerRepository } from '../repositories/playerRepository';

export async function migrateFromLocalStorage(): Promise<void> {
  const oldPlayers = Storage.loadPlayers();
  const repository = new PlayerRepository();
  
  for (const player of oldPlayers) {
    await repository.create(player);
  }
  
  // 迁移成功后清除旧数据
  Storage.clear();
}
```

#### 2.2 自动迁移检测

在 App 初始化时检测并执行迁移：

```typescript
// src/App.tsx
useEffect(() => {
  async function init() {
    await databaseService.init();
    
    // 检查是否需要迁移
    const oldData = Storage.loadPlayers();
    if (oldData.length > 0 && !databaseService.hasData()) {
      const shouldMigrate = confirm('检测到旧数据，是否迁移到新存储？');
      if (shouldMigrate) {
        await migrateFromLocalStorage();
      }
    }
  }
  init();
}, []);
```

---

### Phase 3: 集成与测试（1-2天）

#### 3.1 修改 usePlayerManager Hook

```typescript
// src/hooks/usePlayerManager.ts
import { PlayerRepository } from '../repositories/playerRepository';

export function usePlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const repository = useMemo(() => new PlayerRepository(), []);
  
  const loadPlayers = useCallback(async () => {
    const data = await repository.findAll();
    setPlayers(data);
  }, [repository]);
  
  const addPlayer = useCallback(async (playerData) => {
    await repository.create(playerData);
    await loadPlayers();
  }, [repository, loadPlayers]);
  
  // ... 其他方法
}
```

#### 3.2 测试用例

**新建文件**: `src/services/__tests__/database.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { databaseService } from '../database';

describe('DatabaseService', () => {
  beforeAll(async () => {
    await databaseService.init();
  });
  
  it('should create tables', () => {
    const tables = databaseService.db!.exec(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    expect(tables[0].values).toContain(['players']);
    expect(tables[0].values).toContain(['player_skills']);
  });
  
  // ... 更多测试
});
```

---

### Phase 4: 新功能（可选，1天）

#### 4.1 分组历史记录

```typescript
export class GroupingHistoryRepository {
  async save(history: GroupingResult): Promise<void> {
    databaseService.db!.run(
      'INSERT INTO grouping_history (mode, team_count, data) VALUES (?, ?, ?)',
      [history.mode, history.teamCount, JSON.stringify(history)]
    );
    await databaseService.save();
  }
  
  async getRecent(limit: number = 10): Promise<GroupingResult[]> {
    // ...
  }
}
```

#### 4.2 UI 组件

- 分组历史列表
- 快速加载历史分组
- 分组对比功能

---

## 📅 时间线

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | 基础设施（数据库服务、仓库层） | 1-2 天 |
| Phase 2 | 数据迁移（LocalStorage → SQLite） | 1 天 |
| Phase 3 | 集成与测试 | 1-2 天 |
| Phase 4 | 新功能（分组历史） | 1 天（可选） |
| **总计** | | **4-6 天** |

---

## ⚠️ 风险与注意事项

### 1. sql.js 加载
- 首次加载需要下载 ~1MB 的 WASM 文件
- 需要配置 CDN 或将文件放到 public 目录
- **建议**: 使用 `https://sql.js.org/dist/` CDN

### 2. 数据迁移
- 需要处理大量数据的迁移时间
- 需要提供回滚机制
- **建议**: 先迁移少量数据测试

### 3. 浏览器兼容性
- sql.js 支持 IE11+（需要 polyfill）
- IndexedDB 支持 所有现代浏览器
- **建议**: 添加降级方案（继续使用 LocalStorage）

### 4. 性能考虑
- 每次修改都需要保存整个数据库到 IndexedDB
- 大量数据时可能有性能问题
- **建议**: 实现防抖保存机制

---

## 🔄 降级方案

如果 sql.js 出现问题，提供降级到 LocalStorage 的方案：

```typescript
class StorageAdapter {
  private useSQLite: boolean;
  
  async init() {
    try {
      await databaseService.init();
      this.useSQLite = true;
    } catch (error) {
      console.warn('SQLite initialization failed, falling back to LocalStorage');
      this.useSQLite = false;
    }
  }
  
  async getPlayers(): Promise<Player[]> {
    if (this.useSQLite) {
      return new PlayerRepository().findAll();
    }
    return Storage.loadPlayers();
  }
}
```

---

## 📦 依赖变更

```json
{
  "dependencies": {
    "sql.js": "^1.10.0",
    "idb": "^8.0.0"
  }
}
```

---

## ✅ 验收标准

### 功能验收
- [ ] 球员数据正常保存到 SQLite
- [ ] 页面刷新后数据持久化
- [ ] 旧数据可以成功迁移
- [ ] 所有 CRUD 操作正常工作
- [ ] 分组功能不受影响

### 性能验收
- [ ] 首次加载时间 < 3 秒
- [ ] 保存操作 < 500ms
- [ ] 查询操作 < 100ms

### 兼容性验收
- [ ] Chrome/Edge 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] 移动端浏览器

---

## 📝 待确认事项

请 Review 以下问题：

1. **是否需要后端支持？**
   - 当前方案是纯前端
   - 如果未来需要多设备同步，需要后端

2. **是否需要分组历史记录？**
   - Phase 4 是可选功能
   - 如果需要，可以一并实现

3. **数据迁移策略**
   - 自动迁移 + 用户确认？
   - 还是手动触发迁移？

4. **时间安排**
   - 希望什么时候完成？
   - 是否需要分阶段交付？

---

*此文档由 Javis 创建，等待 Julius Review*
