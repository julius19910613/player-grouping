// 球员位置类型
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

// 球员能力评估
export interface PlayerSkills {
  speed: number;        // 速度 (1-10)
  shooting: number;     // 射门 (1-10)
  passing: number;      // 传球 (1-10)
  defense: number;      // 防守 (1-10)
  physical: number;     // 身体素质 (1-10)
  overall: number;      // 总体能力 (自动计算)
}

// 球员信息
export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  skills: PlayerSkills;
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

// 位置显示名称
export const POSITION_NAMES: Record<PlayerPosition, string> = {
  GK: '守门员',
  DEF: '后卫',
  MID: '中场',
  FWD: '前锋',
};

// 计算总体能力
export const calculateOverallSkill = (skills: PlayerSkills): number => {
  const { speed, shooting, passing, defense, physical } = skills;
  return Math.round((speed + shooting + passing + defense + physical) / 5);
};
