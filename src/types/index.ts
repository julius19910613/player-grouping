// 类型系统统一导出

// 从 basketball.ts 导出
export { BasketballPosition, POSITION_DETAILS } from './basketball';
export { calculateOverallSkill, createDefaultBasketballSkills } from './basketball';
export type { BasketballSkills, PositionDetail } from './basketball';

// 从 player.ts 导出
export type { Player, Team, GroupingStrategy, GroupingConfig } from './player';

// 向后兼容别名
export type { PlayerPosition, PlayerSkills } from './player';
