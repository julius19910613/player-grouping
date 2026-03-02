# 实现计划

## 📅 Sprint 规划

### Sprint 1: 篮球专业化改造（Week 1）

#### Day 1-2: 类型系统重构
**目标：** 将足球位置和能力改为篮球体系

**任务清单：**
- [ ] 创建 `src/types/basketball.ts` 文件
- [ ] 定义 `BasketballPosition` 枚举
- [ ] 定义 `BasketballSkills` 接口
- [ ] 实现 `calculateOverallSkill` 函数
- [ ] 更新 `Player` 接口使用新的类型

**代码示例：**
```typescript
// src/types/basketball.ts
export enum BasketballPosition {
  PG = 'PG',
  SG = 'SG',
  SF = 'SF',
  PF = 'PF',
  C = 'C',
  UTILITY = 'UTILITY'
}

export interface BasketballSkills {
  // 投篮
  twoPointShot: number;
  threePointShot: number;
  freeThrow: number;

  // 组织
  passing: number;
  ballControl: number;
  courtVision: number;

  // 防守
  perimeterDefense: number;
  interiorDefense: number;
  steals: number;
  blocks: number;

  // 篮板
  offensiveRebound: number;
  defensiveRebound: number;

  // 身体素质
  speed: number;
  strength: number;
  stamina: number;
  vertical: number;

  // 篮球智商
  basketballIQ: number;
  teamwork: number;
  clutch: number;

  // 总体
  overall: number;
}
```

**验收标准：**
- ✅ TypeScript 编译无错误
- ✅ 所有类型定义完整
- ✅ 单元测试通过

---

#### Day 3-4: UI 组件更新
**目标：** 更新界面以支持篮球位置和能力评分

**任务清单：**
- [ ] 创建 `PositionSelect` 组件
- [ ] 创建 `SkillSlider` 组件
- [ ] 创建 `SkillRadarChart` 组件
- [ ] 更新 `PlayerForm` 组件
- [ ] 更新 `PlayerCard` 组件

**组件结构：**
```typescript
// src/components/PositionSelect.tsx
interface PositionSelectProps {
  value: BasketballPosition;
  onChange: (position: BasketballPosition) => void;
}

export function PositionSelect({ value, onChange }: PositionSelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as BasketballPosition)}>
      {Object.entries(POSITION_DETAILS).map(([key, detail]) => (
        <option key={key} value={key}>
          {detail.icon} {detail.name} ({detail.englishName})
        </option>
      ))}
    </select>
  );
}
```

**验收标准：**
- ✅ 所有位置正确显示
- ✅ 能力滑块工作正常
- ✅ 雷达图正确渲染

---

#### Day 5-6: 分组算法优化
**目标：** 优化分组算法以支持篮球位置平衡

**任务清单：**
- [ ] 实现 `BasketballGroupingAlgorithm` 类
- [ ] 添加 5v5 位置平衡逻辑
- [ ] 添加 3v3 位置平衡逻辑
- [ ] 实现能力平衡算法
- [ ] 添加算法单元测试

**算法实现：**
```typescript
// src/utils/basketballGroupingAlgorithm.ts
export class BasketballGroupingAlgorithm {
  static groupFor5v5(players: Player[]): Team[] {
    // 1. 按位置分组
    const playersByPosition = this.groupByPosition(players);

    // 2. 每个位置内按能力排序
    Object.values(playersByPosition).forEach(positionPlayers => {
      positionPlayers.sort((a, b) => b.skills.overall - a.skills.overall);
    });

    // 3. 计算需要的团队数量
    const teamCount = Math.floor(players.length / 5);

    // 4. 轮流分配
    const teams = this.initializeTeams(teamCount);
    const positions: BasketballPosition[] = ['PG', 'SG', 'SF', 'PF', 'C'];

    positions.forEach(position => {
      const positionPlayers = playersByPosition[position] || [];
      positionPlayers.forEach((player, index) => {
        const teamIndex = index % teamCount;
        teams[teamIndex].players.push(player);
        teams[teamIndex].totalSkill += player.skills.overall;
      });
    });

    return teams;
  }

  static groupFor3v3(players: Player[]): Team[] {
    // 类似逻辑，但使用 3v3 位置配置
    //后卫 + 前锋 + 内线
  }
}
```

**验收标准：**
- ✅ 5v5 分组位置合理
- ✅ 3v3 分组位置合理
- ✅ 能力平衡度良好
- ✅ 测试覆盖率 > 80%

---

#### Day 7: 编辑功能和优化
**目标：** 实现球员编辑功能和性能优化

**任务清单：**
- [ ] 实现编辑球员功能
- [ ] 添加数据验证
- [ ] 性能优化（useMemo, useCallback）
- [ ] 添加加载状态
- [ ] 错误处理

