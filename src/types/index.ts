// 类型系统统一导出
export {
  // 篮球类型
  BasketballPosition,
  BasketballSkills,
  PositionDetail,
  POSITION_DETAILS,
  calculateOverallSkill,
  createDefaultBasketballSkills,
  validateSkillValue,
  getPositionBrief,
  
  // 球员和团队类型
  Player,
  Team,
  GroupingStrategy,
  GroupingConfig,
  
  // 已弃用的别名（向后兼容）
  PlayerPosition,
  PlayerSkills
} from './player';
