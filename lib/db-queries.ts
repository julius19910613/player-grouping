/**
 * Database Query Functions for Basketball Player Analysis
 *
 * 这些函数封装了 Supabase 数据库查询逻辑，用于获取球员统计数据、比赛历史和表现分析。
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 球员基本信息类型
 */
export interface PlayerBasicInfo {
  id: string;
  name: string;
  position: string;
  created_at: string;
}

/**
 * 球员技能类型
 */
export interface PlayerSkills {
  player_id: string;
  two_point_rating: number;
  three_point_rating: number;
  free_throw_rating: number;
  mid_range_rating: number;
  layup_rating: number;
  dunk_rating: number;
  passing: number;
  dribbling: number;
  ball_handling: number;
  rebounding: number;
  defense: number;
  shot_blocking: number;
  stealing: number;
  post_moves: number;
  perimeter_defense: number;
  speed: number;
  stamina: number;
  strength: number;
  vertical: number;
  basketball_iq: number;
  overall: number;
}

/**
 * 球员比赛统计类型
 */
export interface PlayerMatchStats {
  id: string;
  match_id: string;
  player_id: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes_played: number;
  efficiency_rating: number;
}

/**
 * 比赛基本信息类型
 */
export interface MatchInfo {
  id: string;
  date: string;
  venue: string | null;
  mode: string;
  teams: Record<string, string[]>;
  result: Record<string, any> | null;
  notes: string | null;
}

/**
 * 球员最近比赛统计数据（带平均值）
 */
export interface PlayerRecentStats {
  playerName: string;
  position: string;
  skills: PlayerSkills;
  recentMatches: Array<{
    matchId: string;
    date: string;
    venue: string | null;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    efficiency: number;
  }>;
  averages: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    efficiency: number;
  };
}

/**
 * 比赛历史记录
 */
export interface MatchHistoryRecord {
  matchId: string;
  date: string;
  venue: string | null;
  mode: string;
  teams: Record<string, string[]>;
  result: Record<string, any> | null;
  notes: string | null;
}

/**
 * 球员对比数据
 */
export interface PlayerComparison {
  playerName: string;
  position: string;
  overall: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  avgEfficiency: number;
  matchCount: number;
}

/**
 * 比赛表现分析结果
 */
export interface MatchPerformanceAnalysis {
  matchId?: string;
  matchDate?: string;
  type: 'overall' | 'player_specific';
  analysis: {
    summary: string;
    keyStats: Record<string, number>;
    insights: string[];
  };
}

/**
 * 获取球员基本信息
 */
export async function getPlayerBasicInfo(
  supabase: SupabaseClient,
  playerName: string
): Promise<PlayerBasicInfo[] | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .ilike('name', `%${playerName}%`)
    .limit(10);

  if (error) {
    console.error('Error fetching player info:', error);
    return null;
  }

  return data as PlayerBasicInfo[];
}

/**
 * 获取球员技能数据
 */
export async function getPlayerSkills(
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerSkills | null> {
  const { data, error } = await supabase
    .from('player_skills')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (error) {
    console.error('Error fetching player skills:', error);
    return null;
  }

  return data as PlayerSkills;
}

/**
 * 获取球员最近 N 场比赛统计数据
 *
 * @param supabase - Supabase 客户端实例
 * @param playerId - 球员 ID
 * @param limit - 返回的比赛数量，默认为 5
 * @returns 球员比赛统计数据数组
 */
export async function getPlayerRecentMatches(
  supabase: SupabaseClient,
  playerId: string,
  limit: number = 5
): Promise<Array<PlayerMatchStats & { matchInfo: MatchInfo }> | null> {
  // 查询球员比赛统计，按比赛日期降序排列
  const { data: statsData, error: statsError } = await supabase
    .from('player_match_stats')
    .select(`
      *,
      matches!inner (
        id,
        date,
        venue,
        mode,
        teams,
        result,
        notes
      )
    `)
    .eq('player_id', playerId)
    .order('matches(date)', { ascending: false })
    .limit(limit);

  if (statsError) {
    console.error('Error fetching player recent matches:', statsError);
    return null;
  }

  if (!statsData || statsData.length === 0) {
    return [];
  }

  // 格式化返回数据
  return statsData.map((stat: any) => ({
    id: stat.id,
    match_id: stat.match_id,
    player_id: stat.player_id,
    points: stat.points || 0,
    rebounds: stat.rebounds || 0,
    assists: stat.assists || 0,
    steals: stat.steals || 0,
    blocks: stat.blocks || 0,
    turnovers: stat.turnovers || 0,
    fouls: stat.fouls || 0,
    minutes_played: stat.minutes_played || 0,
    efficiency_rating: stat.efficiency_rating || 0,
    matchInfo: stat.matches as MatchInfo,
  }));
}

/**
 * 获取比赛历史记录
 *
 * @param supabase - Supabase 客户端实例
 * @param options - 查询选项
 * @returns 比赛历史记录数组
 */
export async function getMatchHistory(
  supabase: SupabaseClient,
  options?: {
    player_name?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }
): Promise<MatchHistoryRecord[]> {
  let query = supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false });

  // 按日期范围筛选
  if (options?.date_from) {
    query = query.gte('date', options.date_from);
  }
  if (options?.date_to) {
    query = query.lte('date', options.date_to);
  }

  // 限制返回数量
  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(50); // 默认返回最近 50 场
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching match history:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 如果指定了球员名称，进一步筛选该球员参与的比赛
  if (options?.player_name) {
    const filteredMatches = data.filter((match: any) => {
      if (!match.teams) return false;
      const allPlayers = Object.values(match.teams).flat();
      return allPlayers.some((player: string) =>
        player.toLowerCase().includes(options.player_name!.toLowerCase())
      );
    });
    return filteredMatches.map((match: any) => ({
      matchId: match.id,
      date: match.date,
      venue: match.venue,
      mode: match.mode,
      teams: match.teams,
      result: match.result,
      notes: match.notes,
    }));
  }

  return data.map((match: any) => ({
    matchId: match.id,
    date: match.date,
    venue: match.venue,
    mode: match.mode,
    teams: match.teams,
    result: match.result,
    notes: match.notes,
  }));
}

