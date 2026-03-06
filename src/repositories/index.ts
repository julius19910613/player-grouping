/**
 * Repository 统一导出
 * @module repositories
 * 
 * 职责：
 * - 统一导出所有 Repository 类型和工厂函数
 * - 提供便捷的默认实例
 */

// 导出类型
export type { GroupingHistory, CreateGroupingHistoryInput } from './grouping.repository';

// 导出 Repository 类（供需要直接实例化的场景）
export { PlayerRepository } from './player.repository';
export { GroupingRepository } from './grouping.repository';
export { SupabasePlayerRepository } from './supabase-player.repository';
export { SupabaseGroupingRepository } from './supabase-grouping.repository';
export { HybridPlayerRepository } from './hybrid-player.repository';
export { HybridGroupingRepository } from './hybrid-grouping.repository';
export { MatchRepository } from './match.repository';
export { PlayerMatchStatsRepository } from './player-match-stats.repository';
export { SkillAdjustmentRepository } from './skill-adjustment.repository';
export { PlayerVideoRepository } from './player-video.repository';

// 导出工厂函数和配置
export {
  createPlayerRepository,
  createGroupingRepository,
  setRepositoryConfig,
  getRepositoryConfig,
  resetRepositoryInstances,
  playerRepository,
  groupingRepository,
} from './repository.factory';

export type { DataSource, RepositoryConfig } from './repository.factory';
