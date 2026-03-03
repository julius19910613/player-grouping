// 篮球位置常量
export const BasketballPosition = {
  PG: 'PG',           // 控球后卫 (Point Guard)
  SG: 'SG',           // 得分后卫 (Shooting Guard)
  SF: 'SF',           // 小前锋 (Small Forward)
  PF: 'PF',           // 大前锋 (Power Forward)
  C: 'C',             // 中锋 (Center)
  UTILITY: 'UTILITY'  // 万金油 (可打多个位置)
} as const;

export type BasketballPosition = typeof BasketballPosition[keyof typeof BasketballPosition];

// 篮球能力评估接口
export interface BasketballSkills {
  // 投篮能力
  twoPointShot: number;        // 两分投篮 (1-99)
  threePointShot: number;      // 三分投篮 (1-99)
  freeThrow: number;           // 罚球 (1-99)

  // 组织能力
  passing: number;             // 传球 (1-99)
  ballControl: number;         // 控球 (1-99)
  courtVision: number;         // 场上视野 (1-99)

  // 防守能力
  perimeterDefense: number;    // 外线防守 (1-99)
  interiorDefense: number;     // 内线防守 (1-99)
  steals: number;              // 抢断 (1-99)
  blocks: number;              // 盖帽 (1-99)

  // 篮板能力
  offensiveRebound: number;    // 进攻篮板 (1-99)
  defensiveRebound: number;    // 防守篮板 (1-99)

  // 身体素质
  speed: number;               // 速度 (1-99)
  strength: number;            // 力量 (1-99)
  stamina: number;             // 耐力 (1-99)
  vertical: number;            // 弹跳 (1-99)

  // 篮球智商
  basketballIQ: number;        // 篮球智商 (1-99)
  teamwork: number;            // 团队配合 (1-99)
  clutch: number;              // 关键时刻表现 (1-99)

  // 总体能力
  overall: number;             // 总体评分 (自动计算)
}

// 位置详细信息
export interface PositionDetail {
  name: string;                // 中文名称
  englishName: string;         // 英文名称
  icon: string;                // 图标 emoji
  color: string;               // 颜色代码
  description: string;         // 位置描述
}

// 位置详细信息映射
export const POSITION_DETAILS: Record<BasketballPosition, PositionDetail> = {
  [BasketballPosition.PG]: {
    name: '控球后卫',
    englishName: 'Point Guard',
    icon: '🏀',
    color: '#3B82F6',
    description: '组织进攻，掌控节奏'
  },
  [BasketballPosition.SG]: {
    name: '得分后卫',
    englishName: 'Shooting Guard',
    icon: '🎯',
    color: '#EF4444',
    description: '外线得分手，投射能力强'
  },
  [BasketballPosition.SF]: {
    name: '小前锋',
    englishName: 'Small Forward',
    icon: '⚡',
    color: '#F59E0B',
    description: '全能型球员，攻防兼备'
  },
  [BasketballPosition.PF]: {
    name: '大前锋',
    englishName: 'Power Forward',
    icon: '💪',
    color: '#10B981',
    description: '内线强力球员，篮板和防守'
  },
  [BasketballPosition.C]: {
    name: '中锋',
    englishName: 'Center',
    icon: '🏔️',
    color: '#8B5CF6',
    description: '禁区统治者，篮板和封盖'
  },
  [BasketballPosition.UTILITY]: {
    name: '万金油',
    englishName: 'Utility',
    icon: '✨',
    color: '#6B7280',
    description: '可打多个位置的球员'
  }
};

/**
 * 计算球员的总体能力评分
 * 根据不同位置，各项能力的权重不同
 */
