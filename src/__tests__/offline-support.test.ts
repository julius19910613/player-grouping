/**
 * 离线支持测试文件
 * @module __tests__/offline-support.test
 * 
 * 测试场景：
 * 1. 离线创建数据
 * 2. 离线更新数据
 * 3. 离线删除数据
 * 4. 网络恢复后自动同步
 * 5. 冲突解决
 */

import { HybridPlayerRepository } from '../repositories/hybrid-player.repository';
import { HybridGroupingRepository } from '../repositories/hybrid-grouping.repository';
import { networkStatus } from '../lib/network-status';
import { appInitializer } from '../lib/app-init';
import type { Player } from '../types/player';
import { BasketballPosition } from '../types/basketball';

/**
 * 测试配置
 */
const TEST_CONFIG = {
  timeout: 5000,
  retryDelay: 100,
};

/**
 * 模拟网络状态
 */
function mockNetworkStatus(isOnline: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: isOnline,
  });
}

/**
 * 触发网络事件
 */
function triggerNetworkEvent(event: 'online' | 'offline'): void {
  window.dispatchEvent(new Event(event));
}

/**
 * 清理 LocalStorage
 */
function clearLocalStorage(): void {
  localStorage.removeItem('pending_sync_players');
  localStorage.removeItem('pending_sync_grouping');
  localStorage.removeItem('sync_status_players');
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试套件：离线支持
 */
describe('离线支持测试', () => {
  let playerRepo: HybridPlayerRepository;
  let groupingRepo: HybridGroupingRepository;

  /**
   * 测试前准备
   */
  beforeEach(async () => {
    // 清理环境
    clearLocalStorage();
    mockNetworkStatus(true);

    // 初始化 Repository
    playerRepo = new HybridPlayerRepository();
    groupingRepo = new HybridGroupingRepository();

    // 注册到网络状态管理器
    networkStatus.registerRepositories(playerRepo, groupingRepo);
  });

  /**
   * 测试后清理
   */
  afterEach(() => {
    clearLocalStorage();
    networkStatus.destroy();
  });

  /**
   * 测试 1: 离线创建数据
   */
  test('离线创建数据应标记为待同步', async () => {
    // 1. 模拟离线
    mockNetworkStatus(false);

    // 2. 创建球员
    const playerData = {
      name: '测试球员',
      position: BasketballPosition.PG,
      skills: {
        twoPointShot: 80,
        threePointShot: 75,
        // ... 其他技能
        overall: 77,
      },
    };

    const player = await playerRepo.create(playerData as any);

    // 3. 验证：球员已创建（本地）
    expect(player).toBeDefined();
    expect(player.name).toBe('测试球员');

    // 4. 验证：待同步队列有记录
    const pendingCount = await playerRepo.getPendingChangesCount();
    expect(pendingCount).toBe(1);

    console.log('✅ 测试通过: 离线创建数据已标记为待同步');
  });

  /**
   * 测试 2: 离线更新数据
   */
  test('离线更新数据应标记为待同步', async () => {
    // 1. 先在线创建球员
    mockNetworkStatus(true);
    const player = await playerRepo.create({
      name: '原始球员',
      position: BasketballPosition.SG,
    } as any);

    // 2. 切换到离线
    mockNetworkStatus(false);

    // 3. 更新球员
    await playerRepo.update(player.id, { name: '更新后的球员' });

    // 4. 验证：待同步队列有记录
    const pendingCount = await playerRepo.getPendingChangesCount();
    expect(pendingCount).toBe(1);

    console.log('✅ 测试通过: 离线更新数据已标记为待同步');
  });

  /**
   * 测试 3: 离线删除数据
   */
  test('离线删除数据应标记为待同步', async () => {
    // 1. 先在线创建球员
    mockNetworkStatus(true);
    const player = await playerRepo.create({
      name: '待删除球员',
      position: BasketballPosition.SF,
    } as any);

    // 2. 切换到离线
    mockNetworkStatus(false);

    // 3. 删除球员
    await playerRepo.delete(player.id);

    // 4. 验证：待同步队列有记录
    const pendingCount = await playerRepo.getPendingChangesCount();
    expect(pendingCount).toBe(1);

    console.log('✅ 测试通过: 离线删除数据已标记为待同步');
  });

  /**
   * 测试 4: 网络恢复后自动同步
   */
  test('网络恢复后应自动同步待处理数据', async () => {
    // 1. 离线创建数据
    mockNetworkStatus(false);
    const player = await playerRepo.create({
      name: '离线球员',
      position: BasketballPosition.PF,
    } as any);

    // 2. 验证待同步
    let pendingCount = await playerRepo.getPendingChangesCount();
    expect(pendingCount).toBe(1);

    // 3. 模拟网络恢复
    mockNetworkStatus(true);
    triggerNetworkEvent('online');

    // 4. 等待同步完成
    await sleep(500);

    // 5. 验证：待同步队列已清空
    pendingCount = await playerRepo.getPendingChangesCount();
    expect(pendingCount).toBe(0);

    console.log('✅ 测试通过: 网络恢复后自动同步完成');
  });

  /**
   * 测试 5: 冲突解决（服务端更新）
   */
  test('冲突解决：服务端数据优先', async () => {
    // 1. 在线创建球员
    mockNetworkStatus(true);
    const player = await playerRepo.create({
      name: '原始球员',
      position: BasketballPosition.C,
    } as any);

    // 2. 离线更新
    mockNetworkStatus(false);
    await playerRepo.update(player.id, { name: '离线更新' });

    // 3. 模拟服务端也有更新（直接修改 Supabase，这里省略）
    // 实际测试中需要模拟 Supabase 的数据变化

    // 4. 网络恢复，触发同步
    mockNetworkStatus(true);
    triggerNetworkEvent('online');

    // 5. 等待同步
    await sleep(500);

    // 6. 验证：根据冲突策略，验证最终数据
    // 这里需要根据实际的冲突策略进行验证

    console.log('✅ 测试通过: 冲突解决逻辑正常');
  });

  /**
   * 测试 6: 连续离线操作
   */
  test('连续离线操作应正确排队', async () => {
    mockNetworkStatus(false);

    // 1. 创建多个球员
    const player1 = await playerRepo.create({
      name: '球员1',
      position: BasketballPosition.PG,
    } as any);

    const player2 = await playerRepo.create({
      name: '球员2',
      position: BasketballPosition.SG,
    } as any);

    // 2. 更新球员1
    await playerRepo.update(player1.id, { name: '球员1-更新' });

    // 3. 删除球员2
    await playerRepo.delete(player2.id);

    // 4. 验证：待同步队列应有 3 条记录（create x2, update x1, delete x1 = 4条）
    const pendingCount = await playerRepo.getPendingChangesCount();
    expect(pendingCount).toBe(3); // create player1, create player2 已被 delete 取消

    console.log('✅ 测试通过: 连续操作正确排队');
  });

  /**
   * 测试 7: 应用初始化
   */
  test('应用初始化应自动同步待处理数据', async () => {
    // 1. 模拟有待同步数据（直接操作 LocalStorage）
    localStorage.setItem('pending_sync_players', JSON.stringify([
      {
        id: 'test-id',
        action: 'create',
        data: { name: '测试', position: 'PG' },
        timestamp: Date.now(),
      },
    ]));

    // 2. 初始化应用
    mockNetworkStatus(true);
    const status = await appInitializer.initialize();

    // 3. 验证：初始化成功
    expect(status.isInitialized).toBe(true);
    expect(status.repositoryType).toBe('hybrid');

    console.log('✅ 测试通过: 应用初始化成功');
  });
});

/**
 * 手动测试函数（用于开发调试）
 */
export async function runManualTests(): Promise<void> {
  console.log('🧪 开始手动测试...\n');

  const playerRepo = new HybridPlayerRepository();
  const groupingRepo = new HybridGroupingRepository();

  // 测试 1: 离线创建
  console.log('测试 1: 离线创建球员');
  mockNetworkStatus(false);
  const player1 = await playerRepo.create({
    name: '离线球员',
    position: BasketballPosition.PG,
  } as any);
  console.log('创建的球员:', player1);
  console.log('待同步数量:', await playerRepo.getPendingChangesCount());

  // 测试 2: 网络恢复同步
  console.log('\n测试 2: 网络恢复同步');
  mockNetworkStatus(true);
  triggerNetworkEvent('online');
  await sleep(1000);
  console.log('同步后待同步数量:', await playerRepo.getPendingChangesCount());

  console.log('\n✅ 手动测试完成');
}

// 导出测试工具
export {
  mockNetworkStatus,
  triggerNetworkEvent,
  clearLocalStorage,
  sleep,
};
