/**
 * 比赛相关类型定义
 * @module types/match
 */

// ============================================================================
// Match Types
// ============================================================================

/**
 * 比赛模式
 */
export type MatchMode = '5v5' | '3v3' | 'custom';

/**
 * 比赛获胜方
 */
export type MatchWinner = 'team_a' | 'team_b' | 'draw';

/**
 * 比赛记录
 */
export interface Match {
  id: string;
  userId?: string;
  matchDate: Date;
  venue?: string;
  mode: MatchMode;
  teamAScore: number;
  teamBScore: number;
  winner?: MatchWinner;
  teamAPlayers: string[];
  teamBPlayers: string[];
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建比赛 DTO
 */
export interface CreateMatchDTO {
  matchDate?: string;
  venue?: string;
  mode: MatchMode;
  teamAScore?: number;
  teamBScore?: number;
  winner?: MatchWinner;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  note?: string;
}

/**
 * 更新比赛 DTO
 */
export interface UpdateMatchDTO {
  matchDate?: string;
  venue?: string;
  mode?: MatchMode;
  teamAScore?: number;
  teamBScore?: number;
  winner?: MatchWinner;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  note?: string;
}

// ============================================================================
// Player Match Stats Types
// ============================================================================

/**
 * 球员所在队伍
 */
export type PlayerTeam = 'team_a' | 'team_b';

/**
 * 球员比赛表现统计
 */
export interface PlayerMatchStats {
  id: string;
  matchId: string;
  playerId: string;
  team: PlayerTeam;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutesPlayed: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  plusMinus: number;
  efficiencyRating?: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建球员比赛表现 DTO
 */
export interface CreatePlayerMatchStatsDTO {
  matchId: string;
  playerId: string;
  team: PlayerTeam;
  points?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  fouls?: number;
  minutesPlayed?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  plusMinus?: number;
  efficiencyRating?: number;
  note?: string;
}

/**
 * 更新球员比赛表现 DTO
 */
export interface UpdatePlayerMatchStatsDTO {
  team?: PlayerTeam;
  points?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  fouls?: number;
  minutesPlayed?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  plusMinus?: number;
  efficiencyRating?: number;
  note?: string;
}

// ============================================================================
// Skill Adjustment Types
// ============================================================================

/**
 * 能力调整类型
 */
export type AdjustmentType = 'match_performance' | 'manual' | 'ai_analysis' | 'video_analysis';

/**
 * 审核状态
 */
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';

/**
 * 能力调整记录
 */
export interface SkillAdjustment {
  id: string;
  playerId: string;
  matchId?: string;
  adjustmentType: AdjustmentType;
  skillsBefore: Record<string, number>;
  skillsAfter: Record<string, number>;
  reason?: string;
  overallChange: number;
  status: AdjustmentStatus;
  reviewedBy?: string;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建能力调整 DTO
 */
export interface CreateSkillAdjustmentDTO {
  playerId: string;
  matchId?: string;
  adjustmentType: AdjustmentType;
  skillsBefore: Record<string, number>;
  skillsAfter: Record<string, number>;
  reason?: string;
  overallChange?: number;
  status?: AdjustmentStatus;
}

/**
 * 更新能力调整 DTO
 */
export interface UpdateSkillAdjustmentDTO {
  skillsBefore?: Record<string, number>;
  skillsAfter?: Record<string, number>;
  reason?: string;
  overallChange?: number;
  status?: AdjustmentStatus;
}

// ============================================================================
// Player Video Types
// ============================================================================

/**
 * 视频类型
 */
export type VideoType = 'match' | 'training' | 'highlight' | 'analysis';

/**
 * 视频状态
 */
export type VideoStatus = 'pending' | 'processing' | 'ready' | 'error';

/**
 * 球员视频
 */
export interface PlayerVideo {
  id: string;
  playerId: string;
  matchId?: string;
  userId?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  videoType: VideoType;
  status: VideoStatus;
  aiAnalysis?: any;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建球员视频 DTO
 */
export interface CreatePlayerVideoDTO {
  playerId: string;
  matchId?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  videoType: VideoType;
  status?: VideoStatus;
  aiAnalysis?: any;
  tags?: string[];
}

/**
 * 更新球员视频 DTO
 */
export interface UpdatePlayerVideoDTO {
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  videoType?: VideoType;
  status?: VideoStatus;
  aiAnalysis?: any;
  tags?: string[];
}
