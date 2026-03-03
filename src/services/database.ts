/**
 * 数据库服务
 * @module services/database
 * 
 * 核心功能：
 * - SQLite 数据库管理（基于 sql.js）
 * - IndexedDB 持久化
 * - LocalStorage 降级方案
 * - 防抖保存优化
 */

import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import {
  SQL,
  DB_CONFIG,
  DatabaseError,
} from '../types/database';
import type {
  DatabaseStatus,
  QueryParam,
  QueryResult
} from '../types/database';

/**
 * 防抖配置
 */
const DEBOUNCE_DELAY = 1000; // 1 秒

/**
 * 数据库服务类
 */
class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private idb: IDBPDatabase | null = null;
  private initialized = false;
  private usingSQLite = false;
  private usingLocalStorage = false;

  // 防抖相关
  private saveTimer: NodeJS.Timeout | null = null;
  private pendingSave = false;

  // LocalStorage 数据结构
  // 注意：使用不同的 key 避免与旧的 storage.ts 冲突
  private localStorageKey = 'player-grouping-sqlite-fallback';

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 初始化数据库
   * 优先使用 SQLite，失败时降级到 LocalStorage
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 尝试初始化 SQLite
      await this.initSQLite();
      this.usingSQLite = true;
      this.usingLocalStorage = false;
      console.log('✅ SQLite 数据库初始化成功');
    } catch (error) {
      console.error('❌ SQLite 初始化失败，降级到 LocalStorage:', error);

      // 降级到 LocalStorage
      this.usingSQLite = false;
      this.usingLocalStorage = true;
      console.log('⚠️ 使用 LocalStorage 作为降级方案');
    }

    this.initialized = true;
  }

  /**
   * 初始化 SQLite 数据库
   */
  private async initSQLite(): Promise<void> {
    // 1. 初始化 IndexedDB（用于持久化 SQLite 数据）
    this.idb = await openDB(DB_CONFIG.dbName, DB_CONFIG.version, {
      upgrade(db) {
        // SQLite 数据存储
        if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
          db.createObjectStore(DB_CONFIG.storeName);
        }
        // 备份存储
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
        }
        // 迁移状态存储
        if (!db.objectStoreNames.contains('migration-status')) {
          db.createObjectStore('migration-status');
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
  }

  /**
   * 创建数据库表
   */
  private createTables(): void {
    if (!this.db) throw new DatabaseError('Database not initialized');

    try {
      this.db.run(SQL.CREATE_PLAYERS_TABLE);
      this.db.run(SQL.CREATE_SKILLS_TABLE);
      this.db.run(SQL.CREATE_HISTORY_TABLE);
      this.db.run(SQL.CREATE_INDEXES);

      // 立即保存一次
      this.saveImmediate();

      console.log('✅ 数据库表创建成功');
    } catch (error) {
      throw new DatabaseError('Failed to create tables', 'CREATE_TABLE_ERROR', error as Error);
    }
  }

  /**
   * 执行 SQL 查询（SELECT）
   * @returns 查询结果数组
   */
  exec(sql: string, params: QueryParam[] = []): QueryResult {
    // 如果使用 LocalStorage 降级方案
    if (this.usingLocalStorage) {
      return this.execFallback(sql, params);
    }

    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const stmt = this.db.prepare(sql);
      // 将 QueryParam[] 转换为 sql.js 兼容的类型
      stmt.bind(params as any);

      const results: QueryResult = [];
      while (stmt.step()) {
        results.push(stmt.get());
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('❌ SQL 查询失败:', sql, error);
      throw new DatabaseError(
        `SQL query failed: ${(error as Error).message}`,
        'QUERY_ERROR',
        error as Error
      );
    }
  }

  /**
   * 执行 SQL 命令（INSERT/UPDATE/DELETE）
   */
  run(sql: string, params: QueryParam[] = []): void {
    // 如果使用 LocalStorage 降级方案
    if (this.usingLocalStorage) {
      this.runFallback(sql, params);
      return;
    }

    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      // 将 QueryParam[] 转换为 sql.js 兼容的类型
      this.db.run(sql, params as any);

      // 标记需要保存（防抖）
      this.scheduleSave();
    } catch (error) {
      console.error('❌ SQL 执行失败:', sql, error);
      throw new DatabaseError(
        `SQL execution failed: ${(error as Error).message}`,
        'EXECUTION_ERROR',
        error as Error
      );
    }
  }

  /**
   * 安排保存（防抖）
   */
  private scheduleSave(): void {
    this.pendingSave = true;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveImmediate();
    }, DEBOUNCE_DELAY);
  }

  /**
   * 立即保存到 IndexedDB
   */
  private async saveImmediate(): Promise<void> {
    if (!this.db || !this.idb) return;

    try {
      const data = this.db.export();
      await this.idb.put(DB_CONFIG.storeName, data, 'database');
      this.pendingSave = false;
      console.log('💾 数据库已保存到 IndexedDB');
    } catch (error) {
      console.error('❌ 保存数据库失败:', error);
      throw new DatabaseError(
        'Failed to save database',
        'SAVE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 保存数据库（防抖版本，对外接口）
   */
  async save(): Promise<void> {
    if (this.pendingSave) {
      // 如果有待保存的数据，立即保存
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      await this.saveImmediate();
    }
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    if (this.usingLocalStorage) {
      this.saveLocalStorageData({ players: {}, skills: {} });
      console.log('✅ LocalStorage 数据已清空');
      return;
    }

    if (!this.usingSQLite) {
      throw new DatabaseError('SQLite not available', 'SQLITE_UNAVAILABLE');
    }

    try {
      this.run(SQL.DELETE_ALL_HISTORY);
      this.run(SQL.DELETE_ALL_SKILLS);
      this.run(SQL.DELETE_ALL_PLAYERS);
      await this.saveImmediate();
      console.log('✅ 数据库已清空');
    } catch (error) {
      throw new DatabaseError(
        'Failed to clear database',
        'CLEAR_ERROR',
        error as Error
      );
    }
  }

  /**
   * 检查是否有数据
   */
  hasData(): boolean {
    if (this.usingLocalStorage) {
      const data = this.getLocalStorageData();
      return Object.keys(data.players).length > 0;
    }

    if (!this.usingSQLite || !this.db) return false;

    const result = this.exec(SQL.COUNT_PLAYERS);
    return result[0]?.[0] > 0;
  }

  /**
   * 获取数据库状态
   */
  getStatus(): DatabaseStatus {
    let playerCount = 0;

    if (this.usingSQLite && this.db) {
      try {
        const playerResult = this.exec(SQL.COUNT_PLAYERS);
        playerCount = playerResult[0]?.[0] || 0;
      } catch (error) {
        console.error('❌ 获取数据库状态失败:', error);
      }
    }

    return {
      initialized: this.initialized,
      usingSQLite: this.usingSQLite,
      usingLocalStorage: this.usingLocalStorage,
      playerCount,
    };
  }

  /**
   * 导出数据库为 ArrayBuffer
   */
  exportDatabase(): ArrayBuffer {
    if (!this.usingSQLite || !this.db) {
      throw new DatabaseError('SQLite not available', 'SQLITE_UNAVAILABLE');
    }

    const array = this.db.export();
    return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength) as ArrayBuffer;
  }

  /**
   * 导入数据库
   */
  async importDatabase(data: Uint8Array): Promise<void> {
    if (!this.usingSQLite) {
      throw new DatabaseError('SQLite not available', 'SQLITE_UNAVAILABLE');
    }

    try {
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });

      this.db = new SQL.Database(data);
      await this.saveImmediate();
      console.log('✅ 数据库已导入');
    } catch (error) {
      throw new DatabaseError(
        'Failed to import database',
        'IMPORT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取最后插入的 ID
   */
  getLastInsertId(): number {
    if (!this.usingSQLite || !this.db) {
      throw new DatabaseError('SQLite not available', 'SQLITE_UNAVAILABLE');
    }

    const result = this.exec('SELECT last_insert_rowid()');
    return result[0]?.[0] as number;
  }

  /**
   * 获取受影响的行数
   */
  getRowsAffected(): number {
    if (!this.usingSQLite || !this.db) {
      throw new DatabaseError('SQLite not available', 'SQLITE_UNAVAILABLE');
    }

    return this.db.getRowsModified();
  }

  /**
   * 执行事务
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.usingSQLite) {
      throw new DatabaseError('SQLite not available', 'SQLITE_UNAVAILABLE');
    }

    try {
      this.run('BEGIN TRANSACTION');
      const result = await fn();
      this.run('COMMIT');
      await this.save();
      return result;
    } catch (error) {
      this.run('ROLLBACK');
      console.error('❌ 事务失败，已回滚:', error);
      throw new DatabaseError(
        'Transaction failed, rolled back',
        'TRANSACTION_ERROR',
        error as Error
      );
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
    this.usingSQLite = false;
    this.usingLocalStorage = false;

    console.log('✅ 数据库已关闭');
  }

  /**
   * 从 LocalStorage 读取数据
   * @private
   */
  private getLocalStorageData(): {
    players: Record<string, any>;
    skills: Record<string, any>;
  } {
    if (typeof localStorage === 'undefined') {
      return { players: {}, skills: {} };
    }

    const data = localStorage.getItem(this.localStorageKey);
    if (!data) {
      return { players: {}, skills: {} };
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ 解析 LocalStorage 数据失败:', error);
      return { players: {}, skills: {} };
    }
  }

  /**
   * 保存数据到 LocalStorage
   * @private
   */
  private saveLocalStorageData(data: {
    players: Record<string, any>;
    skills: Record<string, any>;
  }): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ 保存到 LocalStorage 失败:', error);
    }
  }

  /**
   * LocalStorage 降级查询实现
   * @private
   */
  private execFallback(sql: string, params: QueryParam[] = []): QueryResult {
    const data = this.getLocalStorageData();
    const players = Object.values(data.players);
    const skills = data.skills;

    // 处理 COUNT 查询
    if (sql.includes('COUNT(*)')) {
      if (sql.includes('FROM players')) {
        return [[players.length]];
      }
      return [[0]];
    }

    // 处理 SELECT 查询（JOIN players and player_skills）
    if (sql.includes('SELECT') && sql.includes('FROM players p') && sql.includes('JOIN player_skills s')) {
      let filteredPlayers = players;

      // 解析 WHERE 条件
      if (sql.includes('WHERE')) {
        const whereMatch = sql.match(/WHERE\s+p\.(\w+)\s*(=|LIKE)\s*\?/i);
        if (whereMatch) {
          const field = whereMatch[1];
          const operator = whereMatch[2];
          const value = params[0] as string;

          filteredPlayers = players.filter((player: any) => {
            if (operator === '=') {
              return player[field] === value;
            } else if (operator === 'LIKE') {
              const searchValue = value.replace(/%/g, '').toLowerCase();
              return player[field]?.toLowerCase().includes(searchValue);
            }
            return true;
          });
        }
      }

      // 映射为查询结果（模拟 JOIN）
      const results: any[][] = filteredPlayers.map((player: any) => {
        const skill = skills[player.id] || {};
        return [
          player.id,
          player.name,
          player.position,
          player.created_at,
          player.updated_at,
          skill.two_point_shot || 50,
          skill.three_point_shot || 50,
          skill.free_throw || 50,
          skill.passing || 50,
          skill.ball_control || 50,
          skill.court_vision || 50,
          skill.perimeter_defense || 50,
          skill.interior_defense || 50,
          skill.steals || 50,
          skill.blocks || 50,
          skill.offensive_rebound || 50,
          skill.defensive_rebound || 50,
          skill.speed || 50,
          skill.strength || 50,
          skill.stamina || 50,
          skill.vertical || 50,
          skill.basketball_iq || 50,
          skill.teamwork || 50,
          skill.clutch || 50,
          skill.overall || 50,
        ];
      });

      // 排序（ORDER BY created_at DESC）
      if (sql.includes('ORDER BY p.created_at DESC')) {
        results.sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime());
      }

      return results;
    }

    return [];
  }

  /**
   * LocalStorage 降级执行实现
   * @private
   */
  private runFallback(sql: string, params: QueryParam[] = []): void {
    const data = this.getLocalStorageData();

    // 处理 INSERT INTO players
    if (sql.includes('INSERT INTO players')) {
      const [id, name, position, createdAt, updatedAt] = params as [string, string, string, string, string];
      data.players[id] = {
        id,
        name,
        position,
        created_at: createdAt,
        updated_at: updatedAt,
      };
      this.saveLocalStorageData(data);
      return;
    }

    // 处理 INSERT INTO player_skills
    if (sql.includes('INSERT INTO player_skills')) {
      const [
        playerId,
        twoPointShot,
        threePointShot,
        freeThrow,
        passing,
        ballControl,
        courtVision,
        perimeterDefense,
        interiorDefense,
        steals,
        blocks,
        offensiveRebound,
        defensiveRebound,
        speed,
        strength,
        stamina,
        vertical,
        basketballIQ,
        teamwork,
        clutch,
        overall,
      ] = params as any[];

      data.skills[playerId] = {
        player_id: playerId,
        two_point_shot: twoPointShot,
        three_point_shot: threePointShot,
        free_throw: freeThrow,
        passing: passing,
        ball_control: ballControl,
        court_vision: courtVision,
        perimeter_defense: perimeterDefense,
        interior_defense: interiorDefense,
        steals: steals,
        blocks: blocks,
        offensive_rebound: offensiveRebound,
        defensive_rebound: defensiveRebound,
        speed: speed,
        strength: strength,
        stamina: stamina,
        vertical: vertical,
        basketball_iq: basketballIQ,
        teamwork: teamwork,
        clutch: clutch,
        overall: overall,
      };
      this.saveLocalStorageData(data);
      return;
    }

    // 处理 UPDATE players
    if (sql.includes('UPDATE players SET')) {
      const [name, position, updatedAt, id] = params.slice(-4) as [string | null, string | null, string, string];
      const player = data.players[id];
      if (player) {
        if (name !== null) player.name = name;
        if (position !== null) player.position = position;
        player.updated_at = updatedAt;
        this.saveLocalStorageData(data);
      }
      return;
    }

    // 处理 UPDATE player_skills
    if (sql.includes('UPDATE player_skills SET')) {
      const playerId = params[params.length - 1] as string;
      const skill = data.skills[playerId];
      if (skill) {
        const fields = [
          'two_point_shot', 'three_point_shot', 'free_throw',
          'passing', 'ball_control', 'court_vision',
          'perimeter_defense', 'interior_defense', 'steals', 'blocks',
          'offensive_rebound', 'defensive_rebound',
          'speed', 'strength', 'stamina', 'vertical',
          'basketball_iq', 'teamwork', 'clutch', 'overall',
        ];

        fields.forEach((field, index) => {
          const value = params[index];
          if (value !== null) {
            skill[field] = value;
          }
        });

        this.saveLocalStorageData(data);
      }
      return;
    }

    // 处理 DELETE FROM players
    if (sql.includes('DELETE FROM players')) {
      const id = params[0] as string;
      delete data.players[id];
      delete data.skills[id];
      this.saveLocalStorageData(data);
      return;
    }

    // 处理其他 DELETE 操作
    if (sql.includes('DELETE FROM')) {
      // 其他表的清空操作（如 grouping_history）在 LocalStorage 模式下暂不处理
      return;
    }
  }

}

/**
 * 导出数据库服务实例（单例）
 */
export const databaseService = new DatabaseService();

/**
 * 导出类型
 */
export type { DatabaseService };