/**
 * 获取球员平均统计数据
 *
 * @param supabase - Supabase 客户端实例
 * @param playerId - 球员 ID
 * @returns 球员平均统计数据
 */
export async function getPlayerAverageStats(
  supabase: SupabaseClient,
  playerId: string
): Promise<{
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  avgEfficiency: number;
  matchCount: number;
} | null> {
  // 查询球员所有比赛统计
  const { data, error } = await supabase
    .from('player_match_stats')
    .select('*')
    .eq('player_id', playerId);

  if (error) {
    console.error('Error fetching player average stats:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return {
      avgPoints: 0,
      avgRebounds: 0,
      avgAssists: 0,
      avgSteals: 0,
      avgBlocks: 0,
      avgEfficiency: 0,
      matchCount: 0,
    };
  }

  // 计算平均值
  const stats = data as PlayerMatchStats[];
  const sumPoints = stats.reduce((sum, s) => sum + s.points, 0);
  const sumRebounds = stats.reduce((sum, s) => sum + s.rebounds, 0);
  const sumAssists = stats.reduce((sum, s) => sum + s.assists, 0);
  const sumSteals = stats.reduce((sum, s) => sum + s.steals, 0);
  const sumBlocks = stats.reduce((sum, s) => sum + s.blocks, 0);
  const sumEfficiency = stats.reduce((sum, s) => sum + s.efficiency_rating, 0);

  const matchCount = stats.length;

  return {
    avgPoints: Number((sumPoints / matchCount).toFixed(1)),
    avgRebounds: Number((sumRebounds / matchCount).toFixed(1)),
    avgAssists: Number((sumAssists / matchCount).toFixed(1)),
    avgSteals: Number((sumSteals / matchCount).toFixed(1)),
    avgBlocks: Number((sumBlocks / matchCount).toFixed(1)),
    avgEfficiency: Number((sumEfficiency / matchCount).toFixed(1)),
    matchCount,
  };
}

/**
 * 分析比赛表现
 *
 * @param supabase - Supabase 客户端实例
 * @param options - 分析选项
 * @returns 比赛表现分析结果
 */
