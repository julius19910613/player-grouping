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
 * 迁移状态类型
 */
export interface MigrationStatus {
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  playersMigrated?: number;
  error?: string;
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
  usingSQLite: boolean;
  usingLocalStorage: boolean;
  playerCount: number;
  lastBackup?: string;
  migrationStatus?: MigrationStatus;
}

/**
 * 分组模式类型
 */
export type GroupingMode = '5v5' | '3v3' | 'custom';

/**
 * 分组数据类型（存储在 grouping_history.data 中）
 */
export interface GroupingData {
  teams: Array<{
    id: string;
    name: string;
    players: Array<{
      id: string;
      name: string;
      position: string;
      overall: number;
    }>;
    totalSkill: number;
  }>;
  stats: {
    balanceScore: number;
    positionDistribution: Record<string, number>;
  };
  createdAt: string;
}

/**
 * 数据库错误类型
 */
export class DatabaseError extends Error {
  public code?: string;
  public originalError?: Error;
  
  constructor(message: string, code?: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * 迁移错误类型
 */
export class MigrationError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'MIGRATION_ERROR', originalError);
    this.name = 'MigrationError';
  }
}

/**
 * 备份错误类型
 */
export class BackupError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'BACKUP_ERROR', originalError);
    this.name = 'BackupError';
  }
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
