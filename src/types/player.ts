// 从 basketball.ts 导入篮球相关类型
import { BasketballPosition } from './basketball';
import type { BasketballSkills } from './basketball';

// 重新导出篮球类型，方便其他模块使用
export { BasketballPosition, POSITION_DETAILS } from './basketball';
export { calculateOverallSkill, createDefaultBasketballSkills } from './basketball';
export type { BasketballSkills } from './basketball';

// PositionDetail 类型
export type { PositionDetail } from './basketball';

// 球员信息
export interface Player {
  id: string;
  name: string;
  position: BasketballPosition;  // 使用篮球位置
  skills: BasketballSkills;      // 使用篮球能力
  createdAt: Date;
  updatedAt: Date;
}

// 团队信息
export interface Team {
  id: string;
  name: string;
  players: Player[];
  totalSkill: number;
}

// 分组策略
export type GroupingStrategy = 'balanced' | 'position-balanced' | 'random';

// 分组配置
export interface GroupingConfig {
  teamCount: number;
  strategy: GroupingStrategy;
  playersPerTeam?: number;
}

// 为了向后兼容，保留旧类型别名（已弃用）
/** @deprecated 使用 BasketballPosition 代替 */
export type PlayerPosition = BasketballPosition;

/** @deprecated 使用 BasketballSkills 代替 */
export type PlayerSkills = BasketballSkills;