**实现细节：**
```typescript
// src/hooks/usePlayerManager.ts
export function usePlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const addPlayer = useCallback((player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPlayer: Player = {
      ...player,
      id: `player-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPlayers(prev => [...prev, newPlayer]);
  }, []);

  const updatePlayer = useCallback((id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(player =>
      player.id === id
        ? { ...player, ...updates, updatedAt: new Date() }
        : player
    ));
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(player => player.id !== id));
  }, []);

  return {
    players,
    editingPlayer,
    addPlayer,
    updatePlayer,
    deletePlayer,
    setEditingPlayer,
  };
}
```

**验收标准：**
- ✅ 编辑功能正常
- ✅ 数据验证完整
- ✅ 性能良好
- ✅ 无内存泄漏

---

### Sprint 2: UI/UX 增强（Week 2）

#### Day 1-2: 主题系统
**目标：** 实现篮球主题配色和样式

**任务清单：**
- [ ] 定义 CSS 变量
- [ ] 创建主题配置文件
- [ ] 更新所有组件样式
- [ ] 添加篮球相关图标
- [ ] 实现深色模式（可选）

**样式文件：**
```css
/* src/styles/variables.css */
:root {
  /* 主色调 */
  --color-primary: #FF6B35;
  --color-primary-dark: #E55A2B;
  --color-primary-light: #FF8C5A;

  /* 位置颜色 */
  --color-pg: #3B82F6;
  --color-sg: #EF4444;
  --color-sf: #F59E0B;
  --color-pf: #10B981;
  --color-c: #8B5CF6;

  /* 间距 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* 圆角 */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
}
```

---

#### Day 3-4: 可视化图表
**目标：** 实现能力雷达图和团队对比图

**任务清单：**
- [ ] 集成 Chart.js 或 ECharts
- [ ] 实现球员能力雷达图
- [ ] 实现团队实力对比图
- [ ] 实现分组结果可视化
- [ ] 添加导出图片功能

**图表实现：**
```typescript
// src/components/SkillRadarChart.tsx
import { Radar } from 'react-chartjs-2';

interface SkillRadarChartProps {
  skills: BasketballSkills;
  position: BasketballPosition;
}

export function SkillRadarChart({ skills, position }: SkillRadarChartProps) {
  const data = {
    labels: ['投篮', '传球', '控球', '防守', '篮板', '速度'],
    datasets: [{
      label: '能力值',
      data: [
        (skills.twoPointShot + skills.threePointShot + skills.freeThrow) / 3,
        skills.passing,
        skills.ballControl,
        (skills.perimeterDefense + skills.interiorDefense) / 2,
        (skills.offensiveRebound + skills.defensiveRebound) / 2,
        skills.speed
      ],
      backgroundColor: `rgba(${POSITION_DETAILS[position].color}, 0.2)`,
      borderColor: POSITION_DETAILS[position].color,
      borderWidth: 2,
    }]
  };

  return <Radar data={data} options={...} />;
}
```

---

#### Day 5-6: 动画和交互
**目标：** 添加流畅的动画效果和交互反馈

**任务清单：**
- [ ] 添加分组动画
- [ ] 添加卡片悬浮效果
- [ ] 添加加载动画
- [ ] 添加成功/错误提示
- [ ] 优化移动端体验

---

#### Day 7: 测试和文档
**目标：** 完善测试和文档

**任务清单：**
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新 README
- [ ] 编写使用指南
- [ ] 录制演示视频

---

## 🔧 技术债务清理

### 代码质量
- [ ] 添加 ESLint 规则
- [ ] 添加 Prettier 格式化
- [ ] 添加 Husky pre-commit hooks
- [ ] 添加 TypeScript 严格模式
- [ ] 添加错误边界

### 性能优化
- [ ] 使用 React.memo 优化重渲染
- [ ] 使用 useMemo/useCallback 优化计算
- [ ] 懒加载组件
- [ ] 优化图片资源
- [ ] 添加 Service Worker（PWA）

### 测试覆盖
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试覆盖核心流程
- [ ] E2E 测试覆盖用户操作
- [ ] 性能测试

---

## 📦 第三方库集成

### 必需库
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

### 可选库
```json
{
  "dependencies": {
    "react-hot-toast": "^2.4.0",
    "react-icons": "^5.0.0",
    "date-fns": "^3.0.0",
    "lodash-es": "^4.17.0"
  }
}
```

---

## 🚀 部署流程

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 代码检查
npm run lint
```

### 生产部署
```bash
# 构建
npm run build

# 预览
npm run preview

# 部署到 GitHub Pages
npm run deploy
```

---

## 📊 性能指标

### 目标性能
- 首屏加载时间 < 2s
- 交互响应时间 < 100ms
- 分组算法执行时间 < 500ms
- Lighthouse 评分 > 90

### 监控工具
- Chrome DevTools
- Lighthouse
- WebPageTest
- Bundle Analyzer

---

## 🐛 已知问题和限制

### 当前限制
1. 仅支持本地存储，数据不跨设备同步
2. 分组算法较简单，未考虑球员配合度
3. 移动端体验待优化
4. 无后端支持，无法多人协作

### 未来改进
1. 添加后端 API
2. 实现用户系统
3. 支持实时协作
4. 添加数据分析和统计

---

*最后更新：2026-03-02*
*维护者：Julius*