export function calculateOverallSkill(
  skills: Omit<BasketballSkills, 'overall'>,
  position: BasketballPosition
): number {
  // 定义不同位置的能力权重
  const positionWeights: Record<BasketballPosition, Record<keyof Omit<BasketballSkills, 'overall'>, number>> = {
    [BasketballPosition.PG]: {
      // 控球后卫：重视传球、控球、视野、速度、三分
      twoPointShot: 0.06,
      threePointShot: 0.10,
      freeThrow: 0.04,
      passing: 0.12,
      ballControl: 0.12,
      courtVision: 0.10,
      perimeterDefense: 0.08,
      interiorDefense: 0.03,
      steals: 0.06,
      blocks: 0.02,
      offensiveRebound: 0.02,
      defensiveRebound: 0.04,
      speed: 0.10,
      strength: 0.03,
      stamina: 0.04,
      vertical: 0.02,
      basketballIQ: 0.08,
      teamwork: 0.06,
      clutch: 0.06
    },
    [BasketballPosition.SG]: {
      // 得分后卫：重视投篮、三分、速度、外线防守
      twoPointShot: 0.10,
      threePointShot: 0.12,
      freeThrow: 0.06,
      passing: 0.06,
      ballControl: 0.06,
      courtVision: 0.05,
      perimeterDefense: 0.10,
      interiorDefense: 0.03,
      steals: 0.06,
      blocks: 0.02,
      offensiveRebound: 0.02,
      defensiveRebound: 0.04,
      speed: 0.08,
      strength: 0.03,
      stamina: 0.04,
      vertical: 0.04,
      basketballIQ: 0.05,
      teamwork: 0.05,
      clutch: 0.09
    },
    [BasketballPosition.SF]: {
      // 小前锋：全面型，各项能力相对均衡
      twoPointShot: 0.08,
      threePointShot: 0.07,
      freeThrow: 0.05,
      passing: 0.06,
      ballControl: 0.06,
      courtVision: 0.06,
      perimeterDefense: 0.08,
      interiorDefense: 0.06,
      steals: 0.06,
      blocks: 0.04,
      offensiveRebound: 0.05,
      defensiveRebound: 0.06,
      speed: 0.07,
      strength: 0.05,
      stamina: 0.04,
      vertical: 0.05,
      basketballIQ: 0.06,
      teamwork: 0.05,
      clutch: 0.07
    },
    [BasketballPosition.PF]: {
      // 大前锋：重视内线、篮板、防守、力量
      twoPointShot: 0.07,
      threePointShot: 0.03,
      freeThrow: 0.04,
      passing: 0.04,
      ballControl: 0.04,
      courtVision: 0.04,
      perimeterDefense: 0.06,
      interiorDefense: 0.12,
      steals: 0.04,
      blocks: 0.08,
      offensiveRebound: 0.10,
      defensiveRebound: 0.10,
      speed: 0.04,
      strength: 0.10,
      stamina: 0.04,
      vertical: 0.06,
      basketballIQ: 0.05,
      teamwork: 0.04,
      clutch: 0.05
    },
    [BasketballPosition.C]: {
      // 中锋：重视内线、篮板、封盖、力量、身高
      twoPointShot: 0.06,
      threePointShot: 0.02,
      freeThrow: 0.04,
      passing: 0.03,
      ballControl: 0.03,
      courtVision: 0.03,
      perimeterDefense: 0.03,
      interiorDefense: 0.14,
      steals: 0.02,
      blocks: 0.12,
      offensiveRebound: 0.12,
      defensiveRebound: 0.12,
      speed: 0.03,
      strength: 0.12,
      stamina: 0.03,
      vertical: 0.08,
      basketballIQ: 0.04,
      teamwork: 0.03,
      clutch: 0.05
    },
    [BasketballPosition.UTILITY]: {
      // 万金油：所有能力平均权重
      twoPointShot: 0.055,
      threePointShot: 0.055,
      freeThrow: 0.05,
      passing: 0.055,
      ballControl: 0.055,
      courtVision: 0.055,
      perimeterDefense: 0.055,
      interiorDefense: 0.055,
      steals: 0.05,
      blocks: 0.05,
      offensiveRebound: 0.055,
      defensiveRebound: 0.055,
      speed: 0.055,
      strength: 0.055,
      stamina: 0.05,
      vertical: 0.055,
      basketballIQ: 0.055,
      teamwork: 0.055,
      clutch: 0.055
    }
  };

  // 获取当前位置的权重配置
  const weights = positionWeights[position];

  // 计算加权平均分
  let totalScore = 0;
  let totalWeight = 0;

  for (const skill in weights) {
    const skillKey = skill as keyof Omit<BasketballSkills, 'overall'>;
    const weight = weights[skillKey];
    const value = skills[skillKey] || 0; // Safeguard if skill missing

    totalScore += value * weight;
    totalWeight += weight;
  }

  // 返回四舍五入的总体评分
  return Math.round(totalScore / totalWeight);
}

/**
 * 创建默认的篮球能力值
 */
export function createDefaultBasketballSkills(): BasketballSkills {
  return {
    twoPointShot: 50,
    threePointShot: 50,
    freeThrow: 50,
    passing: 50,
    ballControl: 50,
    courtVision: 50,
    perimeterDefense: 50,
    interiorDefense: 50,
    steals: 50,
    blocks: 50,
    offensiveRebound: 50,
    defensiveRebound: 50,
    speed: 50,
    strength: 50,
    stamina: 50,
    vertical: 50,
    basketballIQ: 50,
    teamwork: 50,
    clutch: 50,
    overall: 50
  };
}

/**
 * 验证能力值是否在有效范围内
 */
export function validateSkillValue(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 99;
}

/**
 * 获取位置的简要描述
 */
export function getPositionBrief(position: BasketballPosition): string {
  const detail = POSITION_DETAILS[position];
  return `${detail.icon} ${detail.name} (${detail.englishName})`;
}
