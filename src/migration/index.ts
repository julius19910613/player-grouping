/**
 * 迁移模块导出
 * @module migration
 * 
 * 提供统一的迁移接口
 */

// 导出迁移管理器
export { migrationManager, type MigrationConfig, type MigrationResult } from './migrate-to-supabase';

// 导出进度跟踪
export { 
  migrationProgress, 
  type MigrationType, 
  type MigrationStatus, 
  type MigrationProgress,
  type MigrationError,
} from './migration-progress';

// 导出回滚管理器
export { rollbackManager, type RollbackResult } from './rollback';

// 导出组件
export { MigrationWizard } from '../components/MigrationWizard';

/**
 * 快速迁移函数
 * 
 * 用法：
 * ```typescript
 * import { quickMigrate } from '@/migration';
 * 
 * const result = await quickMigrate();
 * if (result.success) {
 *   console.log('迁移成功！');
 * }
 * ```
 */
export async function quickMigrate() {
  const { migrationManager } = await import('./migrate-to-supabase');
  return migrationManager.migrateAll();
}

/**
 * 快速回滚函数
 * 
 * 用法：
 * ```typescript
 * import { quickRollback } from '@/migration';
 * 
 * const result = await quickRollback('players');
 * if (result.success) {
 *   console.log('回滚成功！');
 * }
 * ```
 */
export async function quickRollback(type: 'players' | 'grouping_history') {
  const { rollbackManager } = await import('./rollback');
  return rollbackManager.rollback(type);
}

/**
 * 获取迁移状态
 * 
 * 用法：
 * ```typescript
 * import { getMigrationStatus } from '@/migration';
 * 
 * const status = getMigrationStatus();
 * console.log('球员迁移进度:', status.players?.migrated);
 * ```
 */
export function getMigrationStatus() {
  const { migrationProgress } = require('./migration-progress');
  return migrationProgress.getSummary();
}
