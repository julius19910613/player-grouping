# 功能详细设计文档

## 📋 目录
- [篮球位置系统](#篮球位置系统)
- [篮球能力评分](#篮球能力评分)
- [分组算法](#分组算法)
- [数据管理](#数据管理)
- [界面设计](#界面设计)

---

## 篮球位置系统

### 位置类型定义

```typescript
// 篮球位置枚举
export enum BasketballPosition {
  PG = 'PG',  // 控球后卫 / Point Guard
  SG = 'SG',  // 得分后卫 / Shooting Guard
  SF = 'SF',  // 小前锋 / Small Forward
  PF = 'PF',  // 大前锋 / Power Forward
  C = 'C',    // 中锋 / Center
  UTILITY = 'UTILITY' // 通用 / 多位置
}

// 位置详细信息
export const POSITION_DETAILS: Record<BasketballPosition, PositionDetail> = {
  PG: {
    name: '控球后卫',
    englishName: 'Point Guard',
    abbreviation: 'PG',
    description: '组织进攻，掌控比赛节奏',
    icon: '🏀',
    color: '#3B82F6', // 蓝色
    skillWeights: {
      passing: 1.5,
      ballControl: 1.5,
      shooting: 1.0,
      defense: 0.8,
      rebound: 0.5,
      speed: 1.2
    }
  },
  SG: {
    name: '得分后卫',
    englishName: 'Shooting Guard',
    abbreviation: 'SG',
    description: '主要得分手，外线投射',
    icon: '🎯',
    color: '#EF4444', // 红色
    skillWeights: {
      passing: 0.8,
      ballControl: 1.0,
      shooting: 1.5,
      defense: 0.8,
      rebound: 0.6,
      speed: 1.2
    }
  },
  SF: {
    name: '小前锋',
    englishName: 'Small Forward',
    abbreviation: 'SF',
    description: '全能型球员，攻防兼备',
    icon: '⚡',
    color: '#F59E0B', // 橙色
    skillWeights: {
      passing: 1.0,
      ballControl: 1.0,
      shooting: 1.2,
      defense: 1.2,
      rebound: 1.0,
      speed: 1.2
    }
  },
  PF: {
    name: '大前锋',
    englishName: 'Power Forward',
    abbreviation: 'PF',
    description: '内线得分，篮板保护',
    icon: '💪',
    color: '#10B981', // 绿色
    skillWeights: {
      passing: 0.8,
      ballControl: 0.7,
      shooting: 0.8,
      defense: 1.3,
      rebound: 1.5,
      speed: 0.8
    }
  },
  C: {
    name: '中锋',
    englishName: 'Center',
    abbreviation: 'C',
    description: '篮下守护者，篮板核心',
    icon: '🏰',
    color: '#8B5CF6', // 紫色
    skillWeights: {
      passing: 0.7,
      ballControl: 0.5,
      shooting: 0.6,
      defense: 1.5,
      rebound: 1.5,
      speed: 0.6
    }
  },
  UTILITY: {
    name: '通用',
    englishName: 'Utility',
    abbreviation: '全能',
    description: '适应多个位置',
    icon: '🔄',
    color: '#6B7280', // 灰色
    skillWeights: {
      passing: 1.0,
      ballControl: 1.0,
      shooting: 1.0,
      defense: 1.0,
      rebound: 1.0,
      speed: 1.0
    }
  }
}
```

### 位置兼容性矩阵

```typescript
// 位置兼容性（某些位置可以互相替代）
export const POSITION_COMPATIBILITY: Record<BasketballPosition, BasketballPosition[]> = {
  PG: ['PG', 'SG'],           // 控卫可以打分卫
  SG: ['SG', 'PG', 'SF'],     // 分卫可以打控卫或小前
  SF: ['SF', 'SG', 'PF'],     // 小前可以打分卫或大前
  PF: ['PF', 'SF', 'C'],      // 大前可以打小前或中锋
  C: ['C', 'PF'],             // 中锋可以打大前
  UTILITY: ['PG', 'SG', 'SF', 'PF', 'C'] // 通用可以打所有位置
}
```

---

## 篮球能力评分

### 能力维度设计

```typescript
// 篮球技能体系
export interface BasketballSkills {
  // 投篮能力
  twoPointShot: number;      // 两分投篮 (1-10)
  threePointShot: number;    // 三分投篮 (1-10)
  freeThrow: number;         // 罚球 (1-10)

  // 组织能力
  passing: number;           // 传球 (1-10)
  ballControl: number;       // 控球 (1-10)
  courtVision: number;       // 视野 (1-10)

  // 防守能力
  perimeterDefense: number;  // 外线防守 (1-10)
  interiorDefense: number;   // 内线防守 (1-10)
  steals: number;            // 抢断 (1-10)
  blocks: number;            // 盖帽 (1-10)

  // 篮板能力
  offensiveRebound: number;  // 进攻篮板 (1-10)
  defensiveRebound: number;  // 防守篮板 (1-10)

  // 身体素质
  speed: number;             // 速度 (1-10)
  strength: number;          // 力量 (1-10)
  stamina: number;           // 体能 (1-10)
  vertical: number;          // 弹跳 (1-10)

  // 篮球智商
  basketballIQ: number;      // 篮球智商 (1-10)
  teamwork: number;          // 团队配合 (1-10)
  clutch: number;            // 关键时刻表现 (1-10)

  // 综合评分（自动计算）
  overall: number;           // 总体评分 (1-10)
}
```

### 评分计算公式

```typescript
// 根据位置加权计算总体评分
export function calculateOverallSkill(
  skills: BasketballSkills,
  position: BasketballPosition
): number {
  const weights = POSITION_DETAILS[position].skillWeights;

  const shooting = (skills.twoPointShot + skills.threePointShot + skills.freeThrow) / 3;
  const playmaking = (skills.passing + skills.ballControl + skills.courtVision) / 3;
  const defense = (skills.perimeterDefense + skills.interiorDefense + skills.steals + skills.blocks) / 4;
  const rebounding = (skills.offensiveRebound + skills.defensiveRebound) / 2;
  const physical = (skills.speed + skills.strength + skills.stamina + skills.vertical) / 4;
  const mental = (skills.basketballIQ + skills.teamwork + skills.clutch) / 3;

  const weightedScore =
    shooting * weights.shooting +
    playmaking * weights.passing +
    defense * weights.defense +
    rebounding * weights.rebound +
    physical * weights.speed +
    mental * 1.0;

  return Math.round(weightedScore * 10) / 10;
}
```

### 能力等级描述

```typescript
export const SKILL_LEVELS = {
  1: '初学者',
  2: '入门',
  3: '基础',
  4: '初级',
  5: '中等',
  6: '良好',
  7: '优秀',
  8: '出色',
  9: '精英',
  10: '顶级'
}
```

---

## 分组算法

### 算法类型

#### 1. 能力平衡算法（Balanced）

**目标：** 确保每个团队的总实力接近

**实现方式：**
- 贪心算法：按能力从高到低排序，依次分配给当前总能力最低的团队
- 动态调整：考虑位置平衡

**伪代码：**
```
1. 按球员总体能力降序排序
2. 初始化 teamCount 个空团队
3. 对于每个球员：
   a. 找到当前总能力最低的团队
   b. 如果该团队缺少该球员的位置类型，分配给它
   c. 否则，分配给总能力次低的合适团队
4. 返回分组结果
```

#### 2. 位置平衡算法（Position Balanced）

**目标：** 确保每个团队有合理的位置配置

**实现方式：**
- 先按位置分组
- 每个位置内部按能力排序
- 轮流分配到各个团队

**5v5 标准配置：**
```
每个团队应该有：
- 1个 PG（控卫）
- 1个 SG（分卫）
- 1个 SF（小前）
- 1个 PF（大前）
- 1个 C（中锋）

或者灵活配置：
- 2个后卫（PG/SG）
- 2个前锋（SF/PF）
- 1个中锋（C）
```

**3v3 标准配置：**
```
每个团队应该有：
- 1个后卫（PG/SG）
- 1个前锋（SF/PF）
- 1个内线（PF/C）

或者：
- 1个外线
- 1个锋线
- 1个内线
```

#### 3. 智能分组算法（Smart）

**目标：** 综合考虑多种因素，生成最优分组

**考虑因素：**
- 球员能力平衡
- 位置配置合理
- 球员配合度（历史数据）
- 球员风格互补
- 避免"超级球队"

**实现：**
```typescript
interface SmartGroupingConfig {
  balanceWeight: number;      // 能力平衡权重 (0-1)
  positionWeight: number;     // 位置平衡权重 (0-1)
  chemistryWeight: number;    // 配合度权重 (0-1)
  diversityWeight: number;    // 风格多样性权重 (0-1)
}

function smartGrouping(
  players: Player[],
  teamCount: number,
  config: SmartGroupingConfig
): Team[] {
  // 使用遗传算法或模拟退火
  // 评估函数考虑多个维度
  // 生成 Pareto 最优解集
  // 返回最佳分组方案
}
```

#### 4. 随机分组（Random）

**目标：** 快速随机分配，适用于休闲场合

**实现：**
```typescript
function randomGrouping(players: Player[], teamCount: number): Team[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  // 分配到团队...
}
```

---

## 数据管理

### 本地存储结构

```typescript
// LocalStorage 键值
const STORAGE_KEYS = {
  PLAYERS: 'basketball-players',
  GROUPINGS: 'basketball-groupings',
  SETTINGS: 'basketball-settings',
  HISTORY: 'basketball-history'
}

// 球员数据
interface StoredPlayer extends Player {
  avatar?: string;          // 头像 URL
  notes?: string;           // 备注
  lastPlayed?: Date;        // 最后参赛时间
  totalGames?: number;      // 参赛总数
  winRate?: number;         // 胜率
}

// 分组历史
interface GroupingHistory {
  id: string;
  createdAt: Date;
  teams: Team[];
  strategy: GroupingStrategy;
  playerCount: number;
  teamCount: number;
  balance: number;          // 平衡度分数
  tags?: string[];          // 标签（如"训练"、"比赛"）
}
```

### 导入/导出格式

```json
{
  "version": "1.1",
  "exportDate": "2026-03-02T15:19:00Z",
  "players": [
    {
      "id": "player-123",
      "name": "张三",
      "position": "PG",
      "skills": {
        "twoPointShot": 8,
        "threePointShot": 7,
        "freeThrow": 8,
        "passing": 9,
        "ballControl": 9,
        "courtVision": 8,
        "perimeterDefense": 7,
        "interiorDefense": 5,
        "steals": 7,
        "blocks": 3,
        "offensiveRebound": 4,
        "defensiveRebound": 5,
        "speed": 8,
        "strength": 6,
        "stamina": 7,
        "vertical": 6,
        "basketballIQ": 8,
        "teamwork": 9,
        "clutch": 7,
        "overall": 7.2
      },
      "avatar": "data:image/png;base64,...",
      "notes": "球队队长，组织核心",
      "createdAt": "2026-03-01T10:00:00Z",
      "updatedAt": "2026-03-02T15:00:00Z"
    }
  ]
}
```

---

## 界面设计

### 配色方案（篮球主题）

```css
/* 主色调 */
--primary-color: #FF6B35;      /* 篮球橙 */
--primary-dark: #E55A2B;
--primary-light: #FF8C5A;

/* 辅助色 */
--secondary-color: #1A1A2E;    /* 深蓝黑 */
--accent-color: #16213E;       /* 深蓝 */

/* 位置颜色 */
--pg-color: #3B82F6;           /* 控卫 - 蓝色 */
--sg-color: #EF4444;           /* 分卫 - 红色 */
--sf-color: #F59E0B;           /* 小前 - 橙色 */
--pf-color: #10B981;           /* 大前 - 绿色 */
--c-color: #8B5CF6;            /* 中锋 - 紫色 */

/* 背景色 */
--bg-primary: #F8F9FA;
--bg-secondary: #FFFFFF;
--bg-court: rgba(255, 107, 53, 0.05);  /* 浅橙色背景 */

/* 文字色 */
--text-primary: #1F2937;
--text-secondary: #6B7280;
--text-light: #9CA3AF;
```

### 布局设计

#### 主页面结构
```
┌─────────────────────────────────────┐
│        篮球分组应用 Logo              │
│      Basketball Team Divider         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📊 球员管理                          │
│  ┌──────────┬──────────┬──────────┐ │
│  │ 添加球员  │ 导入数据  │ 导出数据  │ │
│  └──────────┴──────────┴──────────┘ │
│                                      │
│  球员列表（卡片式布局）                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ PG  │ │ SG  │ │ SF  │ │ PF  │  │
│  │ 张三 │ │ 李四 │ │ 王五 │ │ 赵六 │  │
│  │ 7.2 │ │ 6.8 │ │ 7.5 │ │ 7.0 │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🎯 分组设置                          │
│  赛制选择: [3v3] [4v4] [5v5]         │
│  团队数量: [  2  ] [  3  ] [  4  ]   │
│  分组策略: [能力平衡 ▼]               │
│  [开始分组] [重新分组] [保存方案]      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🏆 分组结果                          │
│  ┌──────────┬──────────┬──────────┐ │
│  │  团队 A   │  团队 B   │  团队 C   │ │
│  │ 总能力:35 │ 总能力:34 │ 总能力:36 │ │
│  │          │          │          │ │
│  │ PG 张三  │ PG 李四  │ PG 王五  │ │
│  │ SG 赵六  │ SG 钱七  │ SG 孙八  │ │
│  │ SF 周九  │ SF 吴十  │ SF 郑十一│ │
│  └──────────┴──────────┴──────────┘ │
│                                      │
│  平衡度评分: 95/100 ⭐⭐⭐⭐⭐        │
│  [分享结果] [保存为预设] [导出图片]   │
└─────────────────────────────────────┘
```

### 组件设计规范

#### 球员卡片
```
┌─────────────────────┐
│  [头像]              │
│                      │
│  张三                │
│  PG 控球后卫          │
│  ⭐ 7.2              │
│                      │
│  投篮: ████████░░ 8  │
│  传球: █████████░ 9  │
│  控球: █████████░ 9  │
│  防守: ███████░░░ 7  │
│  篮板: █████░░░░░ 5  │
│  速度: ████████░░ 8  │
│                      │
│  [编辑] [删除]        │
└─────────────────────┘
```

#### 能力雷达图
```
        投篮
         /\
        /  \
       /    \
  传球 ────── 控球
       \    /
        \  /
         \/
       防守

半径代表能力值（1-10）
颜色代表位置
```

---

*最后更新：2026-03-02*
*维护者：Julius*
