# Player Grouping 项目总结

> 生成时间: 2026-03-03
> 项目路径: `~/.openclaw/workspace/projects/player-grouping`
> GitHub: https://github.com/julius19910613/player-grouping

---

## 📋 项目概述

**球员分组程序** - 一个智能的篮球球员分组 Web 应用，可以根据球员能力、位置自动分配到平衡的团队。

| 项目信息 | 内容 |
|----------|------|
| **技术栈** | React 19 + TypeScript + Vite + Vitest |
| **UI 库** | Chart.js + Framer Motion |
| **部署** | GitHub Pages |
| **状态管理** | React Hooks |
| **数据存储** | LocalStorage |

---

## ✅ 已实现功能

### 1. 篮球位置系统

支持 6 种篮球位置：

| 位置 | 缩写 | 描述 |
|------|------|------|
| 控球后卫 | PG | 组织进攻，掌控节奏 |
| 得分后卫 | SG | 外线得分手，投射能力强 |
| 小前锋 | SF | 全能型球员，攻防兼备 |
| 大前锋 | PF | 内线强力球员，篮板和防守 |
| 中锋 | C | 禁区统治者，篮板和封盖 |
| 万金油 | UTILITY | 可打多个位置的球员 |

### 2. 球员能力评分系统

**19 项详细能力指标**（1-99 评分）：

| 类别 | 能力项 |
|------|--------|
| **投篮** | 两分投篮、三分投篮、罚球 |
| **组织** | 传球、控球、场上视野 |
| **防守** | 外线防守、内线防守、抢断、盖帽 |
| **篮板** | 进攻篮板、防守篮板 |
| **身体** | 速度、力量、耐力、弹跳 |
| **篮球智商** | 篮球智商、团队配合、关键时刻表现 |
| **综合** | Overall（根据位置权重自动计算） |

**位置权重计算**：
- 不同位置的各项能力权重不同
- 例如：PG 重视传球(12%)、控球(12%)、三分(10%)
- 例如：C 重视内线防守(14%)、篮板(24%)、力量(12%)

### 3. 分组算法

#### 5v5 分组算法
```
1. 按位置分组 (PG/SG/SF/PF/C/UTILITY)
2. 每个位置内按能力排序
3. 轮流分配每个位置的球员到各队
4. 万金油球员分配到最需要平衡的队伍
5. 迭代平衡（交换球员使实力接近）
```

#### 3v3 分组算法
```
1. 按位置组合分组（后卫/前锋/内线）
2. 各组内按能力排序
3. 轮流分配到各队
4. 平衡团队实力
```

#### 平衡策略
- 蛇形选人机制
- 能力平衡算法
- 位置互补原则
- 差距 <10 分即认为平衡

### 4. 球员管理功能

| 功能 | 描述 |
|------|------|
| 添加球员 | 填写基本信息 + 能力评分 |
| 编辑球员 | 修改球员信息和能力 |
| 删除球员 | 从列表移除 |
| 数据验证 | 名称/位置/能力值校验 |
| 本地存储 | 自动保存到 LocalStorage |

### 5. 数据可视化

| 组件 | 功能 |
|------|------|
| `SkillRadarChart` | 球员能力雷达图 |
| `TeamComparisonChart` | 团队对比图表 |
| `GroupingResultDisplay` | 分组结果展示 |
| `GroupingAnimation` | 分组动画效果 |

### 6. UI/UX 特性

- 深色/浅色主题切换
- 响应式设计（移动端 + 桌面端）
- Framer Motion 动画效果
- 直观的表单和卡片界面

---

## 📁 项目结构

