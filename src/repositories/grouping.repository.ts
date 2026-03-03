/**
 * 分组历史仓库
 * @module repositories/grouping.repository
 * 
 * 职责：
 * - 分组历史数据的 CRUD 操作
 * - 数据映射（数据库行 <-> GroupingHistory 对象）
 * - 数据验证
 */

import { databaseService } from '../services/database';
import { DatabaseError } from '../types/database';
import type { GroupingMode, GroupingData } from '../types/database';

/**
 * 分组历史数据类型
 */
export interface GroupingHistory {
  id: number;
  createdAt: Date;
  mode: GroupingMode;
  teamCount: number;
  playerCount: number;
  balanceScore: number | null;
  data: GroupingData;  // JSON 对象
  note?: string;
}

/**
 * 创建分组历史的输入类型
 */
export type CreateGroupingHistoryInput = Omit<GroupingHistory, 'id' | 'createdAt'>;

/**
 * 分组历史仓库类
 */
export class GroupingRepository {
  /**
   * 保存分组历史
   */
  async save(history: CreateGroupingHistoryInput): Promise<number> {
    try {
      const sql = `
        INSERT INTO grouping_history (mode, team_count, player_count, balance_score, data, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      databaseService.run(sql, [
        history.mode,
        history.teamCount,
        history.playerCount,
        history.balanceScore,
        JSON.stringify(history.data),
        history.note ?? null,
      ]);

      await databaseService.save();

      // 获取最后插入的 ID
      const id = databaseService.getLastInsertId();

      console.log(`✅ 分组历史已保存: ID=${id}, 模式=${history.mode}, 球员数=${history.playerCount}`);

      return id;
    } catch (error) {
      console.error('❌ 保存分组历史失败:', error);
      throw new DatabaseError(
        'Failed to save grouping history',
        'SAVE_HISTORY_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取最近的分组历史
   */
  async getRecent(limit: number = 20): Promise<GroupingHistory[]> {
    try {
      const sql = `
        SELECT id, created_at, mode, team_count, player_count, balance_score, data, note
        FROM grouping_history
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const rows = databaseService.exec(sql, [limit]);
      return rows.map((row) => this.mapRowToGroupingHistory(row));
    } catch (error) {
      console.error('❌ 获取分组历史失败:', error);
      throw new DatabaseError(
        'Failed to get recent grouping history',
        'GET_RECENT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 获取分组历史
   */
  async getById(id: number): Promise<GroupingHistory | null> {
    try {
      const sql = `
        SELECT id, created_at, mode, team_count, player_count, balance_score, data, note
        FROM grouping_history
        WHERE id = ?
      `;

      const rows = databaseService.exec(sql, [id]);
      return rows.length > 0 ? this.mapRowToGroupingHistory(rows[0]) : null;
    } catch (error) {
      console.error('❌ 获取分组历史失败:', id, error);
      throw new DatabaseError(
        `Failed to get grouping history by id: ${id}`,
        'GET_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除分组历史
   */
  async delete(id: number): Promise<void> {
    try {
      databaseService.run('DELETE FROM grouping_history WHERE id = ?', [id]);
      await databaseService.save();
      console.log(`✅ 分组历史已删除: ID=${id}`);
    } catch (error) {
      console.error('❌ 删除分组历史失败:', id, error);
      throw new DatabaseError(
        `Failed to delete grouping history: ${id}`,
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 清空所有历史
   */
  async clearAll(): Promise<void> {
    try {
      databaseService.run('DELETE FROM grouping_history');
      await databaseService.save();
      console.log('✅ 所有分组历史已清空');
    } catch (error) {
      console.error('❌ 清空分组历史失败:', error);
      throw new DatabaseError(
        'Failed to clear all grouping history',
        'CLEAR_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据模式获取分组历史
   */
  async getByMode(mode: GroupingMode, limit: number = 20): Promise<GroupingHistory[]> {
    try {
      const sql = `
        SELECT id, created_at, mode, team_count, player_count, balance_score, data, note
        FROM grouping_history
        WHERE mode = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const rows = databaseService.exec(sql, [mode, limit]);
      return rows.map((row) => this.mapRowToGroupingHistory(row));
    } catch (error) {
      console.error('❌ 根据模式获取分组历史失败:', mode, error);
      throw new DatabaseError(
        `Failed to get grouping history by mode: ${mode}`,
        'GET_BY_MODE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取历史数量
   */
  async count(): Promise<number> {
    try {
      const rows = databaseService.exec('SELECT COUNT(*) FROM grouping_history');
      return rows[0]?.[0] as number || 0;
    } catch (error) {
      console.error('❌ 获取历史数量失败:', error);
      throw new DatabaseError(
        'Failed to count grouping history',
        'COUNT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新分组历史备注
   */
  async updateNote(id: number, note: string): Promise<void> {
    try {
      databaseService.run(
        'UPDATE grouping_history SET note = ? WHERE id = ?',
        [note, id]
      );
      await databaseService.save();
      console.log(`✅ 分组历史备注已更新: ID=${id}`);
    } catch (error) {
      console.error('❌ 更新分组历史备注失败:', id, error);
      throw new DatabaseError(
        `Failed to update grouping history note: ${id}`,
        'UPDATE_NOTE_ERROR',
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
      // 总数
      const countResult = databaseService.exec('SELECT COUNT(*) FROM grouping_history');
      const totalCount = countResult[0]?.[0] as number || 0;

      if (totalCount === 0) {
        return {
          totalCount: 0,
          modeDistribution: { '5v5': 0, '3v3': 0, 'custom': 0 },
          averageBalanceScore: null,
          averagePlayerCount: 0,
        };
      }

      // 模式分布
      const modeResult = databaseService.exec(`
        SELECT mode, COUNT(*) as count
        FROM grouping_history
        GROUP BY mode
      `);
      
      const modeDistribution: Record<GroupingMode, number> = { '5v5': 0, '3v3': 0, 'custom': 0 };
      modeResult.forEach(row => {
        const mode = row[0] as GroupingMode;
        const count = row[1] as number;
        modeDistribution[mode] = count;
      });

      // 平均平衡分
      const balanceResult = databaseService.exec(`
        SELECT AVG(balance_score)
        FROM grouping_history
        WHERE balance_score IS NOT NULL
      `);
      const averageBalanceScore = balanceResult[0]?.[0] as number | null || null;

      // 平均球员数
      const playerCountResult = databaseService.exec(`
        SELECT AVG(player_count)
        FROM grouping_history
      `);
      const averagePlayerCount = playerCountResult[0]?.[0] as number || 0;

      return {
        totalCount,
        modeDistribution,
        averageBalanceScore,
        averagePlayerCount,
      };
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
      throw new DatabaseError(
        'Failed to get grouping statistics',
        'STATISTICS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射数据库行到 GroupingHistory 对象
   * @private
   */
  private mapRowToGroupingHistory(row: any[]): GroupingHistory {
    return {
      id: row[0] as number,
      createdAt: new Date(row[1] as string),
      mode: row[2] as GroupingMode,
      teamCount: row[3] as number,
      playerCount: row[4] as number,
      balanceScore: row[5] as number | null,
      data: JSON.parse(row[6] as string) as GroupingData,
      note: row[7] as string | undefined,
    };
  }
}
