/**
 * 混合球员仓库（Supabase + SQLite）
 * @module repositories/hybrid-player.repository
 * 
 * 职责：
 * - 优先从 Supabase 读取，成功后更新本地缓存
 * - 失败时从 SQLite 读取（离线模式）
 * - 写入时先写 Supabase，成功后同步到 SQLite
 * - 失败时仅写 SQLite，标记为待同步
 * - 网络恢复后自动同步待同步数据
 */

import { SupabasePlayerRepository } from './supabase-player.repository';
import { PlayerRepository } from './player.repository';
import type { Player } from '../types/player';
import { BasketballPosition } from '../types/basketball';


/**
 * 同步冲突解决策略
 */
type ConflictStrategy = 'server_wins' | 'client_wins' | 'latest_wins' | 'merge';

/**
 * 同步状态
 */
interface SyncStatus {
  lastSyncAt: number | null;
  pendingChanges: number;
  isOnline: boolean;
}

/**
 * 冲突记录
 */
interface Conflict {
  id: string;
  localData: Player;
  serverData: Player;
  pendingChange: PendingChange;
}

/**
 * 待同步变更
 */
interface PendingChange {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

/**
 * 混合球员仓库类
 */
export class HybridPlayerRepository {
  private supabaseRepo: SupabasePlayerRepository;
  private sqliteRepo: PlayerRepository;
  private conflictStrategy: ConflictStrategy = 'latest_wins';

  constructor() {
    this.supabaseRepo = new SupabasePlayerRepository();
    this.sqliteRepo = new PlayerRepository();
  }

  /**
   * 查找所有球员
   */
  async findAll(): Promise<Player[]> {
    try {
      // 1. 尝试从 Supabase 读取
      const players = await this.supabaseRepo.findAll();

      // 2. 更新本地缓存
      await this.updateLocalCache(players);

      // 3. 更新同步状态
      this.updateSyncStatus({ lastSyncAt: Date.now() });

      return players;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 4. 降级到 SQLite
      return this.sqliteRepo.findAll();
    }
  }

  /**
   * 根据 ID 查找球员
   */
  async findById(id: string): Promise<Player | null> {
    try {
      // 1. 尝试从 Supabase 读取
      const player = await this.supabaseRepo.findById(id);

      if (player) {
        // 2. 更新本地缓存（单个球员）
        // 注意：这里简化处理，仅在 findAll 时进行完整缓存更新
      }

      return player;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 3. 降级到 SQLite
      return this.sqliteRepo.findById(id);
    }
  }

  /**
   * 创建球员
   */
  async create(playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    try {
      // 1. 写入 Supabase
      const player = await this.supabaseRepo.create(playerData);

      // 2. 同步到 SQLite（使用 Supabase 返回的完整数据）
      await this.sqliteRepo.create({
        ...playerData,
        id: player.id,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
      } as any);

      return player;
    } catch (error) {
      console.warn('⚠️ Supabase 写入失败，仅保存本地:', error);

      // 3. 仅写入 SQLite
      const localPlayer = await this.sqliteRepo.create(playerData);

      // 4. 标记为待同步
      await this.markAsPendingSync(localPlayer.id, 'create', localPlayer);

      return localPlayer;
    }
  }

  /**
   * 更新球员
   */
  async update(id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>): Promise<void> {
    try {
      // 1. 更新 Supabase
      await this.supabaseRepo.update(id, updates);

      // 2. 同步到 SQLite
      await this.sqliteRepo.update(id, updates);
    } catch (error) {
      console.warn('⚠️ Supabase 更新失败，仅更新本地:', error);

      // 3. 仅更新 SQLite
      await this.sqliteRepo.update(id, updates);

      // 4. 标记为待同步
      await this.markAsPendingSync(id, 'update', updates);
    }
  }

  /**
   * 删除球员
   */
  async delete(id: string): Promise<void> {
    try {
      // 1. 从 Supabase 删除
      await this.supabaseRepo.delete(id);

      // 2. 从 SQLite 删除
      await this.sqliteRepo.delete(id);
    } catch (error) {
      console.warn('⚠️ Supabase 删除失败，仅删除本地:', error);

      // 3. 仅从 SQLite 删除
      await this.sqliteRepo.delete(id);

      // 4. 标记为待同步
      await this.markAsPendingSync(id, 'delete', { id });
    }
  }

