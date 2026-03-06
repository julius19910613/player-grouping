/**
 * 比赛记录仓库
 * @module repositories/match.repository
 * 
 * 职责：
 * - 比赛记录的 CRUD 操作
 * - 数据映射（数据库行 <-> Match 对象）
 * - 数据验证
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import type { Match, CreateMatchDTO, UpdateMatchDTO } from '../types/match';
import { DatabaseError } from '../types/database';

/**
 * 比赛记录仓库类
 */
export class MatchRepository {
  /**
   * 查找所有比赛
   */
  async findAll(): Promise<Match[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('matches')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('match_date', { ascending: false });

      if (error) throw error;

      console.log(`✅ 查询所有比赛成功: ${data?.length || 0} 场比赛`);
      return data?.map(row => this.mapRowToMatch(row)) || [];
    } catch (error) {
      console.error('❌ 查询所有比赛失败:', error);
      throw new DatabaseError(
        'Failed to find all matches',
        'FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 查找比赛
   */
  async findById(id: string): Promise<Match | null> {
    try {
      const { data, error } = await supabase!
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapRowToMatch(data) : null;
    } catch (error) {
      console.error('❌ 查询比赛失败:', id, error);
      throw new DatabaseError(
        `Failed to find match by id: ${id}`,
        'FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 创建比赛
   */
  async create(data: CreateMatchDTO): Promise<Match> {
    try {
      const userId = await getCurrentUserId();

      const { data: match, error } = await supabase!
        .from('matches')
        .insert({
          user_id: userId,
          match_date: data.matchDate || new Date().toISOString(),
          venue: data.venue,
          mode: data.mode,
          team_a_score: data.teamAScore || 0,
          team_b_score: data.teamBScore || 0,
          winner: data.winner,
          team_a_players: data.teamAPlayers || [],
          team_b_players: data.teamBPlayers || [],
          note: data.note,
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ 比赛已创建: ${match.id}`);
      return this.mapRowToMatch(match);
    } catch (error) {
      console.error('❌ 创建比赛失败:', error);
      throw new DatabaseError(
        'Failed to create match',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新比赛
   */
  async update(id: string, data: UpdateMatchDTO): Promise<void> {
    try {
      const updateData: any = {};

      if (data.matchDate !== undefined) updateData.match_date = data.matchDate;
      if (data.venue !== undefined) updateData.venue = data.venue;
      if (data.mode !== undefined) updateData.mode = data.mode;
      if (data.teamAScore !== undefined) updateData.team_a_score = data.teamAScore;
      if (data.teamBScore !== undefined) updateData.team_b_score = data.teamBScore;
      if (data.winner !== undefined) updateData.winner = data.winner;
      if (data.teamAPlayers !== undefined) updateData.team_a_players = data.teamAPlayers;
      if (data.teamBPlayers !== undefined) updateData.team_b_players = data.teamBPlayers;
      if (data.note !== undefined) updateData.note = data.note;

      const { error } = await supabase!
        .from('matches')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 比赛已更新: ${id}`);
    } catch (error) {
      console.error('❌ 更新比赛失败:', id, error);
      throw new DatabaseError(
        `Failed to update match: ${id}`,
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除比赛
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('matches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 比赛已删除: ${id}`);
    } catch (error) {
      console.error('❌ 删除比赛失败:', id, error);
      throw new DatabaseError(
        `Failed to delete match: ${id}`,
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据日期范围查询比赛
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Match[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('matches')
        .select('*')
        .gte('match_date', startDate.toISOString())
        .lte('match_date', endDate.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('match_date', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToMatch(row)) || [];
    } catch (error) {
      console.error('❌ 按日期范围查询比赛失败:', error);
      throw new DatabaseError(
        'Failed to find matches by date range',
        'FIND_BY_DATE_RANGE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据球员 ID 查询比赛
   */
  async findByPlayerId(playerId: string): Promise<Match[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('matches')
        .select('*')
        .or(`team_a_players.cs.{${playerId}},team_b_players.cs.{${playerId}}`);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('match_date', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToMatch(row)) || [];
    } catch (error) {
      console.error('❌ 按球员查询比赛失败:', playerId, error);
      throw new DatabaseError(
        `Failed to find matches by player: ${playerId}`,
        'FIND_BY_PLAYER_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射数据库行到 Match 对象
   * @private
   */
  private mapRowToMatch(row: any): Match {
    return {
      id: row.id,
      userId: row.user_id,
      matchDate: new Date(row.match_date),
      venue: row.venue,
      mode: row.mode,
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      winner: row.winner,
      teamAPlayers: row.team_a_players || [],
      teamBPlayers: row.team_b_players || [],
      note: row.note,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
