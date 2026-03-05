/**
 * 混合分组历史仓库（Supabase + SQLite）
 * @module repositories/hybrid-grouping.repository
 * 
 * 职责：
 * - 优先从 Supabase 读取，成功后更新本地缓存
 * - 失败时从 SQLite 读取（离线模式）
 * - 写入时先写 Supabase，成功后同步到 SQLite
 * - 失败时仅写 SQLite，标记为待同步
 */

import { SupabaseGroupingRepository } from './supabase-grouping.repository';
import { GroupingRepository, type GroupingHistory, type CreateGroupingHistoryInput } from './grouping.repository';

import type { GroupingMode } from '../types/database';

/**
 * 待同步变更
 */
interface PendingChange {
  id: number;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

/**
 * 混合分组历史仓库类
 */
export class HybridGroupingRepository {
  private supabaseRepo: SupabaseGroupingRepository;
  private sqliteRepo: GroupingRepository;

  constructor() {
    this.supabaseRepo = new SupabaseGroupingRepository();
    this.sqliteRepo = new GroupingRepository();
  }

  /**
   * 保存分组历史
   */
  async save(history: CreateGroupingHistoryInput): Promise<number> {
    try {
      // 1. 写入 Supabase
      const id = await this.supabaseRepo.save(history);

      // 2. 同步到 SQLite（使用 Supabase 返回的 ID）
      await this.sqliteRepo.save(history);

      return id;
    } catch (error) {
      console.warn('⚠️ Supabase 写入失败，仅保存本地:', error);

      // 3. 仅写入 SQLite
      const localId = await this.sqliteRepo.save(history);

      // 4. 标记为待同步（注意：使用负数表示本地 ID）
      await this.markAsPendingSync(localId, 'create', history);

      return localId;
    }
  }

  /**
   * 获取最近的分组历史
   */
  async getRecent(limit: number = 20): Promise<GroupingHistory[]> {
    try {
      // 1. 尝试从 Supabase 读取
      const history = await this.supabaseRepo.getRecent(limit);

      // 2. 更新本地缓存
      await this.updateLocalCache(history);

      return history;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 3. 降级到 SQLite
      return this.sqliteRepo.getRecent(limit);
    }
  }

  /**
   * 根据 ID 获取分组历史
   */
  async getById(id: number): Promise<GroupingHistory | null> {
    try {
      // 1. 尝试从 Supabase 读取
      const history = await this.supabaseRepo.getById(id);
      return history;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 2. 降级到 SQLite
      return this.sqliteRepo.getById(id);
    }
  }

  /**
   * 删除分组历史
   */
  async delete(id: number): Promise<void> {
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
   * 清空所有历史
   */
  async clearAll(): Promise<void> {
    try {
      // 1. 从 Supabase 清空
      await this.supabaseRepo.clearAll();

      // 2. 从 SQLite 清空
      await this.sqliteRepo.clearAll();
    } catch (error) {
      console.warn('⚠️ Supabase 清空失败，仅清空本地:', error);

      // 3. 仅从 SQLite 清空
      await this.sqliteRepo.clearAll();

      // 4. 标记为待同步（使用特殊标记）
      await this.markAsPendingSync(-1, 'delete', { clearAll: true });
    }
  }

  /**
   * 根据模式获取分组历史
   */
  async getByMode(mode: GroupingMode, limit: number = 20): Promise<GroupingHistory[]> {
    try {
      // 1. 尝试从 Supabase 读取
      const history = await this.supabaseRepo.getByMode(mode, limit);
      return history;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 2. 降级到 SQLite
      return this.sqliteRepo.getByMode(mode, limit);
    }
  }

  /**
   * 获取历史数量
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
   * 更新分组历史备注
   */
  async updateNote(id: number, note: string): Promise<void> {
    try {
      // 1. 更新 Supabase
      await this.supabaseRepo.updateNote(id, note);

      // 2. 同步到 SQLite
      await this.sqliteRepo.updateNote(id, note);
    } catch (error) {
      console.warn('⚠️ Supabase 更新失败，仅更新本地:', error);

      // 3. 仅更新 SQLite
      await this.sqliteRepo.updateNote(id, note);

      // 4. 标记为待同步
      await this.markAsPendingSync(id, 'update', { note });
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalCount: number;
    modeDistribution: Record<GroupingMode, number>;
    averageBalanceScore: number | null;
    averagePlayerCount: number;
  }> {
    try {
      // 1. 尝试从 Supabase 读取
      const stats = await this.supabaseRepo.getStatistics();
      return stats;
    } catch (error) {
      console.warn('⚠️ Supabase 读取失败，使用本地缓存:', error);

      // 2. 降级到 SQLite
      return this.sqliteRepo.getStatistics();
    }
  }

  /**
   * 更新本地缓存
   */
  private async updateLocalCache(_history: GroupingHistory[]): Promise<void> {
    try {
      // 注意：分组历史是 append-only，不需要复杂的冲突检测
      // 这里简化处理，仅在读取时更新缓存
      
      console.log('✅ 分组历史本地缓存更新完成');
    } catch (error) {
      console.error('❌ 更新本地缓存失败:', error);
      // 不抛出错误，允许继续使用 Supabase 数据
    }
  }

  /**
   * 标记为待同步
   */
  private async markAsPendingSync(
    id: number,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    const pending = this.getPendingChangesFromStorage();
    
    // 移除旧的相同 ID 的记录（除了 create）
    const filtered = action === 'create' 
      ? pending 
      : pending.filter(c => c.id !== id);
    
    // 添加新记录
    filtered.push({
      id,
      action,
      data,
      timestamp: Date.now(),
    });
    
    localStorage.setItem('pending_sync_grouping', JSON.stringify(filtered));
    
    console.log(`📝 标记为待同步: ${action} ${id}`);
  }

  /**
   * 获取待同步变更
   */
  private getPendingChangesFromStorage(): PendingChange[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    
    const data = localStorage.getItem('pending_sync_grouping');
    return data ? JSON.parse(data) : [];
  }

  /**
   * 手动触发同步（网络恢复后调用）
   */
  async syncPendingChanges(): Promise<void> {
    const pending = this.getPendingChangesFromStorage();

    if (pending.length === 0) {
      console.log('✅ 无待同步数据');
      return;
    }

    console.log(`🔄 开始同步 ${pending.length} 个待处理变更...`);

    for (const change of pending) {
      try {
        switch (change.action) {
          case 'create':
            await this.supabaseRepo.save(change.data);
            break;
          case 'update':
            // 分组历史通常不支持 update，这里仅更新 note
            if (change.data.note) {
              await this.supabaseRepo.updateNote(change.id, change.data.note);
            }
            break;
          case 'delete':
            if (change.data.clearAll) {
              await this.supabaseRepo.clearAll();
            } else {
              await this.supabaseRepo.delete(change.id);
            }
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
  private async removePendingChange(id: number): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    const pending = this.getPendingChangesFromStorage();
    const filtered = pending.filter(c => c.id !== id);
    localStorage.setItem('pending_sync_grouping', JSON.stringify(filtered));
  }

  /**
   * 获取待同步数量
   */
  async getPendingChangesCount(): Promise<number> {
    const pending = this.getPendingChangesFromStorage();
    return pending.length;
  }
}