  /**
   * 根据位置查找球员
   */
  async findByPosition(position: BasketballPosition): Promise<Player[]> {
    try {
      // 1. 尝试从 Supabase 读取
      const players = await this.supabaseRepo.findByPosition(position);
      return players;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 2. 降级到 SQLite
      return this.sqliteRepo.findByPosition(position);
    }
  }

  /**
   * 搜索球员（按名称）
   */
  async searchByName(name: string): Promise<Player[]> {
    try {
      // 1. 尝试从 Supabase 读取
      const players = await this.supabaseRepo.searchByName(name);
      return players;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 2. 降级到 SQLite
      return this.sqliteRepo.searchByName(name);
    }
  }

  /**
   * 获取球员数量
   */
  async count(): Promise<number> {
    try {
      // 1. 尝试从 Supabase 读取
      const count = await this.supabaseRepo.count();
      return count;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 2. 降级到 SQLite
      return this.sqliteRepo.count();
    }
  }

  /**
   * 更新本地缓存（完整实现）
   */
  private async updateLocalCache(players: Player[]): Promise<void> {
    try {
      const localPlayers = await this.sqliteRepo.findAll();

      // 1. 检测冲突（本地修改但未同步的记录）
      const conflicts = await this.detectConflicts(players, localPlayers);

      // 2. 解决冲突
      if (conflicts.length > 0) {
        console.log(`⚠️ 检测到 ${conflicts.length} 个冲突，开始解决...`);
        await this.resolveConflicts(conflicts);
      }

      // 3. 合并数据（增量更新）
      for (const serverPlayer of players) {
        const localPlayer = localPlayers.find(p => p.id === serverPlayer.id);

        if (!localPlayer) {
          // 新增：直接插入
          await this.sqliteRepo.create(serverPlayer);
        } else if (serverPlayer.updatedAt > localPlayer.updatedAt) {
          // 更新：服务端更新时间更新
          await this.sqliteRepo.update(serverPlayer.id, serverPlayer);
        }
        // 如果本地更新时间更新，保留本地数据（已在冲突解决中处理）
      }

      // 4. 删除本地已删除的记录（服务端没有但本地有）
      const serverIds = new Set(players.map(p => p.id));
      for (const localPlayer of localPlayers) {
        if (!serverIds.has(localPlayer.id)) {
          await this.sqliteRepo.delete(localPlayer.id);
        }
      }

      console.log('✅ 本地缓存更新完成');
    } catch (error) {
      console.error('❌ 更新本地缓存失败:', error);
      // 不抛出错误，允许继续使用 Supabase 数据
    }
  }

