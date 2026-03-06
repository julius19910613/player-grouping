/**
 * 能力调整记录仓库
 * @module repositories/skill-adjustment.repository
 * 
 * 职责：
 * - 球员能力调整记录的 CRUD 操作
 * - 数据映射（数据库行 <-> SkillAdjustment 对象）
 * - 审核流程管理
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import type { SkillAdjustment, CreateSkillAdjustmentDTO, UpdateSkillAdjustmentDTO } from '../types/match';
import { DatabaseError } from '../types/database';

/**
 * 能力调整记录仓库类
 */
export class SkillAdjustmentRepository {
  /**
   * 查找所有调整记录
   */
  async findAll(): Promise<SkillAdjustment[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('skill_adjustments')
        .select('*');

      if (userId) {
        query = query.eq('player_id.user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ 查询所有能力调整成功: ${data?.length || 0} 条记录`);
      return data?.map(row => this.mapRowToSkillAdjustment(row)) || [];
    } catch (error) {
      console.error('❌ 查询所有能力调整失败:', error);
      throw new DatabaseError(
        'Failed to find all skill adjustments',
        'FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 查找调整记录
   */
  async findById(id: string): Promise<SkillAdjustment | null> {
    try {
      const { data, error } = await supabase!
        .from('skill_adjustments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapRowToSkillAdjustment(data) : null;
    } catch (error) {
      console.error('❌ 查询能力调整失败:', id, error);
      throw new DatabaseError(
        `Failed to find skill adjustment by id: ${id}`,
        'FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据球员 ID 查找调整记录
   */
  async findByPlayerId(playerId: string): Promise<SkillAdjustment[]> {
    try {
      const { data, error } = await supabase!
        .from('skill_adjustments')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToSkillAdjustment(row)) || [];
    } catch (error) {
      console.error('❌ 按球员查询能力调整失败:', playerId, error);
      throw new DatabaseError(
        `Failed to find skill adjustments by player: ${playerId}`,
        'FIND_BY_PLAYER_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据比赛 ID 查找调整记录
   */
  async findByMatchId(matchId: string): Promise<SkillAdjustment[]> {
    try {
      const { data, error } = await supabase!
        .from('skill_adjustments')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToSkillAdjustment(row)) || [];
    } catch (error) {
      console.error('❌ 按比赛查询能力调整失败:', matchId, error);
      throw new DatabaseError(
        `Failed to find skill adjustments by match: ${matchId}`,
        'FIND_BY_MATCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据状态查找调整记录
   */
  async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<SkillAdjustment[]> {
    try {
      const { data, error } = await supabase!
        .from('skill_adjustments')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToSkillAdjustment(row)) || [];
    } catch (error) {
      console.error('❌ 按状态查询能力调整失败:', status, error);
      throw new DatabaseError(
        `Failed to find skill adjustments by status: ${status}`,
        'FIND_BY_STATUS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 创建调整记录
   */
  async create(data: CreateSkillAdjustmentDTO): Promise<SkillAdjustment> {
    try {
      const { data: adjustment, error } = await supabase!
        .from('skill_adjustments')
        .insert({
          player_id: data.playerId,
          match_id: data.matchId,
          adjustment_type: data.adjustmentType,
          skills_before: data.skillsBefore,
          skills_after: data.skillsAfter,
          reason: data.reason,
          overall_change: data.overallChange || 0,
          status: data.status || 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ 能力调整已创建: ${adjustment.id}`);
      return this.mapRowToSkillAdjustment(adjustment);
    } catch (error) {
      console.error('❌ 创建能力调整失败:', error);
      throw new DatabaseError(
        'Failed to create skill adjustment',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新调整记录
   */
  async update(id: string, data: UpdateSkillAdjustmentDTO): Promise<void> {
    try {
      const updateData: any = {};

      if (data.skillsBefore !== undefined) updateData.skills_before = data.skillsBefore;
      if (data.skillsAfter !== undefined) updateData.skills_after = data.skillsAfter;
      if (data.reason !== undefined) updateData.reason = data.reason;
      if (data.overallChange !== undefined) updateData.overall_change = data.overallChange;
      if (data.status !== undefined) updateData.status = data.status;

      const { error } = await supabase!
        .from('skill_adjustments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 能力调整已更新: ${id}`);
    } catch (error) {
      console.error('❌ 更新能力调整失败:', id, error);
      throw new DatabaseError(
        `Failed to update skill adjustment: ${id}`,
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除调整记录
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('skill_adjustments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 能力调整已删除: ${id}`);
    } catch (error) {
      console.error('❌ 删除能力调整失败:', id, error);
      throw new DatabaseError(
        `Failed to delete skill adjustment: ${id}`,
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 审核调整记录（批准）
   */
  async approve(id: string): Promise<void> {
    try {
      const userId = await getCurrentUserId();

      const { error } = await supabase!
        .from('skill_adjustments')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 能力调整已批准: ${id}`);
    } catch (error) {
      console.error('❌ 批准能力调整失败:', id, error);
      throw new DatabaseError(
        `Failed to approve skill adjustment: ${id}`,
        'APPROVE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 审核调整记录（拒绝）
   */
  async reject(id: string, reason?: string): Promise<void> {
    try {
      const userId = await getCurrentUserId();

      const updateData: any = {
        status: 'rejected',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      };

      if (reason) {
        updateData.reason = reason;
      }

      const { error } = await supabase!
        .from('skill_adjustments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 能力调整已拒绝: ${id}`);
    } catch (error) {
      console.error('❌ 拒绝能力调整失败:', id, error);
      throw new DatabaseError(
        `Failed to reject skill adjustment: ${id}`,
        'REJECT_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射数据库行到 SkillAdjustment 对象
   * @private
   */
  private mapRowToSkillAdjustment(row: any): SkillAdjustment {
    return {
      id: row.id,
      playerId: row.player_id,
      matchId: row.match_id,
      adjustmentType: row.adjustment_type,
      skillsBefore: row.skills_before,
      skillsAfter: row.skills_after,
      reason: row.reason,
      overallChange: row.overall_change,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
