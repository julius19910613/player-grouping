/**
 * 应用集成示例：如何在应用中集成离线支持
 * @module examples/offline-integration
 */

import { appInitializer, useAppInit } from './lib/app-init';
import { networkStatus, useNetworkStatus } from './lib/network-status';
import { createPlayerRepository, createGroupingRepository } from './repositories';

/**
 * 方式 1: 在应用启动时初始化（推荐）
 * 
 * 在 main.tsx 或 App.tsx 中调用
 */
export async function initializeApp(): Promise<void> {
  console.log('🚀 开始初始化应用...');

  try {
    // 1. 初始化应用（包括 Repository 和网络状态监听）
    const status = await appInitializer.initialize();

    console.log('✅ 应用初始化完成:', {
      repositoryType: status.repositoryType,
      isOnline: status.isOnline,
      pendingSync: status.pendingSync,
    });

    // 2. 监听网络状态变化
    const unsubscribe = networkStatus.addListener((isOnline) => {
      console.log('🌐 网络状态变化:', isOnline ? '在线' : '离线');
      
      // 可以在这里更新 UI 状态或显示通知
      if (isOnline) {
        showNotification('网络已恢复，正在同步数据...');
      } else {
        showNotification('网络已断开，您仍可继续使用离线功能');
      }
    });

    // 3. 导出清理函数（用于应用卸载时）
    window.addEventListener('beforeunload', () => {
      unsubscribe();
      appInitializer.destroy();
    });

  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    // 即使初始化失败，也允许应用继续运行（降级到纯本地模式）
  }
}

/**
 * 方式 2: 在 React 组件中使用（推荐）
 */
export function AppWithOfflineSupport() {
  const { initialize, getStatus } = useAppInit();
  const { isOnline, manualSync } = useNetworkStatus();

  // 在组件挂载时初始化
  React.useEffect(() => {
    initialize();
  }, []);

  const status = getStatus();

  return (
    <div>
      {/* 网络状态栏 */}
      <div className="network-status">
        <span>{isOnline ? '🟢 在线' : '🔴 离线'}</span>
        {status.pendingSync.players > 0 && (
          <span> ⏳ 待同步球员: {status.pendingSync.players}</span>
        )}
        {!isOnline && (
          <button onClick={manualSync} disabled>
            网络恢复后自动同步
          </button>
        )}
      </div>

      {/* 应用内容 */}
      {/* ... */}
    </div>
  );
}

/**
 * 方式 3: 手动集成（高级用法）
 */
export async function manualIntegration(): Promise<void> {
  // 1. 创建 Repository
  const playerRepo = createPlayerRepository('hybrid');
  const groupingRepo = createGroupingRepository('hybrid');

  // 2. 手动注册到网络状态管理器
  networkStatus.registerRepositories(playerRepo, groupingRepo);

  // 3. 添加网络状态监听器
  const unsubscribe = networkStatus.addListener((isOnline) => {
    console.log('网络状态:', isOnline);
  });

  // 4. 手动触发同步（如果需要）
  if (networkStatus.getStatus()) {
    await networkStatus.manualSync();
  }

  // 5. 清理（应用卸载时）
  // unsubscribe();
  // networkStatus.destroy();
}

/**
 * 方式 4: 仅使用 Repository（不使用网络状态监听）
 */
export async function repositoryOnlyMode(): Promise<void> {
  // 1. 创建 Hybrid Repository
  const playerRepo = createPlayerRepository('hybrid');

  // 2. 正常使用 Repository
  const players = await playerRepo.findAll();
  console.log('球员列表:', players);

  // 3. 创建球员（离线时自动标记为待同步）
  const newPlayer = await playerRepo.create({
    name: '测试球员',
    position: 'PG',
  } as any);

  // 4. 手动触发同步（如果需要）
  if (playerRepo instanceof HybridPlayerRepository) {
    const pendingCount = await playerRepo.getPendingChangesCount();
    if (pendingCount > 0) {
      console.log(`发现 ${pendingCount} 个待同步数据`);
      await playerRepo.syncPendingChanges();
    }
  }
}

/**
 * 辅助函数：显示通知
 */
function showNotification(message: string): void {
  // 可以集成到应用的通知系统
  console.log('📢 通知:', message);
  
  // 或者使用浏览器的通知 API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('球员分组程序', { body: message });
  }
}

/**
 * 完整示例：集成到现有应用
 */
export class OfflineSupportManager {
  private unsubscribe: (() => void) | null = null;
  private isInitialized: boolean = false;

  /**
   * 初始化离线支持
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('离线支持已初始化，跳过');
      return;
    }

    try {
      // 1. 初始化应用
      await appInitializer.initialize();

      // 2. 添加网络状态监听器
      this.unsubscribe = networkStatus.addListener((isOnline) => {
        this.handleNetworkChange(isOnline);
      });

      // 3. 标记为已初始化
      this.isInitialized = true;
      console.log('✅ 离线支持已初始化');

    } catch (error) {
      console.error('❌ 离线支持初始化失败:', error);
      throw error;
    }
  }

  /**
   * 处理网络状态变化
   */
  private handleNetworkChange(isOnline: boolean): void {
    if (isOnline) {
      console.log('✅ 网络已恢复，数据将自动同步');
      // 可以在这里显示 Toast 通知
    } else {
      console.log('⚠️ 网络已断开，已切换到离线模式');
      // 可以在这里显示 Toast 通知
    }
  }

  /**
   * 手动触发同步
   */
  async manualSync(): Promise<void> {
    if (!networkStatus.getStatus()) {
      throw new Error('当前离线，无法同步');
    }

    await networkStatus.manualSync();
    console.log('✅ 手动同步完成');
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): {
    isOnline: boolean;
    pendingSync: { players: number; groupings: number };
  } {
    const status = appInitializer.getStatus();
    return {
      isOnline: networkStatus.getStatus(),
      pendingSync: status.pendingSync,
    };
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    appInitializer.destroy();
    this.isInitialized = false;
    console.log('🗑️ 离线支持已销毁');
  }
}

/**
 * 使用示例
 */
export async function exampleUsage(): Promise<void> {
  // 创建管理器实例
  const offlineManager = new OfflineSupportManager();

  // 初始化
  await offlineManager.initialize();

  // 检查同步状态
  const status = offlineManager.getSyncStatus();
  console.log('同步状态:', status);

  // 手动同步（如果需要）
  if (status.isOnline && status.pendingSync.players > 0) {
    await offlineManager.manualSync();
  }

  // 应用卸载时清理
  // offlineManager.destroy();
}

// 导出所有集成方式
export default {
  initializeApp,
  AppWithOfflineSupport,
  manualIntegration,
  repositoryOnlyMode,
  OfflineSupportManager,
  exampleUsage,
};
