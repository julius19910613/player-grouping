/**
 * 球员仓库
 * @module repositories/player.repository
 * 
 * 职责：
 * - 球员数据的 CRUD 操作
 * - 数据映射（数据库行 <-> Player 对象）
 * - 数据验证
 */

import { databaseService } from '../services/database';
import type { Player } from '../types/player';
import { BasketballPosition, calculateOverallSkill } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';
import { DatabaseError } from '../types/database';

/**
 * 球员仓库类
 */
export class PlayerRepository {
  /**
   * 查找所有球员
   */
  async findAll(): Promise<Player[]> {
    try {
      const rows = databaseService.exec(`
        SELECT 
          p.id, p.name, p.position, p.created_at, p.updated_at,
          s.two_point_shot, s.three_point_shot, s.free_throw,
          s.passing, s.ball_control, s.court_vision,
          s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
          s.offensive_rebound, s.defensive_rebound,
          s.speed, s.strength, s.stamina, s.vertical,
          s.basketball_iq, s.teamwork, s.clutch, s.overall
        FROM players p
        JOIN player_skills s ON p.id = s.player_id
        ORDER BY p.created_at DESC
      `);

      return rows.map(row => this.mapRowToPlayer(row));
    } catch (error) {
      console.error('❌ 查询所有球员失败:', error);
      throw new DatabaseError(
        'Failed to find all players',
        'FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 查找球员
   */
  async findById(id: string): Promise<Player | null> {
    try {
      const sql = `
        SELECT 
          p.id, p.name, p.position, p.created_at, p.updated_at,
          s.two_point_shot, s.three_point_shot, s.free_throw,
          s.passing, s.ball_control, s.court_vision,
          s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
          s.offensive_rebound, s.defensive_rebound,
          s.speed, s.strength, s.stamina, s.vertical,
          s.basketball_iq, s.teamwork, s.clutch, s.overall
        FROM players p
        JOIN player_skills s ON p.id = s.player_id
        WHERE p.id = ?
      `;

      const rows = databaseService.exec(sql, [id]);
      return rows.length > 0 ? this.mapRowToPlayer(rows[0]) : null;
    } catch (error) {
      console.error('❌ 查询球员失败:', id, error);
      throw new DatabaseError(
        `Failed to find player by id: ${id}`,
        'FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 创建球员
   */
  async create(playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    try {
      const id = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // 计算 overall
      const overall = calculateOverallSkill(
        playerData.skills as Omit<BasketballSkills, 'overall'>,
        playerData.position
      );

      // 插入球员基本信息
      databaseService.run(
        'INSERT INTO players (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, playerData.name, playerData.position, now, now]
      );

      // 插入能力值
      const skills = playerData.skills;
      databaseService.run(
        `INSERT INTO player_skills (
          player_id, two_point_shot, three_point_shot, free_throw,
          passing, ball_control, court_vision,
          perimeter_defense, interior_defense, steals, blocks,
          offensive_rebound, defensive_rebound,
          speed, strength, stamina, vertical,
          basketball_iq, teamwork, clutch, overall
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          skills.twoPointShot,
          skills.threePointShot,
          skills.freeThrow,
          skills.passing,
          skills.ballControl,
          skills.courtVision,
          skills.perimeterDefense,
          skills.interiorDefense,
          skills.steals,
          skills.blocks,
          skills.offensiveRebound,
          skills.defensiveRebound,
          skills.speed,
          skills.strength,
          skills.stamina,
          skills.vertical,
          skills.basketballIQ,
          skills.teamwork,
          skills.clutch,
          overall,
        ]
      );

      await databaseService.save();

      console.log(`✅ 球员已创建: ${playerData.name} (${id})`);

      return {
        id,
        name: playerData.name,
        position: playerData.position,
        skills: { ...skills, overall },
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
    } catch (error) {
      console.error('❌ 创建球员失败:', playerData.name, error);
      throw new DatabaseError(
        `Failed to create player: ${playerData.name}`,
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新球员
   */
  async update(id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const now = new Date().toISOString();

      // 更新基本信息
      if (updates.name || updates.position) {
        databaseService.run(
          'UPDATE players SET name = COALESCE(?, name), position = COALESCE(?, position), updated_at = ? WHERE id = ?',
          [updates.name ?? null, updates.position ?? null, now, id]
        );
      }

      // 更新能力值
      if (updates.skills) {
        const overall = updates.position
          ? calculateOverallSkill(updates.skills as Omit<BasketballSkills, 'overall'>, updates.position)
          : updates.skills.overall;

        databaseService.run(
          `UPDATE player_skills SET
            two_point_shot = COALESCE(?, two_point_shot),
            three_point_shot = COALESCE(?, three_point_shot),
            free_throw = COALESCE(?, free_throw),
            passing = COALESCE(?, passing),
            ball_control = COALESCE(?, ball_control),
            court_vision = COALESCE(?, court_vision),
            perimeter_defense = COALESCE(?, perimeter_defense),
            interior_defense = COALESCE(?, interior_defense),
            steals = COALESCE(?, steals),
            blocks = COALESCE(?, blocks),
            offensive_rebound = COALESCE(?, offensive_rebound),
            defensive_rebound = COALESCE(?, defensive_rebound),
            speed = COALESCE(?, speed),
            strength = COALESCE(?, strength),
            stamina = COALESCE(?, stamina),
            vertical = COALESCE(?, vertical),
            basketball_iq = COALESCE(?, basketball_iq),
            teamwork = COALESCE(?, teamwork),
            clutch = COALESCE(?, clutch),
            overall = ?
          WHERE player_id = ?`,
          [
            updates.skills.twoPointShot ?? null,
            updates.skills.threePointShot ?? null,
            updates.skills.freeThrow ?? null,
            updates.skills.passing ?? null,
            updates.skills.ballControl ?? null,
            updates.skills.courtVision ?? null,
            updates.skills.perimeterDefense ?? null,
            updates.skills.interiorDefense ?? null,
            updates.skills.steals ?? null,
            updates.skills.blocks ?? null,
            updates.skills.offensiveRebound ?? null,
            updates.skills.defensiveRebound ?? null,
            updates.skills.speed ?? null,
            updates.skills.strength ?? null,
            updates.skills.stamina ?? null,
            updates.skills.vertical ?? null,
            updates.skills.basketballIQ ?? null,
            updates.skills.teamwork ?? null,
            updates.skills.clutch ?? null,
            overall,
            id,
          ]
        );
      }

      await databaseService.save();

      console.log(`✅ 球员已更新: ${id}`);
    } catch (error) {
      console.error('❌ 更新球员失败:', id, error);
      throw new DatabaseError(
        `Failed to update player: ${id}`,
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除球员
   */
  async delete(id: string): Promise<void> {
    try {
      databaseService.run('DELETE FROM players WHERE id = ?', [id]);
      await databaseService.save();
      console.log(`✅ 球员已删除: ${id}`);
    } catch (error) {
      console.error('❌ 删除球员失败:', id, error);
      throw new DatabaseError(
        `Failed to delete player: ${id}`,
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据位置查找球员
   */
  async findByPosition(position: BasketballPosition): Promise<Player[]> {
    try {
      const sql = `
        SELECT 
          p.id, p.name, p.position, p.created_at, p.updated_at,
          s.two_point_shot, s.three_point_shot, s.free_throw,
          s.passing, s.ball_control, s.court_vision,
          s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
          s.offensive_rebound, s.defensive_rebound,
          s.speed, s.strength, s.stamina, s.vertical,
          s.basketball_iq, s.teamwork, s.clutch, s.overall
        FROM players p
        JOIN player_skills s ON p.id = s.player_id
        WHERE p.position = ?
        ORDER BY p.created_at DESC
      `;

      const rows = databaseService.exec(sql, [position]);
      return rows.map(row => this.mapRowToPlayer(row));
    } catch (error) {
      console.error('❌ 根据位置查询球员失败:', position, error);
      throw new DatabaseError(
        `Failed to find players by position: ${position}`,
        'FIND_BY_POSITION_ERROR',
        error as Error
      );
    }
  }

  /**
   * 搜索球员（按名称）
   */
  async searchByName(name: string): Promise<Player[]> {
    try {
      const sql = `
        SELECT 
          p.id, p.name, p.position, p.created_at, p.updated_at,
          s.two_point_shot, s.three_point_shot, s.free_throw,
          s.passing, s.ball_control, s.court_vision,
          s.perimeter_defense, s.interior_defense, s.steals, s.blocks,
          s.offensive_rebound, s.defensive_rebound,
          s.speed, s.strength, s.stamina, s.vertical,
          s.basketball_iq, s.teamwork, s.clutch, s.overall
        FROM players p
        JOIN player_skills s ON p.id = s.player_id
        WHERE p.name LIKE ?
        ORDER BY p.created_at DESC
      `;

      const rows = databaseService.exec(sql, [`%${name}%`]);
      return rows.map(row => this.mapRowToPlayer(row));
    } catch (error) {
      console.error('❌ 搜索球员失败:', name, error);
      throw new DatabaseError(
        `Failed to search players by name: ${name}`,
        'SEARCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 获取球员数量
   */
  async count(): Promise<number> {
    try {
      const rows = databaseService.exec('SELECT COUNT(*) FROM players');
      return rows[0]?.[0] as number || 0;
    } catch (error) {
      console.error('❌ 获取球员数量失败:', error);
      throw new DatabaseError(
        'Failed to count players',
        'COUNT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射数据库行到 Player 对象
   * @private
   */
  private mapRowToPlayer(row: any[]): Player {
    return {
      id: row[0] as string,
      name: row[1] as string,
      position: row[2] as BasketballPosition,
      createdAt: new Date(row[3] as string),
      updatedAt: new Date(row[4] as string),
      skills: {
        twoPointShot: row[5] as number,
        threePointShot: row[6] as number,
        freeThrow: row[7] as number,
        passing: row[8] as number,
        ballControl: row[9] as number,
        courtVision: row[10] as number,
        perimeterDefense: row[11] as number,
        interiorDefense: row[12] as number,
        steals: row[13] as number,
        blocks: row[14] as number,
        offensiveRebound: row[15] as number,
        defensiveRebound: row[16] as number,
        speed: row[17] as number,
        strength: row[18] as number,
        stamina: row[19] as number,
        vertical: row[20] as number,
        basketballIQ: row[21] as number,
        teamwork: row[22] as number,
        clutch: row[23] as number,
        overall: row[24] as number,
      },
    };
  }
}
