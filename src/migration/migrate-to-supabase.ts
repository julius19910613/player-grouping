/**
 * Supabase 数据迁移工具
 * @module migration/migrate-to-supabase
 * 
 * 职责：
 * - 从 SQLite 读取数据
 * - 转换数据格式（适配 Supabase schema）
 * - 批量写入 Supabase
 * - 错误处理和重试
 * - 进度跟踪
 * - 回滚机制
 */

import { PlayerRepository } from '../repositories/player.repository';
import { GroupingRepository } from '../repositories/grouping.repository';
import { SupabasePlayerRepository } from '../repositories/supabase-player.repository';
import { SupabaseGroupingRepository } from '../repositories/supabase-grouping.repository';
import { migrationProgress, type MigrationType } from './migration-progress';
import { rollbackManager } from './rollback';
import { getOrCreateAnonymousUser } from '../lib/auth';
import { databaseService } from '../services/database';
import { DatabaseError } from '../types/database';
import type { Player } from '../types/player';

/**
 * 迁移配置
 */
export interface MigrationConfig {
  batchSize: number;        // 批量处理大小
  retryAttempts: number;    // 重试次数
  retryDelay: number;       // 重试延迟（毫秒）
  createBackup: boolean;    // 是否创建备份
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MigrationConfig = {
  batchSize: 10,
  retryAttempts: 3,
  retryDelay: 1000,
  createBackup: true,
};

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  type: MigrationType;
  total: number;
  migrated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;  // 毫秒
  backupId?: string;
}

/**
 * 迁移管理器
 */