```
player-grouping/
├── src/
│   ├── components/           # React 组件
│   │   ├── EditPlayerModal.tsx    # 编辑球员弹窗
│   │   ├── GroupingAnimation.tsx  # 分组动画
│   │   ├── GroupingResultDisplay.tsx  # 分组结果
│   │   ├── PlayerCard.tsx         # 球员卡片
│   │   ├── PlayerForm.tsx         # 球员表单
│   │   ├── PositionSelect.tsx     # 位置选择器
│   │   ├── SkillRadarChart.tsx    # 能力雷达图
│   │   ├── SkillSlider.tsx        # 能力滑块
│   │   └── TeamComparisonChart.tsx # 团队对比图
│   ├── hooks/
│   │   └── usePlayerManager.ts    # 球员管理 Hook
│   ├── utils/
│   │   ├── basketballGroupingAlgorithm.ts  # 篮球分组算法
│   │   ├── groupingAlgorithm.ts   # 通用分组算法
│   │   └── storage.ts             # 本地存储
│   ├── types/
│   │   ├── basketball.ts          # 篮球类型定义
│   │   └── player.ts              # 球员类型定义
│   ├── styles/
│   │   └── theme.css              # 主题样式
│   ├── App.tsx                    # 主应用组件
│   └── main.tsx                   # 入口文件
├── design/
│   ├── ROADMAP.md                 # 产品路线图
│   ├── FEATURES.md                # 功能设计
│   └── IMPLEMENTATION.md          # 实现计划
└── package.json
```

---

## 🔧 核心代码模块

### 1. 篮球分组算法 (basketballGroupingAlgorithm.ts)

```typescript
class BasketballGroupingAlgorithm {
  // 5v5 分组
  static groupFor5v5(players: BasketballPlayer[]): BasketballTeam[]
  
  // 3v3 分组
  static groupFor3v3(players: BasketballPlayer[]): BasketballTeam[]
  
  // 计算平衡分数（标准差）
  static calculateBalanceScore(teams: BasketballTeam[]): number
  
  // 获取团队统计
  static getTeamStats(teams: BasketballTeam[]): BasketballTeamStats[]
}
```

### 2. 球员管理 Hook (usePlayerManager.ts)

```typescript
function usePlayerManager(): {
  players: Player[]
  editingPlayer: Player | null
  addPlayer: (player) => ValidationResult
  updatePlayer: (id, updates) => ValidationResult
  deletePlayer: (id) => void
  validatePlayer: (player) => ValidationResult
}
```

### 3. 能力计算 (basketball.ts)

```typescript
// 根据位置权重计算综合能力
function calculateOverallSkill(
  skills: Omit<BasketballSkills, 'overall'>,
  position: BasketballPosition
): number

// 创建默认能力值
function createDefaultBasketballSkills(): BasketballSkills
```

---

## 📊 测试覆盖

| 测试文件 | 测试内容 |
|----------|----------|
| `basketballGroupingAlgorithm.test.ts` | 分组算法测试 |
| `usePlayerManager.test.ts` | 球员管理 Hook 测试 |

运行测试：
```bash
npm test              # 运行测试
npm run test:coverage # 覆盖率报告
npm run test:watch    # 监视模式
```

---

## 🚀 开发命令

```bash
npm run dev      # 启动开发服务器 (localhost:5173)
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
npm run deploy   # 部署到 GitHub Pages
```

---

## 📅 版本规划

### v1.1 - 篮球专业化（当前）
- ✅ 篮球位置系统
- ✅ 篮球能力评分（19项）
- ✅ 编辑球员功能
- ⏳ 球员头像上传

### v1.2 - 分组增强（计划中）
- 多种赛制支持 (3v3/4v4/5v5)
- 智能分组算法优化
- 分组规则设置
- 分组预设

### v1.3 - 比赛管理
- 比赛日程管理
- 比赛记录统计
- 历史数据分析
- 社交功能

### v2.0 - 团队协作版
- 多用户系统
- 团队/俱乐部管理
- 活动管理
- 移动应用

---

## 🔗 相关链接

- **GitHub**: https://github.com/julius19910613/player-grouping
- **在线演示**: https://julius19910613.github.io/player-grouping
- **设计文档**: `design/ROADMAP.md`, `design/FEATURES.md`

---

*此文档由 Javis 自动生成*
