# SQLite 数据存储迁移方案 - 最终版 V2

> 创建时间: 2026-03-03
> 更新时间: 2026-03-03
> 状态: ✅ 可执行
> 设计者: Javis
> 审核者: 待 Julius Review
> 版本: V2 (根据审核意见修改)

---

## 📋 方案概述

### 核心变更
| 项目 | 当前 | 目标 |
|------|------|------|
| 数据存储 | LocalStorage | SQLite (sql.js) |
| 持久化 | ~5MB | ~50-500MB (IndexedDB) |
| 查询能力 | JSON 序列化 | 完整 SQL |
| 新增功能 | - | 分组历史记录 |

### 技术选型
- **sql.js**: SQLite 编译成 WebAssembly，纯前端运行
- **IndexedDB**: 用于持久化 SQLite 数据库文件
- **完全替换 LocalStorage**: 不保留旧方案

### 🆕 V2 更新内容
1. ✅ 添加完整的 `src/types/database.ts` 代码
2. ✅ 添加 Phase 0（备份和回滚机制）
3. ✅ 细化实施步骤（检查点、时间估算）
4. ✅ 修正时间估算为 5.5-6.5 小时
5. ✅ 添加性能测试计划
6. ✅ 添加兼容性测试方案
7. ✅ 添加数据安全保障

---

## 📊 数据库设计

### 1. players 表（球员基本信息）

```sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_position ON players(position);
```

**字段说明**:
- `id`: 唯一标识（格式: `player-{timestamp}-{random}`）
- `name`: 球员姓名
- `position`: 篮球位置（PG/SG/SF/PF/C/UTILITY）
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 2. player_skills 表（球员能力）

```sql
CREATE TABLE IF NOT EXISTS player_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL UNIQUE,
  
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
- 19 项能力值（1-99）
- `overall` 由应用层根据位置权重计算
- 与 `players` 表 1:1 关系

### 3. grouping_history 表（分组历史）- 新增功能

```sql
CREATE TABLE IF NOT EXISTS grouping_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mode TEXT NOT NULL CHECK(mode IN ('5v5', '3v3', 'custom')),
  team_count INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  balance_score REAL,  -- 分组平衡度（标准差）
  data TEXT NOT NULL,  -- JSON 格式的完整分组结果
  note TEXT  -- 用户备注
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
      "players": [...],
      "totalSkill": 450
    }
  ],
  "stats": {
    "balanceScore": 5.2,
    "positionDistribution": {...}
  }
}
```

---

## 🏗️ 代码架构

### 文件结构

```
src/
├── services/
│   └── database.ts          # 数据库服务（新增）
├── repositories/
│   ├── player.repository.ts      # 球员仓库（新增）
│   └── grouping.repository.ts    # 分组历史仓库（新增）
├── utils/
│   ├── migration.ts         # 数据迁移工具（新增）
│   ├── storage.ts           # 旧存储工具（保留用于迁移）
│   └── backup.ts            # 备份恢复工具（新增）
├── types/
│   ├── basketball.ts        # 篮球类型（不变）
│   ├── player.ts            # 球员类型（不变）
│   └── database.ts          # 数据库类型（新增）
└── hooks/
    └── usePlayerManager.ts  # 修改：调用 repository
```

---

## 💻 核心代码实现

### 0. 数据库类型定义 (src/types/database.ts) 🆕

```typescript
/**
 * 数据库类型定义
 * @module types/database
 */

/**
 * 球员数据库行类型
 */
export interface PlayerRow {
  id: string;
  name: string;
  position: string;
  created_at: string;
  updated_at: string;
}

/**
 * 球员能力数据库行类型
 */
export interface PlayerSkillRow {
  id: number;
  player_id: string;
  two_point_shot: number;
  three_point_shot: number;
  free_throw: number;
  passing: number;
  ball_control: number;
  court_vision: number;
  perimeter_defense: number;
  interior_defense: number;
  steals: number;
  blocks: number;
  offensive_rebound: number;
  defensive_rebound: number;
  speed: number;
  strength: number;
  stamina: number;
  vertical: number;
  basketball_iq: number;
  teamwork: number;
  clutch: number;
  overall: number;
}

/**
 * 分组历史数据库行类型
 */
export interface GroupingHistoryRow {
  id: number;
  created_at: string;
  mode: '5v5' | '3v3' | 'custom';
  team_count: number;
  player_count: number;
  balance_score: number | null;
  data: string;  // JSON string
  note: string | null;
}

/**
 * 数据库查询参数类型
 */
export type QueryParam = string | number | null | Uint8Array;

/**
 * 数据库查询结果类型
 */
export type QueryResult = any[][];

/**
 * 数据库配置类型
 */
export interface DatabaseConfig {
  dbName: string;
  storeName: string;
  version: number;
}

/**
 * 备份数据类型
 */
export interface BackupData {
  version: number;
  timestamp: string;
  players: PlayerRow[];
  skills: PlayerSkillRow[];
  groupingHistory: GroupingHistoryRow[];
  localStorage?: {
    players?: string;
    [key: string]: any;
  };
}

/**
 * 迁移结果类型
 */
export interface MigrationResult {
  success: boolean;
  playersMigrated: number;
  error?: string;
  backupId?: string;
}

/**
 * 回滚结果类型
 */
export interface RollbackResult {
  success: boolean;
  playersRestored: number;
  error?: string;
}

/**
 * 数据库状态类型
 */
export interface DatabaseStatus {
  initialized: boolean;
  hasData: boolean;
  playerCount: number;
  historyCount: number;
  lastBackup?: string;
}

/**
 * SQL 语句常量
 */
