/**
 * 数据迁移工具
 * 负责从 LocalStorage 迁移数据到 SQLite
 * 
 * @module utils/migration
 */

import { Storage } from './storage';
import { backupManager } from './backup';
import { PlayerRepository } from '../repositories/player.repository';
import { databaseService } from '../services/database';
import type { MigrationResult } from '../types/database';
import { MigrationError } from '../types/database';

/**
 * 从 LocalStorage 迁移数据到 SQLite
 * 
 * 流程：
 * 1. 从 LocalStorage 加载旧数据
 * 2. 创建备份
 * 3. 迁移数据到 SQLite
 * 4. 验证迁移结果
 * 5. 清空 LocalStorage（仅在成功时）
 */
export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  try {
    console.log('🔄 开始迁移流程...');

    // 1. 从 LocalStorage 加载旧数据
    const oldPlayers = Storage.loadPlayers();
    console.log(`📊 找到 ${oldPlayers.length} 个旧球员数据`);

    if (oldPlayers.length === 0) {
      console.log('ℹ️  无需迁移：没有旧数据');
      return { success: true, playersMigrated: 0 };
    }

    // 2. 确保数据库已初始化
    if (!databaseService.isInitialized()) {
      await databaseService.init();
    }

    // 3. 检查是否已经有数据
    if (databaseService.hasData()) {
      console.log('⚠️  数据库中已有数据，跳过迁移');
      return {
        success: false,
        playersMigrated: 0,
        error: '数据库中已有数据，跳过迁移',
      };
    }

    // 4. 创建备份（重要！）
    const backupId = await backupManager.autoBackupBeforeMigration();
    if (backupId) {
      console.log('💾 备份已创建:', backupId);
    }

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
        await rollbackMigration(backupId);
      }
      
      return {
        success: false,
        playersMigrated: 0,
        error: '迁移验证失败，已自动回滚',
        backupId: backupId || undefined,
      };
    }

    // 7. 清除旧数据（仅在迁移成功后）
    if (migratedCount === oldPlayers.length) {
      Storage.clear();
      console.log('🗑️  LocalStorage 旧数据已清除');
    }

    console.log(`✅ 迁移完成: ${migratedCount}/${oldPlayers.length} 个球员`);

    if (errors.length > 0) {
      console.warn(`⚠️  有 ${errors.length} 个错误:`, errors);
    }

    return {
      success: true,
      playersMigrated: migratedCount,
      backupId: backupId || undefined,
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
 * 
 * 条件：
 * - LocalStorage 中有数据
 * - SQLite 中没有数据
 */
export function needsMigration(): boolean {
  const oldPlayers = Storage.loadPlayers();
  return oldPlayers.length > 0 && !databaseService.hasData();
}

/**
 * 回滚到迁移前状态
 * 
 * @param backupId 备份ID（可选，默认使用最新备份）
 */
export async function rollbackMigration(backupId?: string): Promise<void> {
  try {
    console.log('🔄 开始回滚...');

    // 如果没有指定备份 ID，使用最新的备份
    if (!backupId) {
      const backups = await backupManager.listBackups();
      if (backups.length === 0) {
        throw new MigrationError('没有可用的备份');
      }
      backupId = backups[0].id;
    }

    // 恢复备份到 LocalStorage
    const result = await backupManager.restoreFromBackup(backupId);

    if (result.success) {
      // 清空 SQLite 数据
      await databaseService.clear();
      
      console.log(`✅ 回滚成功: 恢复了 ${result.playersRestored} 个球员`);
    } else {
      throw new MigrationError(result.error || '回滚失败');
    }
  } catch (error) {
    console.error('❌ 回滚失败:', error);
    throw error;
  }
}

/**
 * 验证迁移完整性
 * 
 * 检查：
 * - 旧数据已清除（或数量匹配）
 * - SQLite 中有数据
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

/**
 * 获取迁移状态
 */
export async function getMigrationStatus(): Promise<{
  needsMigration: boolean;
  oldPlayerCount: number;
  newPlayerCount: number;
  hasBackups: boolean;
  latestBackup?: { id: string; timestamp: string; note: string };
}> {
  const oldPlayers = Storage.loadPlayers();
  const status = databaseService.getStatus();
  const hasBackups = await backupManager.hasBackups();
  const latestBackup = await backupManager.getLatestBackup();

  return {
    needsMigration: needsMigration(),
    oldPlayerCount: oldPlayers.length,
    newPlayerCount: status.playerCount,
    hasBackups,
    latestBackup: latestBackup || undefined,
  };
}

/**
 * 执行完整的迁移流程（带用户确认）
 * 
 * 适用于首次启动应用时的自动迁移
 */
export async function performMigration(): Promise<MigrationResult> {
  try {
    // 检查是否需要迁移
    if (!needsMigration()) {
      console.log('ℹ️  不需要迁移');
      return { success: true, playersMigrated: 0 };
    }

    // 执行迁移
    const result = await migrateFromLocalStorage();

    // 验证迁移结果
    if (result.success && !verifyMigration()) {
      return {
        success: false,
        playersMigrated: 0,
        error: '迁移验证失败',
        backupId: result.backupId,
      };
    }

    return result;
  } catch (error) {
    console.error('❌ 迁移流程失败:', error);
    return {
      success: false,
      playersMigrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