export async function analyzeMatchPerformance(
  supabase: SupabaseClient,
  options?: {
    match_id?: string;
    match_date?: string;
    player_name?: string;
    analysis_type?: 'overall' | 'player_specific';
  }
): Promise<MatchPerformanceAnalysis | null> {
  const analysisType = options?.analysis_type || 'overall';

  // 整体比赛分析
  if (analysisType === 'overall') {
    let match: MatchInfo | null = null;

    // 通过 match_id 查找比赛
    if (options?.match_id) {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', options.match_id)
        .single();

      if (error) {
        console.error('Error fetching match by ID:', error);
        return null;
      }

      match = data as MatchInfo;
    }
    // 通过 match_date 查找比赛
    else if (options?.match_date) {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('date', options.match_date)
        .maybeSingle();

      if (error) {
        console.error('Error fetching match by date:', error);
        return null;
      }

      match = data;
    }

    if (!match) {
      return {
        matchId: options?.match_id,
        matchDate: options?.match_date,
        type: 'overall',
        analysis: {
          summary: '未找到指定的比赛',
          keyStats: {},
          insights: [],
        },
      };
    }

    // 查询比赛统计数据
    const { data: statsData, error: statsError } = await supabase
      .from('player_match_stats')
      .select('*')
      .eq('match_id', match.id);

    if (statsError) {
      console.error('Error fetching match stats:', statsError);
      return null;
    }

    const stats = statsData as PlayerMatchStats[];

    // 计算整体统计
    const totalPoints = stats.reduce((sum, s) => sum + s.points, 0);
    const totalRebounds = stats.reduce((sum, s) => sum + s.rebounds, 0);
    const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
    const totalSteals = stats.reduce((sum, s) => sum + s.steals, 0);
    const totalBlocks = stats.reduce((sum, s) => sum + s.blocks, 0);

    // 找出最佳球员
    const bestPlayer = stats.reduce((best, current) =>
      current.efficiency_rating > best.efficiency_rating ? current : best
    );

    return {
      matchId: match.id,
      matchDate: match.date,
      type: 'overall',
      analysis: {
        summary: `比赛日期：${match.date}，模式：${match.mode}，共 ${stats.length} 名球员参与`,
        keyStats: {
          totalPoints,
          totalRebounds,
          totalAssists,
          totalSteals,
          totalBlocks,
          playerCount: stats.length,
        },
        insights: [
          `本场比赛共计 ${totalPoints} 分`,
          `最佳球员效率值：${bestPlayer.efficiency_rating}`,
          match.result ? `比赛结果：${JSON.stringify(match.result)}` : '比赛结果未记录',
        ],
      },
    };
  }
  // 特定球员表现分析
  else if (analysisType === 'player_specific' && options?.player_name) {
    // 先查找球员
    const { data: playersData, error: playerError } = await supabase
      .from('players')
      .select('*')
      .ilike('name', `%${options.player_name}%`)
      .limit(1);

    if (playerError || !playersData || playersData.length === 0) {
      return {
        matchId: options?.match_id,
        matchDate: options?.match_date,
        type: 'player_specific',
        analysis: {
          summary: `未找到球员 "${options.player_name}"`,
          keyStats: {},
          insights: [],
        },
      };
    }

    const player = playersData[0] as PlayerBasicInfo;

    // 查找球员比赛统计
    let statsQuery = supabase
      .from('player_match_stats')
      .select(`
        *,
        matches!inner (
          id,
          date,
          venue,
          mode,
          teams,
          result
        )
      `)
      .eq('player_id', player.id);

    // 如果指定了 match_id 或 match_date，进一步筛选
    if (options.match_id) {
      statsQuery = statsQuery.eq('match_id', options.match_id);
    }
    if (options.match_date) {
      statsQuery = statsQuery.filter('matches', 'eq', { date: options.match_date });
    }

    const { data: statsData, error: statsError } = await statsQuery;

    if (statsError) {
      console.error('Error fetching player match stats:', statsError);
      return null;
    }

    if (!statsData || statsData.length === 0) {
      return {
        matchId: options?.match_id,
        matchDate: options?.match_date,
        type: 'player_specific',
        analysis: {
          summary: `球员 ${player.name} 未找到相关比赛记录`,
          keyStats: {},
          insights: [],
        },
      };
    }

    const stats = statsData as Array<PlayerMatchStats & { matches: MatchInfo }>;

    // 计算统计
    const totalMatches = stats.length;
    const avgPoints = stats.reduce((sum, s) => sum + s.points, 0) / totalMatches;
    const avgRebounds = stats.reduce((sum, s) => sum + s.rebounds, 0) / totalMatches;
    const avgAssists = stats.reduce((sum, s) => sum + s.assists, 0) / totalMatches;
    const avgSteals = stats.reduce((sum, s) => sum + s.steals, 0) / totalMatches;
    const avgBlocks = stats.reduce((sum, s) => sum + s.blocks, 0) / totalMatches;

    return {
      matchId: options?.match_id,
      matchDate: options?.match_date,
      type: 'player_specific',
      analysis: {
        summary: `球员 ${player.name}（位置：${player.position}）共参与 ${totalMatches} 场比赛`,
        keyStats: {
          totalMatches,
          avgPoints: Number(avgPoints.toFixed(1)),
          avgRebounds: Number(avgRebounds.toFixed(1)),
          avgAssists: Number(avgAssists.toFixed(1)),
          avgSteals: Number(avgSteals.toFixed(1)),
          avgBlocks: Number(avgBlocks.toFixed(1)),
        },
        insights: [
          `场均得分：${avgPoints.toFixed(1)} 分`,
          `场均篮板：${avgRebounds.toFixed(1)} 个`,
          `场均助攻：${avgAssists.toFixed(1)} 次`,
          `场均抢断：${avgSteals.toFixed(1)} 次`,
          `场均盖帽：${avgBlocks.toFixed(1)} 次`,
        ],
      },
    };
  }

  return null;
}
