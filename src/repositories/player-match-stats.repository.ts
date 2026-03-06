/**
 * 球员比赛表现仓库
 * @module repositories/player-match-stats.repository
 * 
 * 职责：
 * - 球员比赛表现统计的 CRUD 操作
 * - 数据映射（数据库行 <-> PlayerMatchStats 对象）
 * - 数据验证
 */

import { supabase } from '../lib/supabase';
import type { PlayerMatchStats, CreatePlayerMatchStatsDTO, UpdatePlayerMatchStatsDTO } from '../types/match';
import { DatabaseError } from '../types/database';

/**
 * 球员比赛表现仓库类
 */
export class PlayerMatchStatsRepository {
  /**
   * 查找所有表现记录
   */
  async findAll(): Promise<PlayerMatchStats[]> {
    try {
      const { data, error } = await supabase!
        .from('player_match_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ 查询所有比赛表现成功: ${data?.length || 0} 条记录`);
      return data?.map(row => this.mapRowToPlayerMatchStats(row)) || [];
    } catch (error) {
      console.error('❌ 查询所有比赛表现失败:', error);
      throw new DatabaseError(
        'Failed to find all player match stats',
        'FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 查找表现记录
   */
  async findById(id: string): Promise<PlayerMatchStats | null> {
    try {
      const { data, error } = await supabase!
        .from('player_match_stats')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapRowToPlayerMatchStats(data) : null;
    } catch (error) {
      console.error('❌ 查询比赛表现失败:', id, error);
      throw new DatabaseError(
        `Failed to find player match stats by id: ${id}`,
        'FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据比赛 ID 查找表现记录
   */
  async findByMatchId(matchId: string): Promise<PlayerMatchStats[]> {
    try {
      const { data, error } = await supabase!
        .from('player_match_stats')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerMatchStats(row)) || [];
    } catch (error) {
      console.error('❌ 按比赛查询表现失败:', matchId, error);
      throw new DatabaseError(
        `Failed to find player match stats by match: ${matchId}`,
        'FIND_BY_MATCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据球员 ID 查找表现记录
   */
  async findByPlayerId(playerId: string): Promise<PlayerMatchStats[]> {
    try {
      const { data, error } = await supabase!
        .from('player_match_stats')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerMatchStats(row)) || [];
    } catch (error) {
      console.error('❌ 按球员查询表现失败:', playerId, error);
      throw new DatabaseError(
        `Failed to find player match stats by player: ${playerId}`,
        'FIND_BY_PLAYER_ERROR',
        error as Error
      );
    }
  }

  /**
   * 创建表现记录
   */
  async create(data: CreatePlayerMatchStatsDTO): Promise<PlayerMatchStats> {
    try {
      const { data: stats, error } = await supabase!
        .from('player_match_stats')
        .insert({
          match_id: data.matchId,
          player_id: data.playerId,
          team: data.team,
          points: data.points || 0,
          rebounds: data.rebounds || 0,
          assists: data.assists || 0,
          steals: data.steals || 0,
          blocks: data.blocks || 0,
          turnovers: data.turnovers || 0,
          fouls: data.fouls || 0,
          minutes_played: data.minutesPlayed || 0,
          field_goals_made: data.fieldGoalsMade || 0,
          field_goals_attempted: data.fieldGoalsAttempted || 0,
          three_pointers_made: data.threePointersMade || 0,
          three_pointers_attempted: data.threePointersAttempted || 0,
          free_throws_made: data.freeThrowsMade || 0,
          free_throws_attempted: data.freeThrowsAttempted || 0,
          plus_minus: data.plusMinus || 0,
          efficiency_rating: data.efficiencyRating,
          note: data.note,
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ 球员比赛表现已创建: ${stats.id}`);
      return this.mapRowToPlayerMatchStats(stats);
    } catch (error) {
      console.error('❌ 创建球员比赛表现失败:', error);
      throw new DatabaseError(
        'Failed to create player match stats',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新表现记录
   */
  async update(id: string, data: UpdatePlayerMatchStatsDTO): Promise<void> {
    try {
      const updateData: any = {};

      if (data.team !== undefined) updateData.team = data.team;
      if (data.points !== undefined) updateData.points = data.points;
      if (data.rebounds !== undefined) updateData.rebounds = data.rebounds;
      if (data.assists !== undefined) updateData.assists = data.assists;
      if (data.steals !== undefined) updateData.steals = data.steals;
      if (data.blocks !== undefined) updateData.blocks = data.blocks;
      if (data.turnovers !== undefined) updateData.turnovers = data.turnovers;
      if (data.fouls !== undefined) updateData.fouls = data.fouls;
      if (data.minutesPlayed !== undefined) updateData.minutes_played = data.minutesPlayed;
      if (data.fieldGoalsMade !== undefined) updateData.field_goals_made = data.fieldGoalsMade;
      if (data.fieldGoalsAttempted !== undefined) updateData.field_goals_attempted = data.fieldGoalsAttempted;
      if (data.threePointersMade !== undefined) updateData.three_pointers_made = data.threePointersMade;
      if (data.threePointersAttempted !== undefined) updateData.three_pointers_attempted = data.threePointersAttempted;
      if (data.freeThrowsMade !== undefined) updateData.free_throws_made = data.freeThrowsMade;
      if (data.freeThrowsAttempted !== undefined) updateData.free_throws_attempted = data.freeThrowsAttempted;
      if (data.plusMinus !== undefined) updateData.plus_minus = data.plusMinus;
      if (data.efficiencyRating !== undefined) updateData.efficiency_rating = data.efficiencyRating;
      if (data.note !== undefined) updateData.note = data.note;

      const { error } = await supabase!
        .from('player_match_stats')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 球员比赛表现已更新: ${id}`);
    } catch (error) {
      console.error('❌ 更新球员比赛表现失败:', id, error);
      throw new DatabaseError(
        `Failed to update player match stats: ${id}`,
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除表现记录
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('player_match_stats')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 球员比赛表现已删除: ${id}`);
    } catch (error) {
      console.error('❌ 删除球员比赛表现失败:', id, error);
      throw new DatabaseError(
        `Failed to delete player match stats: ${id}`,
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 批量创建表现记录
   */
  async createBatch(dataList: CreatePlayerMatchStatsDTO[]): Promise<PlayerMatchStats[]> {
    try {
      const insertData = dataList.map(data => ({
        match_id: data.matchId,
        player_id: data.playerId,
        team: data.team,
        points: data.points || 0,
        rebounds: data.rebounds || 0,
        assists: data.assists || 0,
        steals: data.steals || 0,
        blocks: data.blocks || 0,
        turnovers: data.turnovers || 0,
        fouls: data.fouls || 0,
        minutes_played: data.minutesPlayed || 0,
        field_goals_made: data.fieldGoalsMade || 0,
        field_goals_attempted: data.fieldGoalsAttempted || 0,
        three_pointers_made: data.threePointersMade || 0,
        three_pointers_attempted: data.threePointersAttempted || 0,
        free_throws_made: data.freeThrowsMade || 0,
        free_throws_attempted: data.freeThrowsAttempted || 0,
        plus_minus: data.plusMinus || 0,
        efficiency_rating: data.efficiencyRating,
        note: data.note,
      }));

      const { data, error } = await supabase!
        .from('player_match_stats')
        .insert(insertData)
        .select();

      if (error) throw error;

      console.log(`✅ 批量创建球员比赛表现成功: ${data?.length || 0} 条记录`);
      return data?.map(row => this.mapRowToPlayerMatchStats(row)) || [];
    } catch (error) {
      console.error('❌ 批量创建球员比赛表现失败:', error);
      throw new DatabaseError(
        'Failed to batch create player match stats',
        'BATCH_CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射数据库行到 PlayerMatchStats 对象
   * @private
   */
  private mapRowToPlayerMatchStats(row: any): PlayerMatchStats {
    return {
      id: row.id,
      matchId: row.match_id,
      playerId: row.player_id,
      team: row.team,
      points: row.points,
      rebounds: row.rebounds,
      assists: row.assists,
      steals: row.steals,
      blocks: row.blocks,
      turnovers: row.turnovers,
      fouls: row.fouls,
      minutesPlayed: row.minutes_played,
      fieldGoalsMade: row.field_goals_made,
      fieldGoalsAttempted: row.field_goals_attempted,
      threePointersMade: row.three_pointers_made,
      threePointersAttempted: row.three_pointers_attempted,
      freeThrowsMade: row.free_throws_made,
      freeThrowsAttempted: row.free_throws_attempted,
      plusMinus: row.plus_minus,
      efficiencyRating: row.efficiency_rating,
      note: row.note,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
