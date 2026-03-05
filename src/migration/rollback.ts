/**
 * 迁移回滚工具
 * @module migration/rollback
 * 
 * 职责：
 * - 从 Supabase 删除已迁移的数据
 * - 恢复 SQLite 数据（从备份）
 * - 更新迁移进度状态
 * - 提供回滚验证
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { migrationProgress, type MigrationType } from './migration-progress';
import { databaseService } from '../services/database';
import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { DatabaseError } from '../types/database';

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  type: MigrationType;
  deletedFromSupabase: number;  // 从 Supabase 删除的记录数
  restoredFromBackup: number;    // 从备份恢复的记录数
  error?: string;
}

/**
 * 备份信息
 */
interface BackupInfo {
  id: string;
  timestamp: string;
  data: Uint8Array;
  note?: string;
}

/**
 * 回滚管理器
 */
class RollbackManager {
  private readonly DB_NAME = 'player-grouping-db';
  private readonly STORE_NAME = 'sqlite-data';
  private readonly BACKUP_STORE = 'backups';
  
  /**
   * 执行回滚
   * 
   * 流程：
   * 1. 获取当前用户的 Supabase 数据
   * 2. 从 Supabase 删除数据
   * 3. 从备份恢复 SQLite 数据
   * 4. 更新迁移进度状态
   */
  async rollback(type: MigrationType, backupId?: string): Promise<RollbackResult> {
    console.log(`🔄 开始回滚: ${type}`);
    
    try {
      // 1. 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('未认证用户，无法回滚');
      }
      
      // 2. 从 Supabase 删除数据
      const deletedCount = await this.deleteFromSupabase(type, userId);
      console.log(`✅ 从 Supabase 删除 ${deletedCount} 条记录`);
      
      // 3. 从备份恢复 SQLite 数据
      const restoredCount = await this.restoreFromBackup(backupId);
      console.log(`✅ 从备份恢复 ${restoredCount} 条记录`);
      
      // 4. 更新迁移进度状态
      migrationProgress.markAsRolledBack(type);
      
      console.log(`✅ 回滚完成: ${type}`);
      
      return {
        success: true,
        type,
        deletedFromSupabase: deletedCount,
        restoredFromBackup: restoredCount,
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ 回滚失败: ${errorMsg}`, error);
      
      return {
        success: false,
        type,
        deletedFromSupabase: 0,
        restoredFromBackup: 0,
        error: errorMsg,
      };
    }
  }
  
  /**
   * 从 Supabase 删除数据
   * @private
   */
  private async deleteFromSupabase(type: MigrationType, userId: string): Promise<number> {
    if (!supabase) {
      throw new Error('Supabase 不可用');
    }
    
    let deletedCount = 0;
    
    try {
      if (type === 'players') {
        // 删除球员数据（player_skills 会级联删除）
        const { data, error } = await supabase
          .from('players')
          .delete()
          .eq('user_id', userId)
          .select('id');
        
        if (error) throw error;
        
        deletedCount = data?.length || 0;
        
      } else if (type === 'grouping_history') {
        // 删除分组历史
        const { data, error } = await supabase
          .from('grouping_history')
          .delete()
          .eq('user_id', userId)
          .select('id');
        
        if (error) throw error;
        
        deletedCount = data?.length || 0;
      }
      
      return deletedCount;
      
    } catch (error) {
      console.error(`❌ 从 Supabase 删除数据失败:`, error);
      throw new DatabaseError(
        `Failed to delete from Supabase: ${type}`,
        'ROLLBACK_DELETE_ERROR',
        error as Error
      );
    }
  }
  
  /**
   * 从备份恢复 SQLite 数据
   * @private
   */
  private async restoreFromBackup(backupId?: string): Promise<number> {
    try {
      // 1. 打开 IndexedDB
      const idb = await openDB(this.DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          }
        },
      });
      
      // 2. 获取备份
      let backup: BackupInfo | null = null;
      
      if (backupId) {
        // 使用指定的备份 ID
        backup = await idb.get(this.BACKUP_STORE, backupId);
      } else {
        // 使用最新的备份
        const backups = await idb.getAll(this.BACKUP_STORE);
        if (backups.length > 0) {
          // 按时间戳降序排序
          backups.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          backup = backups[0];
        }
      }
      
      if (!backup) {
        throw new Error('没有可用的备份');
      }
      
      console.log(`💾 使用备份: ${backup.id}, 时间=${backup.timestamp}`);
      
      // 3. 恢复数据库
      await databaseService.importDatabase(backup.data);
      
      // 4. 获取恢复的记录数
      const status = databaseService.getStatus();
      const restoredCount = status.playerCount;
      
      return restoredCount;
      
    } catch (error) {
      console.error('❌ 从备份恢复失败:', error);
      throw new DatabaseError(
        'Failed to restore from backup',
        'BACKUP_RESTORE_ERROR',
        error as Error
      );
    }
  }
  
  /**
   * 创建备份（用于回滚前备份）
   */
  async createBackup(note?: string): Promise<string | null> {
    try {
      // 1. 检查数据库是否有数据
      if (!databaseService.hasData()) {
        console.warn('⚠️  数据库为空，跳过备份');
        return null;
      }
      
      // 2. 导出数据库
      const data = databaseService.exportDatabase();
      
      // 3. 保存到 IndexedDB
      const idb = await openDB(this.DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          }
        },
      });
      
      const backup: Omit<BackupInfo, 'id'> = {
        timestamp: new Date().toISOString(),
        data: new Uint8Array(data),
        note: note || 'Migration backup',
      };
      
      const id = await idb.add(this.BACKUP_STORE, backup);
      
      console.log(`💾 备份已创建: ID=${id}, 大小=${data.byteLength} bytes`);
      
      return id.toString();
      
    } catch (error) {
      console.error('❌ 创建备份失败:', error);
      return null;
    }
  }
  
  /**
   * 列出所有备份
   */
  async listBackups(): Promise<Array<{ id: string; timestamp: string; note?: string; size: number }>> {
    try {
      const idb = await openDB(this.DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          }
        },
      });
      
      const backups = await idb.getAll(this.BACKUP_STORE);
      
      return backups.map((backup: any) => ({
        id: backup.id.toString(),
        timestamp: backup.timestamp,
        note: backup.note,
        size: backup.data.byteLength,
      }));
      
    } catch (error) {
      console.error('❌ 列出备份失败:', error);
      return [];
    }
  }
  
  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const idb = await openDB(this.DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          }
        },
      });
      
      await idb.delete(this.BACKUP_STORE, parseInt(backupId, 10));
      
      console.log(`🗑️  备份已删除: ${backupId}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ 删除备份失败:', error);
      return false;
    }
  }
  
  /**
   * 验证回滚结果
   */
  async verifyRollback(type: MigrationType): Promise<{
    success: boolean;
    supabaseEmpty: boolean;
    sqliteHasData: boolean;
  }> {
    try {
      // 1. 检查 Supabase 是否为空
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('未认证用户');
      }
      
      let supabaseCount = 0;
      if (supabase) {
        if (type === 'players') {
          const { count } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          supabaseCount = count || 0;
        } else if (type === 'grouping_history') {
          const { count } = await supabase
            .from('grouping_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          supabaseCount = count || 0;
        }
      }
      
      const supabaseEmpty = supabaseCount === 0;
      
      // 2. 检查 SQLite 是否有数据
      const status = databaseService.getStatus();
      const sqliteHasData = status.playerCount > 0;
      
      return {
        success: supabaseEmpty && sqliteHasData,
        supabaseEmpty,
        sqliteHasData,
      };
      
    } catch (error) {
      console.error('❌ 验证回滚失败:', error);
      return {
        success: false,
        supabaseEmpty: false,
        sqliteHasData: false,
      };
    }
  }
}

/**
 * 导出单例实例
 */
export const rollbackManager = new RollbackManager();

/**
 * 导出类型
 */
export type { RollbackManager };
