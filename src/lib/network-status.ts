/**
 * 网络状态监听模块
 * @module lib/network-status
 * 
 * 职责：
 * - 监听 online/offline 事件
 * - 提供网络状态 API
 * - 网络恢复时触发同步
 */

import { HybridPlayerRepository } from '../repositories/hybrid-player.repository';
import { HybridGroupingRepository } from '../repositories/hybrid-grouping.repository';

/**
 * 网络状态监听器类型
 */
type NetworkListener = (isOnline: boolean) => void;

/**
 * 网络状态管理类
 */
class NetworkStatusManager {
  private isOnline: boolean;
  private listeners: Set<NetworkListener> = new Set();
  private playerRepo: HybridPlayerRepository | null = null;
  private groupingRepo: HybridGroupingRepository | null = null;
  private syncInProgress: boolean = false;

  constructor() {
    // 初始化网络状态
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    // 绑定事件监听器
    this.bindEvents();
  }

  /**
   * 绑定网络事件监听器
   */
  private bindEvents(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    console.log('🌐 网络状态监听已启动，当前状态:', this.isOnline ? '在线' : '离线');
  }

  /**
   * 网络恢复事件处理
   */
  private async handleOnline(): Promise<void> {
    console.log('✅ 网络已恢复');
    this.isOnline = true;
    
    // 通知所有监听器
    this.notifyListeners(true);
    
    // 自动触发同步
    await this.triggerSync();
  }

  /**
   * 网络断开事件处理
   */
  private handleOffline(): void {
    console.log('⚠️ 网络已断开');
    this.isOnline = false;
    
    // 通知所有监听器
    this.notifyListeners(false);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('❌ 网络监听器执行失败:', error);
      }
    });
  }

  /**
   * 自动触发同步
   */
  private async triggerSync(): Promise<void> {
    // 避免重复同步
    if (this.syncInProgress) {
      console.log('⏭️ 同步已在进行中，跳过');
      return;
    }

    if (!this.playerRepo && !this.groupingRepo) {
      console.log('⏭️ 未注册 Repository，跳过同步');
      return;
    }

    this.syncInProgress = true;
    
    try {
      console.log('🔄 开始自动同步待处理数据...');
      
      // 同步球员数据
      if (this.playerRepo) {
        const playerPending = await this.playerRepo.getPendingChangesCount();
        if (playerPending > 0) {
          console.log(`📝 同步 ${playerPending} 个球员变更...`);
          await this.playerRepo.syncPendingChanges();
        }
      }

      // 同步分组历史
      if (this.groupingRepo) {
        const groupingPending = await this.groupingRepo.getPendingChangesCount();
        if (groupingPending > 0) {
          console.log(`📝 同步 ${groupingPending} 个分组历史变更...`);
          await this.groupingRepo.syncPendingChanges();
        }
      }

      console.log('✅ 自动同步完成');
    } catch (error) {
      console.error('❌ 自动同步失败:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 获取当前网络状态
   */
  getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * 添加网络状态监听器
   */
  addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    
    // 返回取消监听的函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 注册 Repository（用于自动同步）
   */
  registerRepositories(
    playerRepo: HybridPlayerRepository,
    groupingRepo: HybridGroupingRepository
  ): void {
    this.playerRepo = playerRepo;
    this.groupingRepo = groupingRepo;
    
    console.log('✅ Repository 已注册到网络状态管理器');
    
    // 如果当前在线且有待同步数据，立即触发同步
    if (this.isOnline) {
      this.triggerSync();
    }
  }

  /**
   * 手动触发同步（用于测试或强制同步）
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      console.warn('⚠️ 当前离线，无法同步');
      return;
    }

    await this.triggerSync();
  }

  /**
   * 销毁网络状态管理器
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    
    this.listeners.clear();
    console.log('🗑️ 网络状态监听已销毁');
  }
}

/**
 * 单例网络状态管理器
 */
export const networkStatus = new NetworkStatusManager();

/**
 * React Hook: 使用网络状态
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  addListener: (listener: NetworkListener) => () => void;
  manualSync: () => Promise<void>;
} {
  return {
    isOnline: networkStatus.getStatus(),
    addListener: networkStatus.addListener.bind(networkStatus),
    manualSync: networkStatus.manualSync.bind(networkStatus),
  };
}