export const SQL = {
  // 创建表
  CREATE_PLAYERS_TABLE: `
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT NOT NULL CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  CREATE_SKILLS_TABLE: `
    CREATE TABLE IF NOT EXISTS player_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL UNIQUE,
      two_point_shot INTEGER DEFAULT 50 CHECK(two_point_shot BETWEEN 1 AND 99),
      three_point_shot INTEGER DEFAULT 50 CHECK(three_point_shot BETWEEN 1 AND 99),
      free_throw INTEGER DEFAULT 50 CHECK(free_throw BETWEEN 1 AND 99),
      passing INTEGER DEFAULT 50 CHECK(passing BETWEEN 1 AND 99),
      ball_control INTEGER DEFAULT 50 CHECK(ball_control BETWEEN 1 AND 99),
      court_vision INTEGER DEFAULT 50 CHECK(court_vision BETWEEN 1 AND 99),
      perimeter_defense INTEGER DEFAULT 50 CHECK(perimeter_defense BETWEEN 1 AND 99),
      interior_defense INTEGER DEFAULT 50 CHECK(interior_defense BETWEEN 1 AND 99),
      steals INTEGER DEFAULT 50 CHECK(steals BETWEEN 1 AND 99),
      blocks INTEGER DEFAULT 50 CHECK(blocks BETWEEN 1 AND 99),
      offensive_rebound INTEGER DEFAULT 50 CHECK(offensive_rebound BETWEEN 1 AND 99),
      defensive_rebound INTEGER DEFAULT 50 CHECK(defensive_rebound BETWEEN 1 AND 99),
      speed INTEGER DEFAULT 50 CHECK(speed BETWEEN 1 AND 99),
      strength INTEGER DEFAULT 50 CHECK(strength BETWEEN 1 AND 99),
      stamina INTEGER DEFAULT 50 CHECK(stamina BETWEEN 1 AND 99),
      vertical INTEGER DEFAULT 50 CHECK(vertical BETWEEN 1 AND 99),
      basketball_iq INTEGER DEFAULT 50 CHECK(basketball_iq BETWEEN 1 AND 99),
      teamwork INTEGER DEFAULT 50 CHECK(teamwork BETWEEN 1 AND 99),
      clutch INTEGER DEFAULT 50 CHECK(clutch BETWEEN 1 AND 99),
      overall INTEGER DEFAULT 50,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `,
  
  CREATE_HISTORY_TABLE: `
    CREATE TABLE IF NOT EXISTS grouping_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      mode TEXT NOT NULL CHECK(mode IN ('5v5', '3v3', 'custom')),
      team_count INTEGER NOT NULL,
      player_count INTEGER NOT NULL,
      balance_score REAL,
      data TEXT NOT NULL,
      note TEXT
    );
  `,
  
  // 索引
  CREATE_INDEXES: `
    CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
    CREATE INDEX IF NOT EXISTS idx_player_skills_player_id ON player_skills(player_id);
    CREATE INDEX IF NOT EXISTS idx_grouping_history_created_at ON grouping_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_grouping_history_mode ON grouping_history(mode);
  `,
  
  // 查询
  COUNT_PLAYERS: 'SELECT COUNT(*) FROM players;',
  COUNT_HISTORY: 'SELECT COUNT(*) FROM grouping_history;',
  
  SELECT_ALL_PLAYERS: `
    SELECT 
      p.id, p.name, p.position, p.created_at, p.updated_at,
      s.two_point_shot, s.three_point_shot, s.free_throw,
      s.passing, s.ball_control, s.court_vision,
      s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
      s.offensive_rebound, s.defensive_rebound,
      s.speed, s.strength, s.stamina, s.vertical,
      s.basketball_iq, s.teamwork, s.clutch, s.overall
    FROM players p
    JOIN player_skills s ON p.id = s.player_id
    ORDER BY p.created_at DESC
  `,
  
  // 清空表
  DELETE_ALL_HISTORY: 'DELETE FROM grouping_history;',
  DELETE_ALL_SKILLS: 'DELETE FROM player_skills;',
  DELETE_ALL_PLAYERS: 'DELETE FROM players;',
} as const;

/**
 * 数据库配置常量
 */
export const DB_CONFIG: DatabaseConfig = {
  dbName: 'player-grouping-db',
  storeName: 'sqlite-data',
  version: 1,
} as const;

/**
 * 备份文件版本
 */
export const BACKUP_VERSION = 1;
```

### 1. 备份恢复工具 (src/utils/backup.ts) 🆕

