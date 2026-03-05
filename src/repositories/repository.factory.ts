/**
 * Repository 工厂
 * @module repositories/repository.factory
 * 
 * 职责：
 * - 提供统一的 Repository 实例创建
 * - 支持切换不同的数据源（SQLite/Supabase/Hybrid）
 * - 单例模式管理
 */

import { PlayerRepository } from './player.repository';
import { GroupingRepository } from './grouping.repository';
import { SupabasePlayerRepository } from './supabase-player.repository';
import { SupabaseGroupingRepository } from './supabase-grouping.repository';
import { HybridPlayerRepository } from './hybrid-player.repository';
import { HybridGroupingRepository } from './hybrid-grouping.repository';
import { supabaseConfig } from '../lib/supabase';

/**
 * 数据源类型
 */
export type DataSource = 'sqlite' | 'supabase' | 'hybrid';

/**
 * Repository 配置
 */
export interface RepositoryConfig {
  player: DataSource;
  grouping: DataSource;
}

/**
 * 默认配置（优先使用 Hybrid，如果 Supabase 不可用则降级到 SQLite）
 */
const DEFAULT_CONFIG: RepositoryConfig = {
  player: 'hybrid',
  grouping: 'hybrid',
};

/**
 * 当前配置
 */
let currentConfig: RepositoryConfig = { ...DEFAULT_CONFIG };

/**
 * Repository 实例缓存（单例）
 */
let playerRepositoryInstance: PlayerRepository | SupabasePlayerRepository | HybridPlayerRepository | null = null;
let groupingRepositoryInstance: GroupingRepository | SupabaseGroupingRepository | HybridGroupingRepository | null = null;

/**
 * 创建球员 Repository
 */
export function createPlayerRepository(
  source?: DataSource
): PlayerRepository | SupabasePlayerRepository | HybridPlayerRepository {
  const dataSource = source || currentConfig.player;

  // 如果 Supabase 未配置，强制降级到 SQLite
  const effectiveSource = shouldUseSupabase() ? dataSource : 'sqlite';

  // 如果已存在实例且数据源相同，直接返回
  if (playerRepositoryInstance && getSourceFromInstance(playerRepositoryInstance) === effectiveSource) {
    return playerRepositoryInstance;
  }

  // 创建新实例
  switch (effectiveSource) {
    case 'sqlite':
      playerRepositoryInstance = new PlayerRepository();
      break;
    case 'supabase':
      playerRepositoryInstance = new SupabasePlayerRepository();
      break;
    case 'hybrid':
      playerRepositoryInstance = new HybridPlayerRepository();
      break;
    default:
      throw new Error(`Unknown data source: ${effectiveSource}`);
  }

  console.log(`✅ 球员 Repository 已创建: ${effectiveSource}`);
  return playerRepositoryInstance;
}

/**
 * 创建分组历史 Repository
 */
export function createGroupingRepository(
  source?: DataSource
): GroupingRepository | SupabaseGroupingRepository | HybridGroupingRepository {
  const dataSource = source || currentConfig.grouping;

  // 如果 Supabase 未配置，强制降级到 SQLite
  const effectiveSource = shouldUseSupabase() ? dataSource : 'sqlite';

  // 如果已存在实例且数据源相同，直接返回
  if (groupingRepositoryInstance && getSourceFromInstance(groupingRepositoryInstance) === effectiveSource) {
    return groupingRepositoryInstance;
  }

  // 创建新实例
  switch (effectiveSource) {
    case 'sqlite':
      groupingRepositoryInstance = new GroupingRepository();
      break;
    case 'supabase':
      groupingRepositoryInstance = new SupabaseGroupingRepository();
      break;
    case 'hybrid':
      groupingRepositoryInstance = new HybridGroupingRepository();
      break;
    default:
      throw new Error(`Unknown data source: ${effectiveSource}`);
  }

  console.log(`✅ 分组历史 Repository 已创建: ${effectiveSource}`);
  return groupingRepositoryInstance;
}

/**
 * 设置数据源配置
 */
export function setRepositoryConfig(config: Partial<RepositoryConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  
  // 清除实例缓存（下次创建时使用新配置）
  playerRepositoryInstance = null;
  groupingRepositoryInstance = null;

  console.log('📝 Repository 配置已更新:', currentConfig);
}

/**
 * 获取当前配置
 */
export function getRepositoryConfig(): RepositoryConfig {
  return { ...currentConfig };
}

/**
 * 检查是否应该使用 Supabase
 */
function shouldUseSupabase(): boolean {
  // 检查配置是否存在
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    return false;
  }
  
  // 检查客户端是否成功创建
  // 注意：supabase 客户端可能为 null（如果配置缺失）
  return true;
}

/**
 * 从实例推断数据源类型
 */
function getSourceFromInstance(instance: any): DataSource {
  if (instance instanceof HybridPlayerRepository || instance instanceof HybridGroupingRepository) {
    return 'hybrid';
  }
  if (instance instanceof SupabasePlayerRepository || instance instanceof SupabaseGroupingRepository) {
    return 'supabase';
  }
  return 'sqlite';
}

/**
 * 重置实例缓存（用于测试）
 */
export function resetRepositoryInstances(): void {
  playerRepositoryInstance = null;
  groupingRepositoryInstance = null;
  currentConfig = { ...DEFAULT_CONFIG };
  console.log('🗑️ Repository 实例缓存已重置');
}

/**
 * 导出默认实例（便捷访问）
 */
export const playerRepository = createPlayerRepository();
export const groupingRepository = createGroupingRepository();