  /**
   * 检测冲突
   */
  private async detectConflicts(
    serverPlayers: Player[],
    localPlayers: Player[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const pendingChanges = await this.getPendingChanges();

    for (const localPlayer of localPlayers) {
      const serverPlayer = serverPlayers.find(p => p.id === localPlayer.id);
      const pendingChange = pendingChanges.find(c => c.id === localPlayer.id);

      // 冲突条件：本地有修改 && 服务端也有修改 && 修改时间不同
      if (
        pendingChange &&
        serverPlayer &&
        serverPlayer.updatedAt.getTime() > pendingChange.timestamp
      ) {
        conflicts.push({
          id: localPlayer.id,
          localData: localPlayer,
          serverData: serverPlayer,
          pendingChange,
        });
      }
    }

    return conflicts;
  }

  /**
   * 解决冲突（基于策略）
   */
  private async resolveConflicts(conflicts: Conflict[]): Promise<void> {
    for (const conflict of conflicts) {
      let winner: 'local' | 'server';

      switch (this.conflictStrategy) {
        case 'server_wins':
          winner = 'server';
          break;

        case 'client_wins':
          winner = 'local';
          // 将本地修改推送回服务端
          await this.supabaseRepo.update(
            conflict.id,
            conflict.localData as any
          );
          break;

        case 'latest_wins':
          // 比较更新时间
          winner =
            conflict.localData.updatedAt > conflict.serverData.updatedAt
              ? 'local'
              : 'server';
          break;

        case 'merge':
          // 合并策略（简化版：字段级别合并）
          const merged = this.mergeData(
            conflict.serverData,
            conflict.localData,
            conflict.pendingChange.data
          );
          await this.supabaseRepo.update(conflict.id, merged as any);
          await this.sqliteRepo.update(conflict.id, merged as any);
          continue;
      }

      // 应用胜利者的数据
      if (winner === 'server') {
        await this.sqliteRepo.update(conflict.id, conflict.serverData as any);
      } else {
        await this.supabaseRepo.update(conflict.id, conflict.localData as any);
      }
    }
  }

  /**
   * 合并数据（字段级别）
   */
  private mergeData(
    serverData: Player,
    _localData: Player,
    pendingData: any
  ): Partial<Player> {
    // 简化版：使用本地修改的字段，其他字段使用服务端数据
    const merged = { ...serverData };

    for (const [key, value] of Object.entries(pendingData)) {
      if (value !== undefined) {
        (merged as any)[key] = value;
      }
    }

    return merged;
  }

  /**
   * 标记为待同步
   */
  private async markAsPendingSync(
    id: string,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const pending = this.getPendingChangesFromStorage();
    
    // 移除旧的相同 ID 的记录
    const filtered = pending.filter(c => c.id !== id);
    
    // 添加新记录
    filtered.push({
      id,
      action,
      data,
      timestamp: Date.now(),
    });
    
    localStorage.setItem('pending_sync_players', JSON.stringify(filtered));
    
    console.log(`📝 标记为待同步: ${action} ${id}`);
  }

  /**
   * 获取待同步变更
   */
  private async getPendingChanges(): Promise<PendingChange[]> {
    return this.getPendingChangesFromStorage();
  }

  /**
   * 从 LocalStorage 获取待同步变更
   */
  private getPendingChangesFromStorage(): PendingChange[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    
    const data = localStorage.getItem('pending_sync_players');
    return data ? JSON.parse(data) : [];
  }

  /**
   * 更新同步状态
   */
  private updateSyncStatus(status: Partial<SyncStatus>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    const current = this.getSyncStatus();
    const updated = { ...current, ...status };
    localStorage.setItem('sync_status_players', JSON.stringify(updated));
  }

  /**
   * 获取同步状态
   */
  private getSyncStatus(): SyncStatus {
    if (typeof localStorage === 'undefined') {
      return { lastSyncAt: null, pendingChanges: 0, isOnline: false };
    }
    
    const data = localStorage.getItem('sync_status_players');
    return data
      ? JSON.parse(data)
      : { lastSyncAt: null, pendingChanges: 0, isOnline: navigator.onLine };
  }

  /**
   * 手动触发同步（网络恢复后调用）
   */
  async syncPendingChanges(): Promise<void> {
    const pending = await this.getPendingChanges();

    if (pending.length === 0) {
      console.log('✅ 无待同步数据');
      return;
    }

    console.log(`🔄 开始同步 ${pending.length} 个待处理变更...`);

    for (const change of pending) {
      try {
        switch (change.action) {
          case 'create':
            await this.supabaseRepo.create(change.data);
            break;
          case 'update':
            await this.supabaseRepo.update(change.id, change.data);
            break;
          case 'delete':
            await this.supabaseRepo.delete(change.id);
            break;
        }

        // 从待同步队列中移除
        await this.removePendingChange(change.id);
      } catch (error) {
        console.error(`❌ 同步失败 [${change.action}]:`, change.id, error);
        // 继续同步其他变更
      }
    }

    console.log('✅ 同步完成');
  }

  /**
   * 移除已同步的记录
   */
  private async removePendingChange(id: string): Promise<void> {
    const pending = this.getPendingChangesFromStorage();
    const filtered = pending.filter(c => c.id !== id);
    localStorage.setItem('pending_sync_players', JSON.stringify(filtered));
  }

  /**
   * 获取待同步数量
   */
  async getPendingChangesCount(): Promise<number> {
    const pending = await this.getPendingChanges();
    return pending.length;
  }
}
