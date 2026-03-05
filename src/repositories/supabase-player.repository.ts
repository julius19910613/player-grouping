/**
 * Supabase 球员仓库
 * @module repositories/supabase-player.repository
 * 
 * 职责：
 * - 使用 Supabase 进行球员数据的 CRUD 操作
 * - 处理 players 和 player_skills 的关联操作
 * - 数据映射（Supabase 行 <-> Player 对象）
 * - 使用认证的 user_id 进行数据隔离
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import type { Player } from '../types/player';
import { BasketballPosition, calculateOverallSkill } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';
import { DatabaseError } from '../types/database';

/**
 * Supabase 球员仓库类
 */
export class SupabasePlayerRepository {
  /**
   * 查找所有球员
   */
  async findAll(): Promise<Player[]> {
    try {
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ 未认证用户，无法查询球员');
        return [];
      }

      const { data, error } = await supabase!
        .from('players')
        .select(`
          id,
          name,
          position,
          created_at,
          updated_at,
          player_skills (
            two_point_shot,
            three_point_shot,
            free_throw,
            passing,
            ball_control,
            court_vision,
            perimeter_defense,
            interior_defense,
            steals,
            blocks,
            offensive_rebound,
            defensive_rebound,
            speed,
            strength,
            stamina,
            vertical,
            basketball_iq,
            teamwork,
            clutch,
            overall,
            updated_at
          )
        `)
        .eq('user_id', userId)  // 🔒 仅查询当前用户的球员
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(row => this.mapRowToPlayer(row));
    } catch (error) {
      console.error('❌ Supabase 查询所有球员失败:', error);
      throw new DatabaseError(
        'Failed to find all players from Supabase',
        'SUPABASE_FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 查找球员
   */
  async findById(id: string): Promise<Player | null> {
    try {
      const { data, error } = await supabase!
        .from('players')
        .select(`
          id,
          name,
          position,
          created_at,
          updated_at,
          player_skills (
            two_point_shot,
            three_point_shot,
            free_throw,
            passing,
            ball_control,
            court_vision,
            perimeter_defense,
            interior_defense,
            steals,
            blocks,
            offensive_rebound,
            defensive_rebound,
            speed,
            strength,
            stamina,
            vertical,
            basketball_iq,
            teamwork,
            clutch,
            overall,
            updated_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 未找到记录
          return null;
        }
        throw error;
      }

      return this.mapRowToPlayer(data);
    } catch (error) {
      console.error('❌ Supabase 查询球员失败:', id, error);
      throw new DatabaseError(
        `Failed to find player by id from Supabase: ${id}`,
        'SUPABASE_FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 创建球员
   */
  async create(playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    try {
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new DatabaseError(
          '未认证用户，无法创建球员',
          'AUTH_REQUIRED',
          new Error('User not authenticated')
        );
      }

      // 1. 插入 player
      const { data: player, error: playerError } = await supabase!
        .from('players')
        .insert({
          user_id: userId,  // 🔒 关联当前用户
          name: playerData.name,
          position: playerData.position,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // 2. 插入 skills（Supabase 会自动计算 overall，但我们也在前端计算以验证）
      const overall = calculateOverallSkill(
        playerData.skills as Omit<BasketballSkills, 'overall'>,
        playerData.position
      );

      const { error: skillsError } = await supabase!
        .from('player_skills')
        .insert({
          player_id: player.id,
          two_point_shot: playerData.skills.twoPointShot,
          three_point_shot: playerData.skills.threePointShot,
          free_throw: playerData.skills.freeThrow,
          passing: playerData.skills.passing,
          ball_control: playerData.skills.ballControl,
          court_vision: playerData.skills.courtVision,
          perimeter_defense: playerData.skills.perimeterDefense,
          interior_defense: playerData.skills.interiorDefense,
          steals: playerData.skills.steals,
          blocks: playerData.skills.blocks,
          offensive_rebound: playerData.skills.offensiveRebound,
          defensive_rebound: playerData.skills.defensiveRebound,
          speed: playerData.skills.speed,
          strength: playerData.skills.strength,
          stamina: playerData.skills.stamina,
          vertical: playerData.skills.vertical,
          basketball_iq: playerData.skills.basketballIQ,
          teamwork: playerData.skills.teamwork,
          clutch: playerData.skills.clutch,
          // overall 由 Supabase 触发器自动计算，这里可以省略
          // overall: overall,
        });

      if (skillsError) throw skillsError;

      console.log(`✅ Supabase 球员已创建: ${playerData.name} (${player.id})`);

      return {
        id: player.id,
        name: playerData.name,
        position: playerData.position as BasketballPosition,
        skills: { ...playerData.skills, overall },
        createdAt: new Date(player.created_at),
        updatedAt: new Date(player.updated_at),
      };
    } catch (error) {
      console.error('❌ Supabase 创建球员失败:', playerData.name, error);
      throw new DatabaseError(
        `Failed to create player in Supabase: ${playerData.name}`,
        'SUPABASE_CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新球员
   */
  async update(id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>): Promise<void> {
    try {
      // 1. 更新基本信息
      if (updates.name || updates.position) {
        const { error: playerError } = await supabase!
          .from('players')
          .update({
            ...(updates.name && { name: updates.name }),
            ...(updates.position && { position: updates.position }),
          })
          .eq('id', id);

        if (playerError) throw playerError;
      }

      // 2. 更新能力值
      if (updates.skills) {
        // 注意：overall 由 Supabase 触发器自动计算
        const { error: skillsError } = await supabase!
          .from('player_skills')
          .update({
            two_point_shot: updates.skills.twoPointShot,
            three_point_shot: updates.skills.threePointShot,
            free_throw: updates.skills.freeThrow,
            passing: updates.skills.passing,
            ball_control: updates.skills.ballControl,
            court_vision: updates.skills.courtVision,
            perimeter_defense: updates.skills.perimeterDefense,
            interior_defense: updates.skills.interiorDefense,
            steals: updates.skills.steals,
            blocks: updates.skills.blocks,
            offensive_rebound: updates.skills.offensiveRebound,
            defensive_rebound: updates.skills.defensiveRebound,
            speed: updates.skills.speed,
            strength: updates.skills.strength,
            stamina: updates.skills.stamina,
            vertical: updates.skills.vertical,
            basketball_iq: updates.skills.basketballIQ,
            teamwork: updates.skills.teamwork,
            clutch: updates.skills.clutch,
            // overall 由 Supabase 触发器自动计算，这里可以省略
            // overall: overall,
          })
          .eq('player_id', id);

        if (skillsError) throw skillsError;
      }

      console.log(`✅ Supabase 球员已更新: ${id}`);
    } catch (error) {
      console.error('❌ Supabase 更新球员失败:', id, error);
      throw new DatabaseError(
        `Failed to update player in Supabase: ${id}`,
        'SUPABASE_UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除球员
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('players')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ Supabase 球员已删除: ${id}`);
    } catch (error) {
      console.error('❌ Supabase 删除球员失败:', id, error);
      throw new DatabaseError(
        `Failed to delete player from Supabase: ${id}`,
        'SUPABASE_DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据位置查找球员
   */
  async findByPosition(position: BasketballPosition): Promise<Player[]> {
    try {
      const { data, error } = await supabase!
        .from('players')
        .select(`
          id,
          name,
          position,
          created_at,
          updated_at,
          player_skills (
            two_point_shot,
            three_point_shot,
            free_throw,
            passing,
            ball_control,
            court_vision,
            perimeter_defense,
            interior_defense,
            steals,
            blocks,
            offensive_rebound,
            defensive_rebound,
            speed,
            strength,
            stamina,
            vertical,
            basketball_iq,
            teamwork,
            clutch,
            overall,
            updated_at
          )
        `)
        .eq('position', position)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(row => this.mapRowToPlayer(row));
    } catch (error) {
      console.error('❌ Supabase 根据位置查询球员失败:', position, error);
      throw new DatabaseError(
        `Failed to find players by position from Supabase: ${position}`,
        'SUPABASE_FIND_BY_POSITION_ERROR',
        error as Error
      );
    }
  }

  /**
   * 搜索球员（按名称）
   */
  async searchByName(name: string): Promise<Player[]> {
    try {
      const { data, error } = await supabase!
        .from('players')
        .select(`
          id,
          name,
          position,
          created_at,
          updated_at,
          player_skills (
            two_point_shot,
            three_point_shot,
            free_throw,
            passing,
            ball_control,
            court_vision,
            perimeter_defense,
            interior_defense,
            steals,
            blocks,
            offensive_rebound,
            defensive_rebound,
            speed,
            strength,
            stamina,
            vertical,
            basketball_iq,
            teamwork,
            clutch,
            overall,
            updated_at
          )
        `)
        .ilike('name', `%${name}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(row => this.mapRowToPlayer(row));
    } catch (error) {
      console.error('❌ Supabase 搜索球员失败:', name, error);
      throw new DatabaseError(
        `Failed to search players by name from Supabase: ${name}`,
        'SUPABASE_SEARCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取球员数量
   */
  async count(): Promise<number> {
    try {
      // 获取当前用户 ID
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ 未认证用户，返回 0');
        return 0;
      }

      const { count, error } = await supabase!
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);  // 🔒 仅统计当前用户的球员

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('❌ Supabase 获取球员数量失败:', error);
      throw new DatabaseError(
        'Failed to count players from Supabase',
        'SUPABASE_COUNT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射 Supabase 行到 Player 对象
   * @private
   */
  private mapRowToPlayer(data: any): Player {
    const skills = data.player_skills?.[0] || data.player_skills || {};
    
    return {
      id: data.id,
      name: data.name,
      position: data.position as BasketballPosition,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      skills: {
        twoPointShot: skills.two_point_shot || 50,
        threePointShot: skills.three_point_shot || 50,
        freeThrow: skills.free_throw || 50,
        passing: skills.passing || 50,
        ballControl: skills.ball_control || 50,
        courtVision: skills.court_vision || 50,
        perimeterDefense: skills.perimeter_defense || 50,
        interiorDefense: skills.interior_defense || 50,
        steals: skills.steals || 50,
        blocks: skills.blocks || 50,
        offensiveRebound: skills.offensive_rebound || 50,
        defensiveRebound: skills.defensive_rebound || 50,
        speed: skills.speed || 50,
        strength: skills.strength || 50,
        stamina: skills.stamina || 50,
        vertical: skills.vertical || 50,
        basketballIQ: skills.basketball_iq || 50,
        teamwork: skills.teamwork || 50,
        clutch: skills.clutch || 50,
        overall: skills.overall || 50,
      },
    };
  }
}
