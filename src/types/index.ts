// 类型系统统一导出

// 从 basketball.ts 导出
export { BasketballPosition, POSITION_DETAILS } from './basketball';
export { calculateOverallSkill, createDefaultBasketballSkills } from './basketball';
export type { BasketballSkills, PositionDetail } from './basketball';

// 从 player.ts 导出
export type { Player, Team, GroupingStrategy, GroupingConfig } from './player';

// 从 match.ts 导出
export type {
  Match,
  MatchMode,
  MatchWinner,
  CreateMatchDTO,
  UpdateMatchDTO,
  PlayerMatchStats,
  PlayerTeam,
  CreatePlayerMatchStatsDTO,
  UpdatePlayerMatchStatsDTO,
  SkillAdjustment,
  AdjustmentType,
  AdjustmentStatus,
  CreateSkillAdjustmentDTO,
  UpdateSkillAdjustmentDTO,
  PlayerVideo,
  VideoType,
  VideoStatus,
  CreatePlayerVideoDTO,
  UpdatePlayerVideoDTO,
} from './match';

// 向后兼容别名
export type { PlayerPosition, PlayerSkills } from './player';
