/**
 * 迁移进度跟踪模块
 * @module migration/migration-progress
 * 
 * 职责：
 * - 跟踪迁移进度（成功/失败数量）
 * - 持久化进度到 LocalStorage（支持断点续传）
 * - 提供进度查询和重置功能
 */

/**
 * 迁移类型
 */
export type MigrationType = 'players' | 'grouping_history';

/**
 * 迁移状态
 */
export type MigrationStatus = 'idle' | 'running' | 'completed' | 'failed' | 'rolled_back';

/**
 * 迁移进度详情
 */
export interface MigrationProgress {
  // 基本信息
  type: MigrationType;
  status: MigrationStatus;
  startedAt: string;  // ISO timestamp
  updatedAt: string;  // ISO timestamp
  
  // 统计信息
  total: number;      // 总记录数
  migrated: number;   // 已迁移数量
  failed: number;     // 失败数量
  
  // 错误详情
  errors: MigrationError[];
  
  // 备份信息
  backupId?: string;  // SQLite 备份 ID
}

/**
 * 迁移错误
 */
export interface MigrationError {
  id: string;         // 记录 ID
  error: string;      // 错误信息
  timestamp: string;  // ISO timestamp
  retryCount: number; // 重试次数
}

/**
 * 进度管理器
 */
class MigrationProgressManager {
  private readonly STORAGE_KEY = 'supabase-migration-progress';
  
  /**
   * 初始化迁移进度
   */
  startMigration(type: MigrationType, total: number, backupId?: string): MigrationProgress {
    const progress: MigrationProgress = {
      type,
      status: 'running',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total,
      migrated: 0,
      failed: 0,
      errors: [],
      backupId,
    };
    
    this.saveProgress(progress);
    console.log(`📊 迁移开始: ${type}, 总数=${total}`);
    
    return progress;
  }
  
  /**
   * 更新迁移进度（成功）
   */
  updateProgress(type: MigrationType, migrated: number): MigrationProgress | null {
    const progress = this.getProgress(type);
    if (!progress) return null;
    
    progress.migrated = migrated;
    progress.updatedAt = new Date().toISOString();
    
    this.saveProgress(progress);
    
    // 计算百分比
    const percentage = Math.round((migrated / progress.total) * 100);
    console.log(`📊 迁移进度: ${type} ${migrated}/${progress.total} (${percentage}%)`);
    
    return progress;
  }
  
  /**
   * 记录迁移错误
   */
  recordError(type: MigrationType, id: string, error: string): MigrationProgress | null {
    const progress = this.getProgress(type);
    if (!progress) return null;
    
    // 检查是否已存在该记录的错误
    const existingError = progress.errors.find(e => e.id === id);
    if (existingError) {
      existingError.retryCount++;
      existingError.error = error;
      existingError.timestamp = new Date().toISOString();
    } else {
      progress.errors.push({
        id,
        error,
        timestamp: new Date().toISOString(),
        retryCount: 1,
      });
      progress.failed++;
    }
    
    progress.updatedAt = new Date().toISOString();
    this.saveProgress(progress);
    
    console.error(`❌ 迁移错误: ${type} ID=${id}, 错误=${error}`);
    
    return progress;
  }
  
  /**
   * 完成迁移
   */
  completeMigration(type: MigrationType): MigrationProgress | null {
    const progress = this.getProgress(type);
    if (!progress) return null;
    
    progress.status = 'completed';
    progress.updatedAt = new Date().toISOString();
    
    this.saveProgress(progress);
    
    console.log(`✅ 迁移完成: ${type}, 成功=${progress.migrated}, 失败=${progress.failed}`);
    
    return progress;
  }
  
  /**
   * 标记迁移失败
   */
  failMigration(type: MigrationType, error: string): MigrationProgress | null {
    const progress = this.getProgress(type);
    if (!progress) return null;
    
    progress.status = 'failed';
    progress.updatedAt = new Date().toISOString();
    
    // 记录总体错误
    progress.errors.push({
      id: 'general',
      error,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
    
    this.saveProgress(progress);
    
    console.error(`❌ 迁移失败: ${type}, 原因=${error}`);
    
    return progress;
  }
  
  /**
   * 标记已回滚
   */
  markAsRolledBack(type: MigrationType): MigrationProgress | null {
    const progress = this.getProgress(type);
    if (!progress) return null;
    
    progress.status = 'rolled_back';
    progress.updatedAt = new Date().toISOString();
    
    this.saveProgress(progress);
    
    console.log(`🔄 已回滚: ${type}`);
    
    return progress;
  }
  
  /**
   * 获取迁移进度
   */
  getProgress(type: MigrationType): MigrationProgress | null {
    const allProgress = this.getAllProgress();
    return allProgress[type] || null;
  }
  
  /**
   * 获取所有迁移进度
   */
  getAllProgress(): Record<MigrationType, MigrationProgress | null> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return {
        players: null,
        grouping_history: null,
      };
    }
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ 解析迁移进度失败:', error);
      return {
        players: null,
        grouping_history: null,
      };
    }
  }
  
  /**
   * 清除迁移进度
   */
  clearProgress(type?: MigrationType): void {
    if (type) {
      const allProgress = this.getAllProgress();
      allProgress[type] = null;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allProgress));
      console.log(`🗑️  清除迁移进度: ${type}`);
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️  清除所有迁移进度');
    }
  }
  
  /**
   * 检查是否有进行中的迁移
   */
  hasRunningMigration(): boolean {
    const allProgress = this.getAllProgress();
    return Object.values(allProgress).some(
      p => p !== null && p.status === 'running'
    );
  }
  
  /**
   * 获取迁移摘要
   */
  getSummary(): {
    players: MigrationProgress | null;
    groupingHistory: MigrationProgress | null;
    hasRunningMigration: boolean;
  } {
    const allProgress = this.getAllProgress();
    
    return {
      players: allProgress.players,
      groupingHistory: allProgress.grouping_history,
      hasRunningMigration: this.hasRunningMigration(),
    };
  }
  
  /**
   * 保存进度到 LocalStorage
   * @private
   */
  private saveProgress(progress: MigrationProgress): void {
    const allProgress = this.getAllProgress();
    allProgress[progress.type] = progress;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allProgress));
  }
}

/**
 * 导出单例实例
 */
export const migrationProgress = new MigrationProgressManager();

/**
 * 导出类型
 */
export type { MigrationProgressManager };
