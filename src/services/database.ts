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

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
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
    if (!this.usingSQLite) {
      throw new DatabaseError('SQLite not available, using LocalStorage fallback', 'SQLITE_UNAVAILABLE');
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
    if (!this.usingSQLite) {
      throw new DatabaseError('SQLite not available, using LocalStorage fallback', 'SQLITE_UNAVAILABLE');
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
    if (!this.usingSQLite) return false;
    
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
}

/**
 * 导出数据库服务实例（单例）
 */
export const databaseService = new DatabaseService();

/**
 * 导出类型
 */
export type { DatabaseService };