```typescript
/**
 * 备份恢复工具
 * @module utils/backup
 */

import { openDB, IDBPDatabase } from 'idb';
import { databaseService } from '../services/database';
import { Storage } from './storage';
import type { 
  BackupData, 
  RollbackResult,
  DB_CONFIG,
  PlayerRow,
  PlayerSkillRow,
  GroupingHistoryRow 
} from '../types/database';
import { BACKUP_VERSION, DB_CONFIG as config } from '../types/database';

const BACKUP_STORE = 'backups';
const MAX_BACKUPS = 5;

/**
 * 创建备份
 */
export async function createBackup(note?: string): Promise<string> {
  try {
    // 确保数据库已初始化
    if (!databaseService.isInitialized()) {
      await databaseService.init();
    }

    // 导出当前数据
    const players = databaseService.exec('SELECT * FROM players') as PlayerRow[];
    const skills = databaseService.exec('SELECT * FROM player_skills') as PlayerSkillRow[];
    const history = databaseService.exec('SELECT * FROM grouping_history') as GroupingHistoryRow[];

    // 获取 LocalStorage 数据（用于回滚）
    const localStorageData = {
      players: localStorage.getItem('players'),
    };

    // 创建备份数据
    const backup: BackupData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      players,
      skills,
      groupingHistory: history,
      localStorage: localStorageData,
    };

    // 保存到 IndexedDB
    const idb = await openDB(config.dbName, config.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          db.createObjectStore(BACKUP_STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
    });

    // 添加备注
    const backupWithNote = {
      ...backup,
      id: `backup-${Date.now()}`,
      note: note || `备份于 ${new Date().toLocaleString('zh-CN')}`,
    };

    await idb.put(BACKUP_STORE, backupWithNote);

    // 清理旧备份（保留最近 5 个）
    const allBackups = await idb.getAll(BACKUP_STORE);
    if (allBackups.length > MAX_BACKUPS) {
      allBackups
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(MAX_BACKUPS)
        .forEach(async (old) => {
          await idb.delete(BACKUP_STORE, old.id);
        });
    }

    console.log('✅ 备份已创建:', backupWithNote.id);
    return backupWithNote.id;
  } catch (error) {
    console.error('❌ 创建备份失败:', error);
    throw error;
  }
}

/**
 * 从备份恢复
 */
export async function restoreFromBackup(backupId: string): Promise<RollbackResult> {
  try {
    const idb = await openDB(config.dbName, config.version);
    const backup = await idb.get(BACKUP_STORE, backupId);

    if (!backup) {
      return {
        success: false,
        playersRestored: 0,
        error: '备份不存在',
      };
    }

    // 清空当前数据库
    await databaseService.clear();

    // 恢复球员数据
    for (const player of backup.players) {
      databaseService.run(
        'INSERT INTO players (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [player.id, player.name, player.position, player.created_at, player.updated_at]
      );
    }

    // 恢复能力值
    for (const skill of backup.skills) {
      databaseService.run(
        `INSERT INTO player_skills (
          player_id, two_point_shot, three_point_shot, free_throw,
          passing, ball_control, court_vision,
          perimeter_defense, interior_defense, steals, blocks,
          offensive_rebound, defensive_rebound,
          speed, strength, stamina, vertical,
          basketball_iq, teamwork, clutch, overall
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          skill.player_id,
          skill.two_point_shot,
          skill.three_point_shot,
          skill.free_throw,
          skill.passing,
          skill.ball_control,
          skill.court_vision,
          skill.perimeter_defense,
          skill.interior_defense,
          skill.steals,
          skill.blocks,
          skill.offensive_rebound,
          skill.defensive_rebound,
          skill.speed,
          skill.strength,
          skill.stamina,
          skill.vertical,
          skill.basketball_iq,
          skill.teamwork,
          skill.clutch,
          skill.overall,
        ]
      );
    }

    // 恢复分组历史
    for (const history of backup.groupingHistory) {
      databaseService.run(
        `INSERT INTO grouping_history 
          (created_at, mode, team_count, player_count, balance_score, data, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          history.created_at,
          history.mode,
          history.team_count,
          history.player_count,
          history.balance_score,
          history.data,
          history.note,
        ]
      );
    }

    await databaseService.save();

    console.log(`✅ 已从备份恢复: ${backup.players.length} 个球员`);
    return {
      success: true,
      playersRestored: backup.players.length,
    };
  } catch (error) {
    console.error('❌ 恢复备份失败:', error);
    return {
      success: false,
      playersRestored: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 列出所有备份
 */
export async function listBackups(): Promise<Array<{ id: string; timestamp: string; note: string }>> {
  try {
    const idb = await openDB(config.dbName, config.version);
    const backups = await idb.getAll(BACKUP_STORE);
    
    return backups
      .map(b => ({
        id: b.id,
        timestamp: b.timestamp,
        note: b.note || '无备注',
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('❌ 获取备份列表失败:', error);
    return [];
  }
}

/**
 * 删除备份
 */
export async function deleteBackup(backupId: string): Promise<void> {
  try {
    const idb = await openDB(config.dbName, config.version);
    await idb.delete(BACKUP_STORE, backupId);
    console.log('✅ 备份已删除:', backupId);
  } catch (error) {
    console.error('❌ 删除备份失败:', error);
    throw error;
  }
}

/**
 * 自动备份（迁移前调用）
 */
export async function autoBackupBeforeMigration(): Promise<string | null> {
  try {
    const oldPlayers = Storage.loadPlayers();
    if (oldPlayers.length === 0) {
      console.log('ℹ️ 无需备份：没有旧数据');
      return null;
    }

    const backupId = await createBackup('迁移前自动备份');
    console.log('✅ 迁移前备份已创建:', backupId);
    return backupId;
  } catch (error) {
    console.error('❌ 自动备份失败:', error);
    throw error;
  }
}
```

### 2. 数据库服务 (src/services/database.ts)

```typescript
import initSqlJs, { Database } from 'sql.js';
import { openDB, IDBPDatabase } from 'idb';
import { SQL, DB_CONFIG } from '../types/database';

class DatabaseService {
  private db: Database | null = null;
  private idb: IDBPDatabase | null = null;
  private initialized = false;

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. 初始化 IndexedDB
      this.idb = await openDB(DB_CONFIG.dbName, DB_CONFIG.version, {
        upgrade(db) {
          // 创建 SQLite 数据存储
          if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
            db.createObjectStore(DB_CONFIG.storeName);
          }
          // 创建备份存储
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          }
        },
      });

      // 2. 初始化 sql.js
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });

      // 3. 尝试从 IndexedDB 加载现有数据库
      const savedData = await this.idb.get(DB_CONFIG.storeName, 'database');
      if (savedData) {
        this.db = new SQL.Database(savedData);
        console.log('✅ 已从 IndexedDB 加载现有数据库');
      } else {
        this.db = new SQL.Database();
        this.createTables();
        console.log('✅ 已创建新数据库');
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据库表
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(SQL.CREATE_PLAYERS_TABLE);
    this.db.run(SQL.CREATE_SKILLS_TABLE);
    this.db.run(SQL.CREATE_HISTORY_TABLE);
    this.db.run(SQL.CREATE_INDEXES);

    this.save();
  }

  /**
   * 保存数据库到 IndexedDB
   */
  async save(): Promise<void> {
    if (!this.db || !this.idb) return;
    const data = this.db.export();
    await this.idb.put(DB_CONFIG.storeName, data, 'database');
  }

  /**
   * 执行 SQL 查询
   */
  exec(sql: string, params: any[] = []): any[][] {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);

      const results: any[][] = [];
      while (stmt.step()) {
        results.push(stmt.get());
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('❌ SQL 查询失败:', sql, error);
      throw error;
    }
  }

  /**
   * 执行 SQL 命令（INSERT/UPDATE/DELETE）
   */
  run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      this.db.run(sql, params);
    } catch (error) {
      console.error('❌ SQL 执行失败:', sql, error);
      throw error;
    }
  }

  /**
   * 检查是否有数据
   */
  hasData(): boolean {
    const result = this.exec(SQL.COUNT_PLAYERS);
    return result[0]?.[0] > 0;
  }

  /**
   * 获取数据库状态
   */
  getStatus(): { playerCount: number; historyCount: number } {
    const playerResult = this.exec(SQL.COUNT_PLAYERS);
    const historyResult = this.exec(SQL.COUNT_HISTORY);

    return {
      playerCount: playerResult[0]?.[0] || 0,
      historyCount: historyResult[0]?.[0] || 0,
    };
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.run(SQL.DELETE_ALL_HISTORY);
    this.run(SQL.DELETE_ALL_SKILLS);
    this.run(SQL.DELETE_ALL_PLAYERS);
    await this.save();
    console.log('✅ 数据库已清空');
  }

  /**
   * 导出数据库为 ArrayBuffer
   */
  exportDatabase(): ArrayBuffer {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export().buffer;
  }

  /**
   * 导入数据库
   */
  async importDatabase(data: Uint8Array): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });
    
    this.db = new SQL.Database(data);
    await this.save();
    console.log('✅ 数据库已导入');
  }
}

export const databaseService = new DatabaseService();
```

### 3. 数据迁移工具 (src/utils/migration.ts) - 增强版

```typescript
import { Storage } from './storage';
import { PlayerRepository } from '../repositories/player.repository';
import { databaseService } from '../services/database';
import { 
  autoBackupBeforeMigration, 
  restoreFromBackup,
  listBackups 
} from './backup';
import type { MigrationResult } from '../types/database';

/**
 * 从 LocalStorage 迁移数据到 SQLite（增强版）
 */
export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  try {
    console.log('🔄 开始迁移流程...');

    // 1. 从 LocalStorage 加载旧数据
    const oldPlayers = Storage.loadPlayers();
    console.log(`📊 找到 ${oldPlayers.length} 个旧球员数据`);

    if (oldPlayers.length === 0) {
      console.log('ℹ️ 无需迁移：没有旧数据');
      return { success: true, playersMigrated: 0 };
    }

    // 2. 确保数据库已初始化
    await databaseService.init();

    // 3. 检查是否已经有数据
    if (databaseService.hasData()) {
      console.log('⚠️ 数据库中已有数据，跳过迁移');
      return {
        success: false,
        playersMigrated: 0,
        error: '数据库中已有数据，跳过迁移',
      };
    }

    // 4. 创建备份（重要！）
    const backupId = await autoBackupBeforeMigration();
    console.log('💾 备份已创建:', backupId);

    // 5. 迁移球员数据
    const repository = new PlayerRepository();
    let migratedCount = 0;
    const errors: string[] = [];

    for (const player of oldPlayers) {
      try {
        await repository.create({
          name: player.name,
          position: player.position,
          skills: player.skills,
        });
        migratedCount++;
        console.log(`✅ 迁移成功: ${player.name} (${migratedCount}/${oldPlayers.length})`);
      } catch (error) {
        const errMsg = `Failed to migrate player ${player.name}: ${error}`;
        console.error(`❌ ${errMsg}`);
        errors.push(errMsg);
      }
    }

    // 6. 验证迁移结果
    const status = databaseService.getStatus();
    if (status.playerCount !== migratedCount) {
      console.error('❌ 迁移验证失败：数量不匹配');
      // 自动回滚
      if (backupId) {
        console.log('🔄 正在自动回滚...');
        await restoreFromBackup(backupId);
      }
      return {
        success: false,
        playersMigrated: 0,
        error: '迁移验证失败，已自动回滚',
        backupId,
      };
    }

    // 7. 清除旧数据（仅在迁移成功后）
    if (migratedCount === oldPlayers.length) {
      Storage.clear();
      console.log('🗑️ LocalStorage 旧数据已清除');
    }

    console.log(`✅ 迁移完成: ${migratedCount}/${oldPlayers.length} 个球员`);

    if (errors.length > 0) {
      console.warn(`⚠️ 有 ${errors.length} 个错误:`, errors);
    }

    return {
      success: true,
      playersMigrated: migratedCount,
      backupId,
    };
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return {
      success: false,
      playersMigrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 检查是否需要迁移
 */
export function needsMigration(): boolean {
  const oldPlayers = Storage.loadPlayers();
  return oldPlayers.length > 0 && !databaseService.hasData();
}

/**
 * 回滚到迁移前状态
 */
export async function rollbackMigration(backupId?: string): Promise<void> {
  try {
    console.log('🔄 开始回滚...');

    // 如果没有指定备份 ID，使用最新的备份
    if (!backupId) {
      const backups = await listBackups();
      if (backups.length === 0) {
        throw new Error('没有可用的备份');
      }
      backupId = backups[0].id;
    }

    // 恢复备份
    const result = await restoreFromBackup(backupId);

    if (result.success) {
      console.log(`✅ 回滚成功: 恢复了 ${result.playersRestored} 个球员`);
    } else {
      throw new Error(result.error || '回滚失败');
    }
  } catch (error) {
    console.error('❌ 回滚失败:', error);
    throw error;
  }
}

/**
 * 验证迁移完整性
 */
export function verifyMigration(): boolean {
  try {
    const status = databaseService.getStatus();
    const oldPlayers = Storage.loadPlayers();

    // 如果旧数据已清除，说明迁移成功
    if (oldPlayers.length === 0 && status.playerCount > 0) {
      console.log('✅ 迁移验证通过');
      return true;
    }

    // 如果还有旧数据，检查数量是否匹配
    if (oldPlayers.length === status.playerCount) {
      console.log('✅ 迁移验证通过');
      return true;
    }

    console.error('❌ 迁移验证失败');
    return false;
  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    return false;
  }
}
```

### 4. 球员仓库 (src/repositories/player.repository.ts)

```typescript
import { databaseService } from '../services/database';
import { Player } from '../types/player';
import { BasketballPosition, calculateOverallSkill } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';

export class PlayerRepository {
  /**
   * 查找所有球员
   */
  async findAll(): Promise<Player[]> {
    const rows = databaseService.exec(`
      SELECT 
        p.id, p.name, p.position, p.created_at, p.updated_at,
        s.two_point_shot, s.three_point_shot, s.free_throw,
        s.passing, s.ball_control, s.court_vision,
        s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
        s.offensive_rebound, s.defensive_rebound,
        s.speed, s.strength, s.stamina, s.vertical,
        s.basketball_iq, s.teamwork, s.clutch, s.overall
      FROM players p
      JOIN player_skills s ON p.id = s.player_id
      ORDER BY p.created_at DESC
    `);
    return rows.map(this.mapRowToPlayer);
  }

  /**
   * 根据 ID 查找球员
   */
  async findById(id: string): Promise<Player | null> {
    const sql = `
      SELECT 
        p.id, p.name, p.position, p.created_at, p.updated_at,
        s.two_point_shot, s.three_point_shot, s.free_throw,
        s.passing, s.ball_control, s.court_vision,
        s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
        s.offensive_rebound, s.defensive_rebound,
        s.speed, s.strength, s.stamina, s.vertical,
        s.basketball_iq, s.teamwork, s.clutch, s.overall
      FROM players p
      JOIN player_skills s ON p.id = s.player_id
      WHERE p.id = ?
    `;

    const rows = databaseService.exec(sql, [id]);
    return rows.length > 0 ? this.mapRowToPlayer(rows[0]) : null;
  }

  /**
   * 创建球员
   */
  async create(playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    const id = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // 计算 overall
    const overall = calculateOverallSkill(playerData.skills as any, playerData.position);

    // 插入球员基本信息
    databaseService.run(
      'INSERT INTO players (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, playerData.name, playerData.position, now, now]
    );

    // 插入能力值
    const skills = playerData.skills;
    databaseService.run(
      `INSERT INTO player_skills (
        player_id, two_point_shot, three_point_shot, free_throw,
        passing, ball_control, court_vision,
        perimeter_defense, interior_defense, steals, blocks,
        offensive_rebound, defensive_rebound,
        speed, strength, stamina, vertical,
        basketball_iq, teamwork, clutch, overall
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        skills.twoPointShot,
        skills.threePointShot,
        skills.freeThrow,
        skills.passing,
        skills.ballControl,
        skills.courtVision,
        skills.perimeterDefense,
        skills.interiorDefense,
        skills.steals,
        skills.blocks,
        skills.offensiveRebound,
        skills.defensiveRebound,
        skills.speed,
        skills.strength,
        skills.stamina,
        skills.vertical,
        skills.basketballIQ,
        skills.teamwork,
        skills.clutch,
        overall,
      ]
    );

    await databaseService.save();

    return {
      id,
      name: playerData.name,
      position: playerData.position,
      skills: { ...skills, overall },
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * 更新球员
   */
  async update(id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>): Promise<void> {
    const now = new Date().toISOString();

    if (updates.name || updates.position) {
      databaseService.run(
        'UPDATE players SET name = COALESCE(?, name), position = COALESCE(?, position), updated_at = ? WHERE id = ?',
        [updates.name ?? null, updates.position ?? null, now, id]
      );
    }

    if (updates.skills) {
      const overall = updates.position
        ? calculateOverallSkill(updates.skills as any, updates.position)
        : updates.skills.overall;

      databaseService.run(
        `UPDATE player_skills SET
          two_point_shot = COALESCE(?, two_point_shot),
          three_point_shot = COALESCE(?, three_point_shot),
          free_throw = COALESCE(?, free_throw),
          passing = COALESCE(?, passing),
          ball_control = COALESCE(?, ball_control),
          court_vision = COALESCE(?, court_vision),
          perimeter_defense = COALESCE(?, perimeter_defense),
          interior_defense = COALESCE(?, interior_defense),
          steals = COALESCE(?, steals),
          blocks = COALESCE(?, blocks),
          offensive_rebound = COALESCE(?, offensive_rebound),
          defensive_rebound = COALESCE(?, defensive_rebound),
          speed = COALESCE(?, speed),
          strength = COALESCE(?, strength),
          stamina = COALESCE(?, stamina),
          vertical = COALESCE(?, vertical),
          basketball_iq = COALESCE(?, basketball_iq),
          teamwork = COALESCE(?, teamwork),
          clutch = COALESCE(?, clutch),
          overall = ?
        WHERE player_id = ?`,
        [
          updates.skills.twoPointShot ?? null,
          updates.skills.threePointShot ?? null,
          updates.skills.freeThrow ?? null,
          updates.skills.passing ?? null,
          updates.skills.ballControl ?? null,
          updates.skills.courtVision ?? null,
          updates.skills.perimeterDefense ?? null,
          updates.skills.interiorDefense ?? null,
          updates.skills.steals ?? null,
          updates.skills.blocks ?? null,
          updates.skills.offensiveRebound ?? null,
          updates.skills.defensiveRebound ?? null,
          updates.skills.speed ?? null,
          updates.skills.strength ?? null,
          updates.skills.stamina ?? null,
          updates.skills.vertical ?? null,
          updates.skills.basketballIQ ?? null,
          updates.skills.teamwork ?? null,
          updates.skills.clutch ?? null,
          overall,
          id,
        ]
      );
    }

    await databaseService.save();
  }

  /**
   * 删除球员
   */
  async delete(id: string): Promise<void> {
    databaseService.run('DELETE FROM players WHERE id = ?', [id]);
    await databaseService.save();
  }

  /**
   * 映射数据库行到 Player 对象
   */
  private mapRowToPlayer(row: any[]): Player {
    return {
      id: row[0],
      name: row[1],
      position: row[2] as BasketballPosition,
      createdAt: new Date(row[3]),
      updatedAt: new Date(row[4]),
      skills: {
        twoPointShot: row[5],
        threePointShot: row[6],
        freeThrow: row[7],
        passing: row[8],
        ballControl: row[9],
        courtVision: row[10],
        perimeterDefense: row[11],
        interiorDefense: row[12],
        steals: row[13],
        blocks: row[14],
        offensiveRebound: row[15],
        defensiveRebound: row[16],
        speed: row[17],
        strength: row[18],
        stamina: row[19],
        vertical: row[20],
        basketballIQ: row[21],
        teamwork: row[22],
        clutch: row[23],
        overall: row[24],
      },
    };
  }
}
```

### 5. 分组历史仓库 (src/repositories/grouping.repository.ts)

```typescript
import { databaseService } from '../services/database';

export interface GroupingHistory {
  id: number;
  createdAt: Date;
  mode: '5v5' | '3v3' | 'custom';
  teamCount: number;
  playerCount: number;
  balanceScore: number;
  data: any; // JSON
  note?: string;
}

export class GroupingRepository {
  /**
   * 保存分组历史
   */
  async save(history: Omit<GroupingHistory, 'id' | 'createdAt'>): Promise<number> {
    const sql = `
      INSERT INTO grouping_history (mode, team_count, player_count, balance_score, data, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    databaseService.run(sql, [
      history.mode,
      history.teamCount,
      history.playerCount,
      history.balanceScore,
      JSON.stringify(history.data),
      history.note ?? null,
    ]);

    await databaseService.save();

    // 获取最后插入的 ID
    const result = databaseService.exec('SELECT last_insert_rowid()');
    return result[0][0] as number;
  }

  /**
   * 获取最近的分组历史
   */
  async getRecent(limit: number = 20): Promise<GroupingHistory[]> {
    const sql = `
      SELECT id, created_at, mode, team_count, player_count, balance_score, data, note
      FROM grouping_history
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const rows = databaseService.exec(sql, [limit]);
    return rows.map((row) => ({
      id: row[0] as number,
      createdAt: new Date(row[1] as string),
      mode: row[2] as '5v5' | '3v3' | 'custom',
      teamCount: row[3] as number,
      playerCount: row[4] as number,
      balanceScore: row[5] as number,
      data: JSON.parse(row[6] as string),
      note: row[7] as string | undefined,
    }));
  }

  /**
   * 根据 ID 获取分组历史
   */
  async getById(id: number): Promise<GroupingHistory | null> {
    const sql = `
      SELECT id, created_at, mode, team_count, player_count, balance_score, data, note
      FROM grouping_history
      WHERE id = ?
    `;

    const rows = databaseService.exec(sql, [id]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row[0] as number,
      createdAt: new Date(row[1] as string),
      mode: row[2] as '5v5' | '3v3' | 'custom',
      teamCount: row[3] as number,
      playerCount: row[4] as number,
      balanceScore: row[5] as number,
      data: JSON.parse(row[6] as string),
      note: row[7] as string | undefined,
    };
  }

  /**
   * 删除分组历史
   */
  async delete(id: number): Promise<void> {
    databaseService.run('DELETE FROM grouping_history WHERE id = ?', [id]);
    await databaseService.save();
  }

  /**
   * 清空所有历史
   */
  async clearAll(): Promise<void> {
    databaseService.run('DELETE FROM grouping_history');
    await databaseService.save();
  }
}
```

### 6. 修改 usePlayerManager Hook (src/hooks/usePlayerManager.ts)

```typescript
import { useState, useCallback, useEffect } from 'react';
import { PlayerRepository } from '../repositories/player.repository';
import { GroupingRepository } from '../repositories/grouping.repository';
import { migrateFromLocalStorage, needsMigration, verifyMigration } from '../utils/migration';
import { createBackup, listBackups } from '../utils/backup';
import { databaseService } from '../services/database';
import type { Player } from '../types/player';
import type { BasketballPosition, BasketballSkills } from '../types/basketball';

export function usePlayerManager(): {
  players: Player[];
  isLoading: boolean;
  error: string | null;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  refreshPlayers: () => Promise<void>;
  createBackup: () => Promise<string>;
} {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = new PlayerRepository();

  // 初始化和迁移
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);

        // 初始化数据库
        await databaseService.init();

        // 检查是否需要迁移
        if (needsMigration()) {
          const result = await migrateFromLocalStorage();
          if (result.success) {
            console.log(`✅ 迁移完成: ${result.playersMigrated} 个球员`);
            if (result.backupId) {
              console.log(`💾 备份 ID: ${result.backupId}`);
            }
          } else {
            console.error('❌ 迁移失败:', result.error);
            setError('数据迁移失败，请刷新页面重试');
            return;
          }
        }

        // 验证迁移完整性
        if (!verifyMigration()) {
          console.error('❌ 迁移验证失败');
          setError('数据迁移验证失败');
          return;
        }

        // 加载球员
        const data = await repository.findAll();
        setPlayers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败');
        console.error('❌ 初始化失败:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const refreshPlayers = useCallback(async () => {
    try {
      const data = await repository.findAll();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败');
    }
  }, []);

  const addPlayer = useCallback(
    async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        await repository.create(playerData);
        await refreshPlayers();
      } catch (err) {
        setError(err instanceof Error ? err.message : '添加失败');
        throw err;
      }
    },
    [refreshPlayers]
  );

  const updatePlayer = useCallback(
    async (id: string, updates: Partial<Player>) => {
      try {
        await repository.update(id, updates);
        await refreshPlayers();
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新失败');
        throw err;
      }
    },
    [refreshPlayers]
  );

  const deletePlayer = useCallback(
    async (id: string) => {
      try {
        await repository.delete(id);
        await refreshPlayers();
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除失败');
        throw err;
      }
    },
    [refreshPlayers]
  );

  const handleCreateBackup = useCallback(async () => {
    try {
      const backupId = await createBackup('手动备份');
      console.log('✅ 备份已创建:', backupId);
      return backupId;
    } catch (err) {
      setError(err instanceof Error ? err.message : '备份失败');
      throw err;
    }
  }, []);

  return {
    players,
    isLoading,
    error,
    addPlayer,
    updatePlayer,
    deletePlayer,
    refreshPlayers,
    createBackup: handleCreateBackup,
  };
}

