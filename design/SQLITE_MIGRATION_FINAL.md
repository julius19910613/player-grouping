# SQLite 数据存储迁移方案 - 最终版

> 创建时间: 2026-03-03
> 状态: ✅ 可执行
> 设计者: Javis
> 审核者: 待 Julius Review

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
│   └── storage.ts           # 旧存储工具（保留用于迁移）
├── types/
│   ├── basketball.ts        # 篮球类型（不变）
│   ├── player.ts            # 球员类型（不变）
│   └── database.ts          # 数据库类型（新增）
└── hooks/
    └── usePlayerManager.ts  # 修改：调用 repository
```

---

## 💻 核心代码实现

### 1. 数据库服务 (src/services/database.ts)

```typescript
import initSqlJs, { Database } from 'sql.js';
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'player-grouping-db';
const STORE_NAME = 'sqlite-data';
const DB_VERSION = 1;

class DatabaseService {
  private db: Database | null = null;
  private idb: IDBPDatabase | null = null;
  private initialized = false;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // 1. 初始化 IndexedDB
    this.idb = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      }
    });

    // 2. 初始化 sql.js
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    // 3. 尝试从 IndexedDB 加载现有数据库
    const savedData = await this.idb.get(STORE_NAME, 'database');
    if (savedData) {
      this.db = new SQL.Database(savedData);
    } else {
      this.db = new SQL.Database();
      this.createTables();
    }

    this.initialized = true;
  }

  /**
   * 创建数据库表
   */
  private createTables(): void {
    const createPlayersTable = `
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position TEXT NOT NULL CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createSkillsTable = `
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
    `;

    const createHistoryTable = `
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
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
      CREATE INDEX IF NOT EXISTS idx_player_skills_player_id ON player_skills(player_id);
      CREATE INDEX IF NOT EXISTS idx_grouping_history_created_at ON grouping_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_grouping_history_mode ON grouping_history(mode);
    `;

    this.db!.run(createPlayersTable);
    this.db!.run(createSkillsTable);
    this.db!.run(createHistoryTable);
    this.db!.run(createIndexes);
    
    this.save();
  }

  /**
   * 保存数据库到 IndexedDB
   */
  async save(): Promise<void> {
    if (!this.db || !this.idb) return;
    const data = this.db.export();
    await this.idb.put(STORE_NAME, data, 'database');
  }

  /**
   * 执行 SQL 查询
   */
  exec(sql: string, params: any[] = []): any[][] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    
    const results: any[][] = [];
    while (stmt.step()) {
      results.push(stmt.get());
    }
    stmt.free();
    
    return results;
  }

  /**
   * 执行 SQL 命令（INSERT/UPDATE/DELETE）
   */
  run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
  }

  /**
   * 检查是否有数据
   */
  hasData(): boolean {
    const result = this.exec('SELECT COUNT(*) FROM players');
    return result[0]?.[0] > 0;
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.run('DELETE FROM grouping_history');
    this.run('DELETE FROM player_skills');
    this.run('DELETE FROM players');
    await this.save();
  }
}

export const databaseService = new DatabaseService();
```

### 2. 球员仓库 (src/repositories/player.repository.ts)

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
      ORDER BY p.created_at DESC
    `;

    const rows = databaseService.exec(sql);
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
    const overall = calculateOverallSkill(
      playerData.skills as any,
      playerData.position
    );

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
        skills.twoPointShot, skills.threePointShot, skills.freeThrow,
        skills.passing, skills.ballControl, skills.courtVision,
        skills.perimeterDefense, skills.interiorDefense, skills.steals, skills.blocks,
        skills.offensiveRebound, skills.defensiveRebound,
        skills.speed, skills.strength, skills.stamina, skills.vertical,
        skills.basketballIQ, skills.teamwork, skills.clutch, overall
      ]
    );

    await databaseService.save();

    return {
      id,
      name: playerData.name,
      position: playerData.position,
      skills: { ...skills, overall },
      createdAt: new Date(now),
      updatedAt: new Date(now)
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
          id
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
        overall: row[24]
      }
    };
  }
}
```

### 3. 分组历史仓库 (src/repositories/grouping.repository.ts)

```typescript
import { databaseService } from '../services/database';

export interface GroupingHistory {
  id: number;
  createdAt: Date;
  mode: '5v5' | '3v3' | 'custom';
  teamCount: number;
  playerCount: number;
  balanceScore: number;
  data: any;  // JSON
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
      history.note ?? null
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
    return rows.map(row => ({
      id: row[0] as number,
      createdAt: new Date(row[1] as string),
      mode: row[2] as '5v5' | '3v3' | 'custom',
      teamCount: row[3] as number,
      playerCount: row[4] as number,
      balanceScore: row[5] as number,
      data: JSON.parse(row[6] as string),
      note: row[7] as string | undefined
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
      note: row[7] as string | undefined
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

### 4. 数据迁移工具 (src/utils/migration.ts)

```typescript
import { Storage } from './storage';
import { PlayerRepository } from '../repositories/player.repository';
import { databaseService } from '../services/database';

export interface MigrationResult {
  success: boolean;
  playersMigrated: number;
  error?: string;
}

/**
 * 从 LocalStorage 迁移数据到 SQLite
 */
export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  try {
    // 1. 从 LocalStorage 加载旧数据
    const oldPlayers = Storage.loadPlayers();
    
    if (oldPlayers.length === 0) {
      return { success: true, playersMigrated: 0 };
    }

    // 2. 确保数据库已初始化
    await databaseService.init();

    // 3. 检查是否已经有数据
    if (databaseService.hasData()) {
      return { 
        success: false, 
        playersMigrated: 0,
        error: '数据库中已有数据，跳过迁移'
      };
    }

    // 4. 迁移球员数据
    const repository = new PlayerRepository();
    let migratedCount = 0;

    for (const player of oldPlayers) {
      try {
        await repository.create({
          name: player.name,
          position: player.position,
          skills: player.skills
        });
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate player ${player.name}:`, error);
      }
    }

    // 5. 清除旧数据
    Storage.clear();

    return { success: true, playersMigrated: migratedCount };
  } catch (error) {
    return { 
      success: false, 
      playersMigrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
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
```

### 5. 修改 usePlayerManager Hook (src/hooks/usePlayerManager.ts)

```typescript
import { useState, useCallback, useEffect } from 'react';
import { PlayerRepository } from '../repositories/player.repository';
import { GroupingRepository } from '../repositories/grouping.repository';
import { migrateFromLocalStorage, needsMigration } from '../utils/migration';
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
          }
        }

        // 加载球员
        const data = await repository.findAll();
        setPlayers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败');
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

  const addPlayer = useCallback(async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await repository.create(playerData);
      await refreshPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
      throw err;
    }
  }, [refreshPlayers]);

  const updatePlayer = useCallback(async (id: string, updates: Partial<Player>) => {
    try {
      await repository.update(id, updates);
      await refreshPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
      throw err;
    }
  }, [refreshPlayers]);

  const deletePlayer = useCallback(async (id: string) => {
    try {
      await repository.delete(id);
      await refreshPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      throw err;
    }
  }, [refreshPlayers]);

  return {
    players,
    isLoading,
    error,
    addPlayer,
    updatePlayer,
    deletePlayer,
    refreshPlayers
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

  const saveGrouping = useCallback(async (grouping: Omit<GroupingHistory, 'id' | 'createdAt'>) => {
    await repository.save(grouping);
    await loadHistory();
  }, [loadHistory]);

  const deleteHistory = useCallback(async (id: number) => {
    await repository.delete(id);
    await loadHistory();
  }, [loadHistory]);

  return {
    history,
    loadHistory,
    saveGrouping,
    deleteHistory
  };
}
```

---

## 📝 实施步骤

### Step 1: 安装依赖

```bash
cd ~/.openclaw/workspace/projects/player-grouping
npm install sql.js idb
npm install --save-dev @types/sql.js
```

### Step 2: 创建新文件

按以下顺序创建文件：

1. `src/types/database.ts`（数据库类型定义）
2. `src/services/database.ts`（数据库服务）
3. `src/repositories/player.repository.ts`（球员仓库）
4. `src/repositories/grouping.repository.ts`（分组历史仓库）
5. `src/utils/migration.ts`（迁移工具）

### Step 3: 修改现有文件

1. **src/hooks/usePlayerManager.ts**
   - 替换为新的实现（见上文）
   - 添加 `useGroupingHistory` Hook

2. **src/App.tsx**
   - 添加分组历史 UI 组件（可选）

### Step 4: 测试迁移

```bash
# 启动开发服务器
npm run dev

# 打开浏览器控制台，检查：
# - "✅ 迁移完成: X 个球员"
# - LocalStorage 已清空
# - IndexedDB 中有 "player-grouping-db"
```

### Step 5: 更新测试

添加新的测试文件：
- `src/services/__tests__/database.test.ts`
- `src/repositories/__tests__/player.repository.test.ts`
- `src/repositories/__tests__/grouping.repository.test.ts`

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

### 性能验收
- [ ] 首次加载 < 3 秒
- [ ] 保存操作 < 500ms
- [ ] 查询操作 < 100ms

### 兼容性验收
- [ ] Chrome/Edge 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] 移动端浏览器
- [ ] GitHub Pages 部署正常

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

---

## 📚 参考资料

- [sql.js 官方文档](https://sql.js.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [idb 库文档](https://github.com/jakearchibald/idb)

---

*此方案由 Javis 设计，可直接执行*
*创建时间: 2026-03-03*
