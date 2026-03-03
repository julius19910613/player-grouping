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
