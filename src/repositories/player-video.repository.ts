/**
 * 球员视频仓库
 * @module repositories/player-video.repository
 * 
 * 职责：
 * - 球员视频的 CRUD 操作
 * - 数据映射（数据库行 <-> PlayerVideo 对象）
 * - 视频状态管理
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import type { PlayerVideo, CreatePlayerVideoDTO, UpdatePlayerVideoDTO } from '../types/match';
import { DatabaseError } from '../types/database';

/**
 * 球员视频仓库类
 */
export class PlayerVideoRepository {
  /**
   * 查找所有视频
   */
  async findAll(): Promise<PlayerVideo[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('player_videos')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ 查询所有视频成功: ${data?.length || 0} 个视频`);
      return data?.map(row => this.mapRowToPlayerVideo(row)) || [];
    } catch (error) {
      console.error('❌ 查询所有视频失败:', error);
      throw new DatabaseError(
        'Failed to find all player videos',
        'FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据 ID 查找视频
   */
  async findById(id: string): Promise<PlayerVideo | null> {
    try {
      const { data, error } = await supabase!
        .from('player_videos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapRowToPlayerVideo(data) : null;
    } catch (error) {
      console.error('❌ 查询视频失败:', id, error);
      throw new DatabaseError(
        `Failed to find player video by id: ${id}`,
        'FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据球员 ID 查找视频
   */
  async findByPlayerId(playerId: string): Promise<PlayerVideo[]> {
    try {
      const { data, error } = await supabase!
        .from('player_videos')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerVideo(row)) || [];
    } catch (error) {
      console.error('❌ 按球员查询视频失败:', playerId, error);
      throw new DatabaseError(
        `Failed to find player videos by player: ${playerId}`,
        'FIND_BY_PLAYER_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据比赛 ID 查找视频
   */
  async findByMatchId(matchId: string): Promise<PlayerVideo[]> {
    try {
      const { data, error } = await supabase!
        .from('player_videos')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerVideo(row)) || [];
    } catch (error) {
      console.error('❌ 按比赛查询视频失败:', matchId, error);
      throw new DatabaseError(
        `Failed to find player videos by match: ${matchId}`,
        'FIND_BY_MATCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据视频类型查找视频
   */
  async findByVideoType(videoType: 'match' | 'training' | 'highlight' | 'analysis'): Promise<PlayerVideo[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('player_videos')
        .select('*')
        .eq('video_type', videoType);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerVideo(row)) || [];
    } catch (error) {
      console.error('❌ 按视频类型查询失败:', videoType, error);
      throw new DatabaseError(
        `Failed to find player videos by type: ${videoType}`,
        'FIND_BY_TYPE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据状态查找视频
   */
  async findByStatus(status: 'pending' | 'processing' | 'ready' | 'error'): Promise<PlayerVideo[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('player_videos')
        .select('*')
        .eq('status', status);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerVideo(row)) || [];
    } catch (error) {
      console.error('❌ 按状态查询视频失败:', status, error);
      throw new DatabaseError(
        `Failed to find player videos by status: ${status}`,
        'FIND_BY_STATUS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 创建视频
   */
  async create(data: CreatePlayerVideoDTO): Promise<PlayerVideo> {
    try {
      const userId = await getCurrentUserId();

      const { data: video, error } = await supabase!
        .from('player_videos')
        .insert({
          player_id: data.playerId,
          match_id: data.matchId,
          user_id: userId,
          title: data.title,
          description: data.description,
          video_url: data.videoUrl,
          thumbnail_url: data.thumbnailUrl,
          duration: data.duration,
          video_type: data.videoType,
          status: data.status || 'pending',
          ai_analysis: data.aiAnalysis,
          tags: data.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ 球员视频已创建: ${video.id}`);
      return this.mapRowToPlayerVideo(video);
    } catch (error) {
      console.error('❌ 创建球员视频失败:', error);
      throw new DatabaseError(
        'Failed to create player video',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新视频
   */
  async update(id: string, data: UpdatePlayerVideoDTO): Promise<void> {
    try {
      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.videoUrl !== undefined) updateData.video_url = data.videoUrl;
      if (data.thumbnailUrl !== undefined) updateData.thumbnail_url = data.thumbnailUrl;
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.videoType !== undefined) updateData.video_type = data.videoType;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.aiAnalysis !== undefined) updateData.ai_analysis = data.aiAnalysis;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const { error } = await supabase!
        .from('player_videos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 球员视频已更新: ${id}`);
    } catch (error) {
      console.error('❌ 更新球员视频失败:', id, error);
      throw new DatabaseError(
        `Failed to update player video: ${id}`,
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 删除视频
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('player_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 球员视频已删除: ${id}`);
    } catch (error) {
      console.error('❌ 删除球员视频失败:', id, error);
      throw new DatabaseError(
        `Failed to delete player video: ${id}`,
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新视频状态
   */
  async updateStatus(id: string, status: 'pending' | 'processing' | 'ready' | 'error'): Promise<void> {
    try {
      const { error } = await supabase!
        .from('player_videos')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ 视频状态已更新: ${id} -> ${status}`);
    } catch (error) {
      console.error('❌ 更新视频状态失败:', id, error);
      throw new DatabaseError(
        `Failed to update video status: ${id}`,
        'UPDATE_STATUS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 更新 AI 分析结果
   */
  async updateAiAnalysis(id: string, aiAnalysis: any): Promise<void> {
    try {
      const { error } = await supabase!
        .from('player_videos')
        .update({ ai_analysis: aiAnalysis })
        .eq('id', id);

      if (error) throw error;

      console.log(`✅ AI 分析结果已更新: ${id}`);
    } catch (error) {
      console.error('❌ 更新 AI 分析失败:', id, error);
      throw new DatabaseError(
        `Failed to update AI analysis: ${id}`,
        'UPDATE_AI_ANALYSIS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 根据标签搜索视频
   */
  async searchByTags(tags: string[]): Promise<PlayerVideo[]> {
    try {
      const userId = await getCurrentUserId();

      let query = supabase!
        .from('player_videos')
        .select('*')
        .overlaps('tags', tags);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(row => this.mapRowToPlayerVideo(row)) || [];
    } catch (error) {
      console.error('❌ 按标签搜索视频失败:', tags, error);
      throw new DatabaseError(
        'Failed to search player videos by tags',
        'SEARCH_BY_TAGS_ERROR',
        error as Error
      );
    }
  }

  /**
   * 映射数据库行到 PlayerVideo 对象
   * @private
   */
  private mapRowToPlayerVideo(row: any): PlayerVideo {
    return {
      id: row.id,
      playerId: row.player_id,
      matchId: row.match_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url,
      duration: row.duration,
      videoType: row.video_type,
      status: row.status,
      aiAnalysis: row.ai_analysis,
      tags: row.tags || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