class MigrationManager {
  private config: MigrationConfig;
  private playerRepo: PlayerRepository;
  private groupingRepo: GroupingRepository;
  private supabasePlayerRepo: SupabasePlayerRepository;
  private supabaseGroupingRepo: SupabaseGroupingRepository;
  
  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.playerRepo = new PlayerRepository();
    this.groupingRepo = new GroupingRepository();
    this.supabasePlayerRepo = new SupabasePlayerRepository();
    this.supabaseGroupingRepo = new SupabaseGroupingRepository();
  }
  
  /**
   * 执行完整迁移
   * 
   * 流程：
   * 1. 检查前置条件（认证、数据库初始化）
   * 2. 创建备份（可选）
   * 3. 迁移球员数据
   * 4. 迁移分组历史
   * 5. 验证迁移结果
   */
  async migrateAll(): Promise<{
    players: MigrationResult;
    groupingHistory: MigrationResult;
  }> {
    console.log('🚀 开始完整迁移流程...');
    
    const startTime = Date.now();
    
    // 1. 检查前置条件
    await this.checkPrerequisites();
    
    // 2. 创建备份
    let backupId: string | undefined;
    if (this.config.createBackup) {
      backupId = await rollbackManager.createBackup('Pre-migration backup') || undefined;
      if (backupId) {
        console.log(`💾 备份已创建: ${backupId}`);
      }
    }
    
    try {
      // 3. 迁移球员数据
      const playersResult = await this.migratePlayers(backupId);
      
      // 4. 迁移分组历史
      const groupingResult = await this.migrateGroupingHistory(backupId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ 完整迁移完成，总耗时: ${(duration / 1000).toFixed(2)}s`);
      
      return {
        players: playersResult,
        groupingHistory: groupingResult,
      };
      
    } catch (error) {
      console.error('❌ 迁移失败:', error);
      
      // 自动回滚
      if (backupId) {
        console.log('🔄 正在自动回滚...');
        await rollbackManager.rollback('players', backupId);
        await rollbackManager.rollback('grouping_history', backupId);
      }
      
      throw error;
    }
  }
  
  /**
   * 迁移球员数据
   */
  async migratePlayers(backupId?: string): Promise<MigrationResult> {
    console.log('📊 开始迁移球员数据...');
    
    const startTime = Date.now();
    
    try {
      // 1. 获取所有球员
      const players = await this.playerRepo.findAll();
      const total = players.length;
      
      if (total === 0) {
        console.log('ℹ️  没有球员数据需要迁移');
        return {
          success: true,
          type: 'players',
          total: 0,
          migrated: 0,
          failed: 0,
          errors: [],
          duration: Date.now() - startTime,
          backupId,
        };
      }
      
      console.log(`📊 找到 ${total} 个球员`);
      
      // 2. 初始化迁移进度
      migrationProgress.startMigration('players', total, backupId);
      
      // 3. 批量迁移
      const result = await this.batchMigratePlayers(players);
      
      // 4. 标记完成
      if (result.failed === 0) {
        migrationProgress.completeMigration('players');
      } else {
        migrationProgress.failMigration('players', `${result.failed} 个球员迁移失败`);
      }
      
      result.duration = Date.now() - startTime;
      result.backupId = backupId;
      
      console.log(`✅ 球员迁移完成: 成功=${result.migrated}, 失败=${result.failed}, 耗时=${(result.duration / 1000).toFixed(2)}s`);
      
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 球员迁移失败:', errorMsg);
      
      migrationProgress.failMigration('players', errorMsg);
      
      return {
        success: false,
        type: 'players',
        total: 0,
        migrated: 0,
        failed: 0,
        errors: [{ id: 'general', error: errorMsg }],
        duration: Date.now() - startTime,
        backupId,
      };
    }
  }
  
  /**
   * 迁移分组历史
   */
  async migrateGroupingHistory(backupId?: string): Promise<MigrationResult> {
    console.log('📊 开始迁移分组历史...');
    
    const startTime = Date.now();
    
    try {
      // 1. 获取所有分组历史
      const histories = await this.groupingRepo.getRecent(1000);  // 获取最近的 1000 条
      const total = histories.length;
      
      if (total === 0) {
        console.log('ℹ️  没有分组历史需要迁移');
        return {
          success: true,
          type: 'grouping_history',
          total: 0,
          migrated: 0,
          failed: 0,
          errors: [],
          duration: Date.now() - startTime,
          backupId,
        };
      }
      
      console.log(`📊 找到 ${total} 条分组历史`);
      
      // 2. 初始化迁移进度
      migrationProgress.startMigration('grouping_history', total, backupId);
      
      // 3. 批量迁移
      const result = await this.batchMigrateGroupingHistory(histories);
      
      // 4. 标记完成
      if (result.failed === 0) {
        migrationProgress.completeMigration('grouping_history');
      } else {
        migrationProgress.failMigration('grouping_history', `${result.failed} 条历史迁移失败`);
      }
      
      result.duration = Date.now() - startTime;
      result.backupId = backupId;
      
      console.log(`✅ 分组历史迁移完成: 成功=${result.migrated}, 失败=${result.failed}, 耗时=${(result.duration / 1000).toFixed(2)}s`);
      
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 分组历史迁移失败:', errorMsg);
      
      migrationProgress.failMigration('grouping_history', errorMsg);
      
      return {
        success: false,
        type: 'grouping_history',
        total: 0,
        migrated: 0,
        failed: 0,
        errors: [{ id: 'general', error: errorMsg }],
        duration: Date.now() - startTime,
        backupId,
      };
    }
  }
  
  /**
   * 批量迁移球员
   * @private
   */
  private async batchMigratePlayers(players: Player[]): Promise<MigrationResult> {
    const total = players.length;
    let migrated = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    // 按批次处理
    for (let i = 0; i < players.length; i += this.config.batchSize) {
      const batch = players.slice(i, i + this.config.batchSize);
      
      for (const player of batch) {
        try {
          // 重试机制
          await this.retryOperation(async () => {
            await this.supabasePlayerRepo.create({
              name: player.name,
              position: player.position,
              skills: player.skills,
            });
          });
          
          migrated++;
          
          // 更新进度
          migrationProgress.updateProgress('players', migrated);
          
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ id: player.id, error: errorMsg });
          
          // 记录错误
          migrationProgress.recordError('players', player.id, errorMsg);
          
          console.error(`❌ 迁移球员失败: ${player.name} (${player.id})`, error);
        }
      }
      
      // 批次间延迟（避免请求过快）
      if (i + this.config.batchSize < players.length) {
        await this.delay(100);
      }
    }
    
    return {
      success: failed === 0,
      type: 'players',
      total,
      migrated,
      failed,
      errors,
      duration: 0,  // 由调用方设置
    };
  }
  
  /**
   * 批量迁移分组历史
   * @private
   */
  private async batchMigrateGroupingHistory(
    histories: Array<{ id: number; createdAt: Date; mode: string; teamCount: number; playerCount: number; balanceScore: number | null; data: any; note?: string }>
  ): Promise<MigrationResult> {
    const total = histories.length;
    let migrated = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    // 按批次处理
    for (let i = 0; i < histories.length; i += this.config.batchSize) {
      const batch = histories.slice(i, i + this.config.batchSize);
      
      for (const history of batch) {
        try {
          // 重试机制
          await this.retryOperation(async () => {
            await this.supabaseGroupingRepo.save({
              mode: history.mode as any,
              teamCount: history.teamCount,
              playerCount: history.playerCount,
              balanceScore: history.balanceScore,
              data: history.data,
              note: history.note,
            });
          });
          
          migrated++;
          
          // 更新进度
          migrationProgress.updateProgress('grouping_history', migrated);
          
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ id: history.id.toString(), error: errorMsg });
          
          // 记录错误
          migrationProgress.recordError('grouping_history', history.id.toString(), errorMsg);
          
          console.error(`❌ 迁移分组历史失败: ID=${history.id}`, error);
        }
      }
      
      // 批次间延迟
      if (i + this.config.batchSize < histories.length) {
        await this.delay(100);
      }
    }
    
    return {
      success: failed === 0,
      type: 'grouping_history',
      total,
      migrated,
      failed,
      errors,
      duration: 0,  // 由调用方设置
    };
  }
  
  /**
   * 检查前置条件
   * @private
   */
  private async checkPrerequisites(): Promise<void> {
    // 1. 检查数据库是否已初始化
    if (!databaseService.isInitialized()) {
      await databaseService.init();
    }
    
    // 2. 检查是否有数据
    if (!databaseService.hasData()) {
      throw new DatabaseError(
        'SQLite 中没有数据，无需迁移',
        'NO_DATA_TO_MIGRATE'
      );
    }
    
    // 3. 检查认证状态
    const authResult = await getOrCreateAnonymousUser();
    if (authResult.error) {
      throw new DatabaseError(
        `认证失败: ${authResult.error.message}`,
        'AUTH_FAILED',
        authResult.error
      );
    }
    
    if (authResult.isOffline) {
      console.warn('⚠️  当前处于离线模式，数据将无法同步到 Supabase');
      throw new DatabaseError(
        '当前处于离线模式，无法迁移到 Supabase',
        'OFFLINE_MODE'
      );
    }
    
    // 4. 检查是否已有迁移进行中
    if (migrationProgress.hasRunningMigration()) {
      throw new DatabaseError(
        '已有迁移任务在进行中',
        'MIGRATION_IN_PROGRESS'
      );
    }
    
    console.log('✅ 前置条件检查通过');
  }
  
  /**
   * 重试操作
   * @private
   */
  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retryAttempts) {
          console.warn(`⚠️  操作失败，${this.config.retryDelay}ms 后重试 (${attempt}/${this.config.retryAttempts})...`, error);
          await this.delay(this.config.retryDelay);
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }
  
  /**
   * 延迟函数
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 验证迁移结果
   */
  async verifyMigration(): Promise<{
    valid: boolean;
    playersMatch: boolean;
    groupingHistoryMatch: boolean;
    sqliteCount: { players: number; groupingHistory: number };
    supabaseCount: { players: number; groupingHistory: number };
  }> {
    try {
      // 1. 获取 SQLite 数据数量
      const sqlitePlayers = await this.playerRepo.count();
      const sqliteHistories = await this.groupingRepo.count();
      
      // 2. 获取 Supabase 数据数量
      const supabasePlayers = await this.supabasePlayerRepo.count();
      // 注意：SupabaseGroupingRepository 需要实现 count 方法
      const supabaseHistories = 0;  // TODO: 实现 count 方法
      
      // 3. 比较数量
      const playersMatch = sqlitePlayers === supabasePlayers;
      const groupingHistoryMatch = sqliteHistories === supabaseHistories;
      
      return {
        valid: playersMatch && groupingHistoryMatch,
        playersMatch,
        groupingHistoryMatch,
        sqliteCount: {
          players: sqlitePlayers,
          groupingHistory: sqliteHistories,
        },
        supabaseCount: {
          players: supabasePlayers,
          groupingHistory: supabaseHistories,
        },
      };
      
    } catch (error) {
      console.error('❌ 验证迁移失败:', error);
      
      return {
        valid: false,
        playersMatch: false,
        groupingHistoryMatch: false,
        sqliteCount: { players: 0, groupingHistory: 0 },
        supabaseCount: { players: 0, groupingHistory: 0 },
      };
    }
  }
}

/**
 * 导出单例实例
 */
export const migrationManager = new MigrationManager();

/**
 * 导出类型
 */
export type { MigrationManager };
