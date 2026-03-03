/**
 * 备份和恢复工具
 * 用于在迁移过程中保护数据安全
 * 
 * @module utils/backup
 */

import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { BackupData, RollbackResult } from '../types/database';

const BACKUP_DB_NAME = 'player-grouping-backup';
const BACKUP_STORE = 'backups';
const MAX_BACKUPS = 5;
const STORAGE_KEY = 'player-grouping-data';

interface BackupRecord extends BackupData {
  id: string;
  note?: string;
}

/**
 * 备份管理器
 * 负责创建、恢复和管理数据备份
 */
export class BackupManager {
  private idb: IDBPDatabase | null = null;

  /**
   * 初始化 IndexedDB
   */
  private async initDB(): Promise<IDBPDatabase> {
    if (this.idb) return this.idb;

    this.idb = await openDB(BACKUP_DB_NAME, 1, {
      upgrade(db: any) {
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          const store = db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });

    return this.idb;
  }

  /**
   * 创建 LocalStorage 数据备份
   * @param note 备份备注
   * @returns 备份ID
   */
  async createBackup(note?: string): Promise<string> {
    try {
      const idb = await this.initDB();

      // 从 LocalStorage 读取数据
      const playersJson = localStorage.getItem(STORAGE_KEY);
      const players = playersJson ? JSON.parse(playersJson) : [];

      // 创建备份数据
      const backupId = `backup-${Date.now()}`;
      const backup: BackupRecord = {
        id: backupId,
        version: 1,
        timestamp: new Date().toISOString(),
        players: [],
        skills: [],
        groupingHistory: [],
        localStorage: {
          players: playersJson || undefined,
        },
        note: note || `备份于 ${new Date().toLocaleString('zh-CN')}`,
      };

      // 保存到 IndexedDB
      await idb.put(BACKUP_STORE, backup);

      console.log('✅ 备份已创建:', backupId, `(${players.length} 个球员)`);

      // 清理旧备份
      await this.cleanOldBackups();

      return backupId;
    } catch (error) {
      console.error('❌ 创建备份失败:', error);
      throw error;
    }
  }

  /**
   * 从备份恢复数据到 LocalStorage
   * @param backupId 备份ID
   * @returns 恢复结果
   */
  async restoreFromBackup(backupId: string): Promise<RollbackResult> {
    try {
      const idb = await this.initDB();
      const backup = await idb.get(BACKUP_STORE, backupId) as BackupRecord | undefined;

      if (!backup) {
        return {
          success: false,
          playersRestored: 0,
          error: '备份不存在',
        };
      }

      // 恢复 LocalStorage 数据
      if (backup.localStorage?.players) {
        localStorage.setItem(STORAGE_KEY, backup.localStorage.players);

        const players = JSON.parse(backup.localStorage.players);
        console.log('✅ 已从备份恢复:', backupId, `(${players.length} 个球员)`);

        return {
          success: true,
          playersRestored: players.length,
        };
      }

      return {
        success: false,
        playersRestored: 0,
        error: '备份中没有球员数据',
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
   * @returns 备份列表
   */
  async listBackups(): Promise<Array<{ id: string; timestamp: string; note: string; playerCount: number }>> {
    try {
      const idb = await this.initDB();
      const backups = await idb.getAll(BACKUP_STORE) as BackupRecord[];

      return backups
        .map((backup) => {
          const playerCount = backup.localStorage?.players
            ? JSON.parse(backup.localStorage.players).length
            : 0;

          return {
            id: backup.id,
            timestamp: backup.timestamp,
            note: backup.note || '无备注',
            playerCount,
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('❌ 获取备份列表失败:', error);
      return [];
    }
  }

  /**
   * 删除指定备份
   * @param backupId 备份ID
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const idb = await this.initDB();
      await idb.delete(BACKUP_STORE, backupId);
      console.log('✅ 备份已删除:', backupId);
    } catch (error) {
      console.error('❌ 删除备份失败:', error);
      throw error;
    }
  }

  /**
   * 清理旧备份（保留最近 N 个）
   */
  private async cleanOldBackups(): Promise<void> {
    try {
      const idb = await this.initDB();
      const backups = await idb.getAll(BACKUP_STORE) as BackupRecord[];

      if (backups.length > MAX_BACKUPS) {
        const sortedBackups = backups.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const toDelete = sortedBackups.slice(MAX_BACKUPS);
        for (const backup of toDelete) {
          await idb.delete(BACKUP_STORE, backup.id);
          console.log('🗑️  删除旧备份:', backup.id);
        }
      }
    } catch (error) {
      console.error('❌ 清理旧备份失败:', error);
    }
  }

  /**
   * 检查是否存在备份
   */
  async hasBackups(): Promise<boolean> {
    try {
      const backups = await this.listBackups();
      return backups.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取最新的备份
   */
  async getLatestBackup(): Promise<{ id: string; timestamp: string; note: string } | null> {
    try {
      const backups = await this.listBackups();
      return backups.length > 0 ? backups[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 自动备份（迁移前调用）
   * @returns 备份ID，如果没有数据则返回 null
   */
  async autoBackupBeforeMigration(): Promise<string | null> {
    try {
      const playersJson = localStorage.getItem(STORAGE_KEY);

      if (!playersJson) {
        console.log('ℹ️  无需备份：没有旧数据');
        return null;
      }

      const players = JSON.parse(playersJson);
      if (players.length === 0) {
        console.log('ℹ️  无需备份：没有球员数据');
        return null;
      }

      const backupId = await this.createBackup('迁移前自动备份');
      console.log('✅ 迁移前备份已创建:', backupId);
      return backupId;
    } catch (error) {
      console.error('❌ 自动备份失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const backupManager = new BackupManager();

// 导出便捷函数
export const createBackup = (note?: string) => backupManager.createBackup(note);
export const restoreFromBackup = (backupId: string) => backupManager.restoreFromBackup(backupId);
export const listBackups = () => backupManager.listBackups();
export const deleteBackup = (backupId: string) => backupManager.deleteBackup(backupId);
