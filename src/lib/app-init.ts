/**
 * 应用初始化模块
 * @module lib/app-init
 * 
 * 职责：
 * - 初始化 Repository（Hybrid 模式）
 * - 注册到网络状态管理器
 * - 触发初始同步（如果有待同步数据）
 * - 提供应用初始化状态
 */

import { createPlayerRepository, createGroupingRepository } from '../repositories';
import { networkStatus } from './network-status';
import { HybridPlayerRepository } from '../repositories/hybrid-player.repository';
import { HybridGroupingRepository } from '../repositories/hybrid-grouping.repository';
import { SupabasePlayerRepository } from '../repositories/supabase-player.repository';

/**
 * 应用初始化状态
 */
export interface AppInitStatus {
  isInitialized: boolean;
  repositoryType: 'hybrid' | 'supabase' | 'sqlite';
  pendingSync: {
    players: number;
    groupings: number;
  };
  isOnline: boolean;
}

/**
 * 初始化状态监听器
 */
type InitListener = (status: AppInitStatus) => void;

/**
 * 应用初始化管理器
 */
class AppInitializer {
  private isInitialized: boolean = false;
  private playerRepo: any = null;
  private groupingRepo: any = null;
  private listeners: Set<InitListener> = new Set();

  /**
   * 初始化应用
   */
  async initialize(): Promise<AppInitStatus> {
    if (this.isInitialized) {
      console.log('⏭️ 应用已初始化，跳过');
      return this.getStatus();
    }

    console.log('🚀 开始初始化应用...');

    try {
      // 1. 创建 Repository 实例（Hybrid 模式）
      this.playerRepo = createPlayerRepository('hybrid');
      this.groupingRepo = createGroupingRepository('hybrid');

      // 2. 注册到网络状态管理器
      if (this.playerRepo instanceof HybridPlayerRepository && 
          this.groupingRepo instanceof HybridGroupingRepository) {
        networkStatus.registerRepositories(this.playerRepo, this.groupingRepo);
        console.log('✅ Repository 已注册到网络状态管理器');
      }

      // 3. 检查待同步数据
      let pendingPlayers = 0;
      let pendingGroupings = 0;

      if (this.playerRepo instanceof HybridPlayerRepository) {
        pendingPlayers = await this.playerRepo.getPendingChangesCount();
      }

      if (this.groupingRepo instanceof HybridGroupingRepository) {
        pendingGroupings = await this.groupingRepo.getPendingChangesCount();
      }

      // 4. 如果在线且有待同步数据，立即触发同步
      if (networkStatus.getStatus() && (pendingPlayers > 0 || pendingGroupings > 0)) {
        console.log(`🔄 检测到待同步数据: 球员 ${pendingPlayers}, 分组 ${pendingGroupings}`);
        await networkStatus.manualSync();
      }

      this.isInitialized = true;
      console.log('✅ 应用初始化完成');

      const status = this.getStatus();
      this.notifyListeners(status);

      return status;

    } catch (error) {
      console.error('❌ 应用初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取初始化状态（同步版本，返回缓存值）
   */
  getStatus(): AppInitStatus {
    let pendingPlayers = 0;
    let pendingGroupings = 0;

    // 注意：这里返回的是 Promise，在同步方法中无法直接使用
    // 在实际应用中，应该在初始化时缓存这些值
    if (this.playerRepo instanceof HybridPlayerRepository) {
      // 临时方案：从 LocalStorage 直接读取
      const data = localStorage.getItem('pending_sync_players');
      pendingPlayers = data ? JSON.parse(data).length : 0;
    }

    if (this.groupingRepo instanceof HybridGroupingRepository) {
      // 临时方案：从 LocalStorage 直接读取
      const data = localStorage.getItem('pending_sync_grouping');
      pendingGroupings = data ? JSON.parse(data).length : 0;
    }

    return {
      isInitialized: this.isInitialized,
      repositoryType: this.playerRepo instanceof HybridPlayerRepository ? 'hybrid' :
                      this.playerRepo instanceof SupabasePlayerRepository ? 'supabase' : 'sqlite',
      pendingSync: {
        players: pendingPlayers,
        groupings: pendingGroupings,
      },
      isOnline: networkStatus.getStatus(),
    };
  }

  /**
   * 添加状态监听器
   */
  addListener(listener: InitListener): () => void {
    this.listeners.add(listener);
    
    // 返回取消监听的函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(status: AppInitStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ 初始化监听器执行失败:', error);
      }
    });
  }

  /**
   * 销毁初始化管理器
   */
  destroy(): void {
    this.isInitialized = false;
    this.playerRepo = null;
    this.groupingRepo = null;
    this.listeners.clear();
    networkStatus.destroy();
    console.log('🗑️ 应用初始化管理器已销毁');
  }
}

/**
 * 单例应用初始化管理器
 */
export const appInitializer = new AppInitializer();

/**
 * React Hook: 使用应用初始化状态
 */
export function useAppInit(): {
  initialize: () => Promise<AppInitStatus>;
  getStatus: () => AppInitStatus;
  addListener: (listener: InitListener) => () => void;
} {
  return {
    initialize: appInitializer.initialize.bind(appInitializer),
    getStatus: appInitializer.getStatus.bind(appInitializer),
    addListener: appInitializer.addListener.bind(appInitializer),
  };
}