// 新增：分组历史 Hook
export function useGroupingHistory() {
  const [history, setHistory] = useState<GroupingHistory[]>([]);
  const repository = new GroupingRepository();

  const loadHistory = useCallback(async (limit: number = 20) => {
    const data = await repository.getRecent(limit);
    setHistory(data);
  }, []);

  const saveGrouping = useCallback(
    async (grouping: Omit<GroupingHistory, 'id' | 'createdAt'>) => {
      await repository.save(grouping);
      await loadHistory();
    },
    [loadHistory]
  );

  const deleteHistory = useCallback(
    async (id: number) => {
      await repository.delete(id);
      await loadHistory();
    },
    [loadHistory]
  );

  return {
    history,
    loadHistory,
    saveGrouping,
    deleteHistory,
  };
}
```

---

## 📝 实施步骤（详细版）🆕

### ⏱️ 总时间估算: 5.5-6.5 小时

### Phase 0: 备份和准备（30 分钟）🆕

#### 检查点 0.1: 环境准备（10 分钟）
- [ ] 检查 Node.js 版本（>=16）
- [ ] 检查 npm 版本
- [ ] 确认项目可以正常启动
- [ ] 记录当前 LocalStorage 数据量

```bash
# 检查环境
node -v
npm -v
cd ~/.openclaw/workspace/projects/player-grouping
npm run dev
```

#### 检查点 0.2: 手动备份（10 分钟）
- [ ] 导出 LocalStorage 数据（浏览器开发者工具）
- [ ] 保存到文件 `backup-localstorage-{date}.json`
- [ ] 验证备份文件完整性

#### 检查点 0.3: 创建备份脚本（10 分钟）
- [ ] 创建 `src/utils/backup.ts`
- [ ] 实现自动备份功能
- [ ] 测试备份和恢复

---

### Phase 1: 安装依赖（15 分钟）

#### 检查点 1.1: 安装核心依赖（10 分钟）
- [ ] 安装 sql.js 和 idb
- [ ] 安装类型定义
- [ ] 验证安装成功

```bash
cd ~/.openclaw/workspace/projects/player-grouping
npm install sql.js idb
npm install --save-dev @types/sql.js
```

**验证命令**:
```bash
npm list sql.js idb
```

---

### Phase 2: 创建类型定义（30 分钟）🆕

#### 检查点 2.1: 创建数据库类型（15 分钟）
- [ ] 创建 `src/types/database.ts`
- [ ] 定义所有数据库行类型
- [ ] 定义备份和迁移类型
- [ ] 定义 SQL 常量

**文件**: `src/types/database.ts`（见上文完整代码）

#### 检查点 2.2: 验证类型（15 分钟）
- [ ] 导入类型，无 TypeScript 错误
- [ ] 检查所有类型定义完整
- [ ] 运行 `npm run build` 无错误

---

### Phase 3: 创建备份恢复工具（45 分钟）🆕

#### 检查点 3.1: 实现备份功能（25 分钟）
- [ ] 创建 `src/utils/backup.ts`
- [ ] 实现 `createBackup()`
- [ ] 实现 `listBackups()`
- [ ] 实现自动清理旧备份

#### 检查点 3.2: 实现恢复功能（20 分钟）
- [ ] 实现 `restoreFromBackup()`
- [ ] 实现 `deleteBackup()`
- [ ] 实现 `autoBackupBeforeMigration()`

**测试**:
```bash
# 在浏览器控制台测试
import { createBackup, listBackups, restoreFromBackup } from './utils/backup';
await createBackup('测试备份');
const backups = await listBackups();
console.log(backups);
```

---

### Phase 4: 创建核心服务（60 分钟）

#### 检查点 4.1: 数据库服务（40 分钟）
- [ ] 创建 `src/services/database.ts`
- [ ] 实现 `init()` 方法
- [ ] 实现 `createTables()` 方法
- [ ] 实现 `save()` 和 `exec()` 方法
- [ ] 添加错误处理和日志

#### 检查点 4.2: 测试数据库服务（20 分钟）
- [ ] 在浏览器控制台测试初始化
- [ ] 测试表创建
- [ ] 测试 CRUD 操作
- [ ] 验证 IndexedDB 存储

**测试代码**:
```typescript
import { databaseService } from './services/database';
await databaseService.init();
console.log('数据库状态:', databaseService.getStatus());
```

---

### Phase 5: 创建 Repository（60 分钟）

#### 检查点 5.1: 球员仓库（40 分钟）
- [ ] 创建 `src/repositories/player.repository.ts`
- [ ] 实现 `findAll()`, `findById()`
- [ ] 实现 `create()`, `update()`, `delete()`
- [ ] 实现 `mapRowToPlayer()`

#### 检查点 5.2: 分组历史仓库（20 分钟）
- [ ] 创建 `src/repositories/grouping.repository.ts`
- [ ] 实现 `save()`, `getRecent()`, `getById()`
- [ ] 实现 `delete()`, `clearAll()`

**测试代码**:
```typescript
import { PlayerRepository } from './repositories/player.repository';
const repo = new PlayerRepository();
const players = await repo.findAll();
console.log('球员数量:', players.length);
```

---

### Phase 6: 创建迁移工具（45 分钟）🆕

#### 检查点 6.1: 增强迁移工具（30 分钟）
- [ ] 修改 `src/utils/migration.ts`
- [ ] 添加备份集成
- [ ] 添加验证逻辑
- [ ] 添加自动回滚机制

#### 检查点 6.2: 测试迁移（15 分钟）
- [ ] 准备测试数据（LocalStorage）
- [ ] 执行迁移
- [ ] 验证数据完整性
- [ ] 测试回滚功能

**测试流程**:
1. 在 LocalStorage 中添加测试球员
2. 运行迁移
3. 检查 SQLite 数据
4. 测试回滚

---

### Phase 7: 修改 Hook（45 分钟）

#### 检查点 7.1: 修改 usePlayerManager（30 分钟）
- [ ] 替换存储逻辑
- [ ] 添加迁移集成
- [ ] 添加错误处理
- [ ] 添加备份功能

#### 检查点 7.2: 创建 useGroupingHistory（15 分钟）
- [ ] 实现分组历史 Hook
- [ ] 集成到应用中

**验证**:
```bash
npm run dev
# 在浏览器中测试所有功能
```

---

### Phase 8: 测试和验证（90 分钟）🆕

#### 检查点 8.1: 功能测试（40 分钟）

**测试清单**:
- [ ] 球员 CRUD 操作
  - [ ] 添加球员
  - [ ] 编辑球员
  - [ ] 删除球员
  - [ ] 查看球员列表
- [ ] 分组功能
  - [ ] 5v5 分组
  - [ ] 3v3 分组
  - [ ] 自定义分组
  - [ ] 分组历史查看
- [ ] 数据持久化
  - [ ] 刷新页面数据保留
  - [ ] 关闭浏览器重开数据保留
- [ ] 迁移功能
  - [ ] LocalStorage 数据迁移
  - [ ] 迁移后 LocalStorage 清空
  - [ ] 迁移验证通过

**测试脚本**:
```bash
# 1. 添加测试球员（LocalStorage）
# 2. 启动应用
npm run dev
# 3. 检查控制台迁移日志
# 4. 验证所有功能
```

#### 检查点 8.2: 性能测试（25 分钟）🆕

**性能测试计划**:

1. **首次加载性能**
   - [ ] 无数据首次加载 < 3 秒
   - [ ] 有 50 个球员首次加载 < 4 秒
   - [ ] sql.js 初始化 < 1 秒

   **测试方法**:
   ```javascript
   console.time('首次加载');
   await databaseService.init();
   console.timeEnd('首次加载');
   ```

2. **CRUD 操作性能**
   - [ ] 添加球员 < 500ms
   - [ ] 更新球员 < 500ms
   - [ ] 删除球员 < 300ms
   - [ ] 查询所有球员（50 个）< 100ms

   **测试脚本**:
   ```javascript
   // 测试添加性能
   console.time('添加球员');
   await repository.create({ name: '测试', position: 'PG', skills: {...} });
   console.timeEnd('添加球员');
   
   // 测试查询性能
   console.time('查询所有');
   const players = await repository.findAll();
   console.timeEnd('查询所有');
   ```

3. **数据迁移性能**
   - [ ] 50 个球员迁移 < 5 秒
   - [ ] 包含备份和验证

4. **IndexedDB 性能**
   - [ ] 保存数据库 < 200ms
   - [ ] 加载数据库 < 300ms

#### 检查点 8.3: 兼容性测试（25 分钟）🆕

**兼容性测试方案**:

1. **浏览器兼容性**
   - [ ] Chrome/Edge 最新版
   - [ ] Firefox 最新版
   - [ ] Safari 最新版（macOS/iOS）
   - [ ] 移动端浏览器（Chrome/Safari）

   **测试要点**:
   - sql.js 加载成功
   - IndexedDB 可用
   - 数据持久化正常

2. **功能兼容性**
   - [ ] 旧数据迁移成功
   - [ ] 新功能正常
   - [ ] 无功能退化

3. **GitHub Pages 部署**
   - [ ] 构建：`npm run build`
   - [ ] 部署成功
   - [ ] sql.js 文件正确加载
   - [ ] 所有功能正常

   **测试步骤**:
   ```bash
   npm run build
   npm run deploy  # 或手动部署
   # 在生产环境测试所有功能
   ```

4. **边界情况测试**
   - [ ] 无数据启动
   - [ ] 大量数据（100+ 球员）
   - [ ] 网络断开时的 sql.js 加载
   - [ ] IndexedDB 配额超限
   - [ ] 隐私模式/无痕模式

---

### Phase 9: 更新文档（30 分钟）

#### 检查点 9.1: 更新 README（15 分钟）
- [ ] 更新架构说明
- [ ] 更新依赖列表
- [ ] 添加迁移说明
- [ ] 添加备份恢复说明

#### 检查点 9.2: 更新测试文档（15 分钟）
- [ ] 添加测试文件
- [ ] 添加测试说明
- [ ] 添加性能基准

---

### Phase 10: 部署和监控（30 分钟）

#### 检查点 10.1: 部署（15 分钟）
- [ ] 构建生产版本
- [ ] 部署到 GitHub Pages
- [ ] 验证生产环境

#### 检查点 10.2: 监控（15 分钟）
- [ ] 添加错误日志
- [ ] 添加性能监控
- [ ] 准备回滚方案

---

## ✅ 验收标准

### 功能验收
- [ ] 球员数据正常保存到 SQLite
- [ ] 页面刷新后数据持久化
- [ ] 旧数据自动迁移到 SQLite
- [ ] LocalStorage 被清空
- [ ] 所有 CRUD 操作正常
- [ ] 分组功能正常
- [ ] 分组历史可以保存和查看
- [ ] 备份和恢复功能正常 🆕
- [ ] 回滚功能正常 🆕

### 性能验收
- [ ] 首次加载 < 3 秒
- [ ] 保存操作 < 500ms
- [ ] 查询操作 < 100ms
- [ ] 迁移 50 个球员 < 5 秒 🆕
- [ ] 备份操作 < 2 秒 🆕

### 兼容性验收
- [ ] Chrome/Edge 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] 移动端浏览器
- [ ] GitHub Pages 部署正常
- [ ] 隐私模式有提示 🆕

### 数据安全保障 🆕
- [ ] 迁移前自动备份
- [ ] 备份验证通过
- [ ] 回滚功能可用
- [ ] 数据不丢失
- [ ] 错误有提示

---

## 🧪 测试计划 🆕

### 单元测试
```
src/services/__tests__/database.test.ts
src/repositories/__tests__/player.repository.test.ts
src/repositories/__tests__/grouping.repository.test.ts
src/utils/__tests__/backup.test.ts
src/utils/__tests__/migration.test.ts
```

### 集成测试
```
tests/integration/migration.test.ts
tests/integration/backup-restore.test.ts
```

### 性能基准
```
首次加载: < 3s
CRUD 操作: < 500ms
查询操作: < 100ms
迁移（50 个球员）: < 5s
备份: < 2s
```

---

## 🎯 后续优化（可选）

### Phase 2: 增强功能
1. **数据导出/导入**
   - 导出为 SQLite 文件
   - 从 SQLite 文件导入
   - 支持备份和恢复

2. **分组历史增强**
   - 分组对比功能
   - 统计分析
   - 快速重用历史分组

3. **性能优化**
   - 添加缓存层
   - 批量操作优化
   - 懒加载历史记录

### Phase 3: 高级功能
1. **多设备同步**（需要后端）
2. **离线优先架构**
3. **数据压缩**

---

## 📚 参考资料

- [sql.js 官方文档](https://sql.js.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [idb 库文档](https://github.com/jakearchibald/idb)

---

## 📝 变更日志

### V2 (2026-03-03)
- ✅ 添加完整的 `src/types/database.ts` 代码
- ✅ 添加 Phase 0（备份和回滚机制）
- ✅ 细化实施步骤（检查点、时间估算）
- ✅ 修正时间估算为 5.5-6.5 小时
- ✅ 添加性能测试计划
- ✅ 添加兼容性测试方案
- ✅ 添加数据安全保障
- ✅ 添加备份恢复工具
- ✅ 增强迁移工具（自动备份、验证、回滚）
- ✅ 添加详细的测试清单

---

*此方案由 Javis 设计，可直接执行*
*创建时间: 2026-03-03*
*更新时间: 2026-03-03*
*版本: V2*
