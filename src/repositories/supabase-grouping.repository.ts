/**
 * Supabase 分组历史仓库
 * @module repositories/supabase-grouping.repository
 * 
 * 职责：
 * - 使用 Supabase 进行分组历史数据的 CRUD 操作
 * - JSONB 数据处理
 * - 数据映射（Supabase 行 <-> GroupingHistory 对象）
 * - 使用认证的 user_id 进行数据隔离
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { DatabaseError } from '../types/database';
import type { GroupingMode, GroupingData } from '../types/database';
import type { GroupingHistory, CreateGroupingHistoryInput } from './grouping.repository';

/**
 * Supabase 分组历史仓库类
 */
export class SupabaseGroupingRepository {
  /**
   * 保存分组历史
   */
  async save(history: CreateGroupingHistoryInput): Promise<number> {
    try {
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new DatabaseError(
          '未认证用户，无法保存分组历史',
          'AUTH_REQUIRED',
          new Error('User not authenticated')
        );
      }

      const { data, error } = await supabase
        .from('grouping_history')
        .insert({
          user_id: userId,  // 🔒 关联当前用户
          mode: history.mode,
          team_count: history.teamCount,
          player_count: history.playerCount,
          balance_score: history.balanceScore,
          data: history.data as any,  // JSONB
          note: history.note ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;

      const id = data.id;

      console.log(`✅ Supabase 分组历史已保存: ID=${id}, 模式=${history.mode}, 球员数=${history.playerCount}`);

      return id;
    } catch (error) {
      console.error('❌ Supabase 保存分组历史失败:', error);
      throw new DatabaseError(
        'Failed to save grouping history to Supabase',
        'SUPABASE_SAVE_HISTORY_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取最近的分组历史
   */
  async getRecent(limit: number = 20): Promise<GroupingHistory[]> {
    try {
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ 未认证用户，无法查询分组历史');
        return [];
      }

      const { data, error } = await supabase
        .from('grouping_history')
        .select('*')
        .eq('user_id', userId)  // 🔒 仅查询当前用户的历史
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((row) => this.mapRowToGroupingHistory(row));
    } catch (error) {
      console.error('❌ Supabase 获取分组历史失败:', error);
      throw new DatabaseError(
        'Failed to get recent grouping history from Supabase',
        'SUPABASE_GET_RECENT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 获取分组历史
   */
  async getById(id: number): Promise<GroupingHistory | null> {
    try {
      const { data, error } = await supabase
        .from('grouping_history')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 未找到记录
          return null;
        }
        throw error;
      }

      return this.mapRowToGroupingHistory(data);
    } catch (error) {
      console.error('❌ Supabase 获取分组历史失败:', id, error);
      throw new DatabaseError(
        `Failed to get grouping history by id from Supabase: ${id}`,
        'SUPABASE_GET_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除分组历史
   */
  async delete(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('grouping_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ Supabase 分组历史已删除: ID=${id}`);
    } catch (error) {
      console.error('❌ Supabase 删除分组历史失败:', id, error);
      throw new DatabaseError(
        `Failed to delete grouping history from Supabase: ${id}`,
        'SUPABASE_DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 清空所有历史
   */
  async clearAll(): Promise<void> {
    try {
      const { error } = await supabase
        .from('grouping_history')
        .delete()
        .neq('id', 0);  // 删除所有记录（Supabase 需要一个过滤器）

      if (error) throw error;

      console.log('✅ Supabase 所有分组历史已清空');
    } catch (error) {
      console.error('❌ Supabase 清空分组历史失败:', error);
      throw new DatabaseError(
        'Failed to clear all grouping history from Supabase',
        'SUPABASE_CLEAR_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据模式获取分组历史
   */
  async getByMode(mode: GroupingMode, limit: number = 20): Promise<GroupingHistory[]> {
    try {
      const { data, error } = await supabase
        .from('grouping_history')
        .select('*')
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((row) => this.mapRowToGroupingHistory(row));
    } catch (error) {
      console.error('❌ Supabase 根据模式获取分组历史失败:', mode, error);
      throw new DatabaseError(
        `Failed to get grouping history by mode from Supabase: ${mode}`,
        'SUPABASE_GET_BY_MODE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取历史数量
   */
  async count(): Promise<number> {
    try {
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ 未认证用户，返回 0');
        return 0;
      }

      const { count, error } = await supabase
        .from('grouping_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);  // 🔒 仅统计当前用户的历史

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('❌ Supabase 获取历史数量失败:', error);
      throw new DatabaseError(
        'Failed to count grouping history from Supabase',
        'SUPABASE_COUNT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新分组历史备注
   */
  async updateNote(id: number, note: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('grouping_history')
        .update({ note })
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ Supabase 分组历史备注已更新: ID=${id}`);
    } catch (error) {
      console.error('❌ Supabase 更新分组历史备注失败:', id, error);
      throw new DatabaseError(
        `Failed to update grouping history note in Supabase: ${id}`,
        'SUPABASE_UPDATE_NOTE_ERROR',
        error as Error
      );
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
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ 未认证用户，返回空统计');
        return {
          totalCount: 0,
          modeDistribution: { '5v5': 0, '3v3': 0, 'custom': 0 },
          averageBalanceScore: null,
          averagePlayerCount: 0,
        };
      }

      // 1. 总数
      const totalCount = await this.count();

      if (totalCount === 0) {
        return {
          totalCount: 0,
          modeDistribution: { '5v5': 0, '3v3': 0, 'custom': 0 },
          averageBalanceScore: null,
          averagePlayerCount: 0,
        };
      }

      // 2. 模式分布
      const { data: modeData, error: modeError } = await supabase
        .from('grouping_history')
        .select('mode')
        .eq('user_id', userId);  // 🔒 仅统计当前用户

      if (modeError) throw modeError;

      const modeDistribution: Record<GroupingMode, number> = { '5v5': 0, '3v3': 0, 'custom': 0 };
      modeData.forEach((row: any) => {
        const mode = row.mode as GroupingMode;
        modeDistribution[mode] = (modeDistribution[mode] || 0) + 1;
      });

      // 3. 平均平衡分
      const { data: balanceData, error: balanceError } = await supabase
        .from('grouping_history')
        .select('balance_score')
        .eq('user_id', userId)  // 🔒 仅统计当前用户
        .not('balance_score', 'is', null);

      if (balanceError) throw balanceError;

      const averageBalanceScore = balanceData.length > 0
        ? balanceData.reduce((sum: number, row: any) => sum + (row.balance_score || 0), 0) / balanceData.length
        : null;

      // 4. 平均球员数
      const { data: playerCountData, error: playerCountError } = await supabase
        .from('grouping_history')
        .select('player_count')
        .eq('user_id', userId);  // 🔒 仅统计当前用户

      if (playerCountError) throw playerCountError;

      const averagePlayerCount = playerCountData.length > 0
        ? playerCountData.reduce((sum: number, row: any) => sum + row.player_count, 0) / playerCountData.length
        : 0;

      return {
        totalCount,
        modeDistribution,
        averageBalanceScore,
        averagePlayerCount,
      };
    } catch (error) {
      console.error('❌ Supabase 获取统计信息失败:', error);
      throw new DatabaseError(
        'Failed to get grouping statistics from Supabase',
        'SUPABASE_STATISTICS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射 Supabase 行到 GroupingHistory 对象
   * @private
   */
  private mapRowToGroupingHistory(data: any): GroupingHistory {
    return {
      id: data.id,
      createdAt: new Date(data.created_at),
      mode: data.mode as GroupingMode,
      teamCount: data.team_count,
      playerCount: data.player_count,
      balanceScore: data.balance_score,
      data: data.data as GroupingData,  // JSONB
      note: data.note ?? undefined,
    };
  }
}
