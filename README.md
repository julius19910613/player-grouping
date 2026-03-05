# 球员分组程序 (Player Grouping Tool) 🏀

一个智能的篮球球员分组 Web 应用，专门为篮球爱好者设计，可以根据球员能力、位置和比赛记录自动分配到平衡的团队。

## 📚 设计文档

- **[产品路线图](./design/ROADMAP.md)** - 版本规划和功能路线图
- **[功能设计](./design/FEATURES.md)** - 详细的功能设计和技术规格
- **[实现计划](./design/IMPLEMENTATION.md)** - Sprint 规划和技术实现细节

## ✨ 功能特性

### 🎯 核心功能
- **球员管理系统**
  - 添加、编辑、删除球员信息
  - 球员位置选择（后卫、前锋、中锋）
  - 详细能力评分（投篮、运球、防守、传球、篮板）
  - 比赛记录和胜率统计

- **智能分组算法**
  - 5v5 模式分组
  - 3v3 模式分组
  - 能力平衡算法
  - 位置平衡分配
  - 胜率考虑机制

- **数据可视化**
  - 能力雷达图展示
  - 团队对比图表
  - 分组效果统计
  - 动画效果展示

- **用户体验**
  - 深色/浅色主题切换
  - 响应式设计（移动端和桌面端）
  - 本地数据持久化
  - 直观的拖拽界面

### 🔧 技术特性
- TypeScript 类型安全
- React Hooks 状态管理
- 组件化架构设计
- 单元测试覆盖
- 性能优化

## 🛠️ 技术栈

- **前端框架：** React 18 + TypeScript
- **构建工具：** Vite
- **测试框架：** Vitest + Testing Library
- **样式方案：** CSS Modules
- **图表库：** Chart.js + react-chartjs-2
- **状态管理：** React Hooks
- **数据存储：** SQLite (sql.js) + IndexedDB
- **主题系统：** CSS Variables

### 💾 数据库架构

#### SQLite 表结构

**players 表（球员基本信息）**
```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**player_skills 表（球员能力）**
```sql
CREATE TABLE player_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL UNIQUE,
  -- 19 项能力值 (1-99)
  two_point_shot, three_point_shot, free_throw,
  passing, ball_control, court_vision,
  perimeter_defense, interior_defense, steals, blocks,
  offensive_rebound, defensive_rebound,
  speed, strength, stamina, vertical,
  basketball_iq, teamwork, clutch,
  overall INTEGER DEFAULT 50,
  FOREIGN KEY (player_id) REFERENCES players(id)
);
```

**grouping_history 表（分组历史）**
```sql
CREATE TABLE grouping_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mode TEXT NOT NULL,  -- 5v5, 3v3, custom
  team_count INTEGER,
  player_count INTEGER,
  balance_score REAL,
  data TEXT NOT NULL,  -- JSON 格式
  note TEXT
);
```

#### 数据持久化

- **SQLite**: 使用 sql.js (WebAssembly) 在浏览器中运行
- **IndexedDB**: 持久化 SQLite 数据库文件（支持 50-500MB）
- **自动备份**: 迁移前自动备份数据到 IndexedDB
- **降级方案**: SQLite 失败时自动回退到 LocalStorage

## 🚀 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置 Supabase（可选）

如果需要云端数据同步功能，请按以下步骤配置 Supabase：

1. **创建 Supabase 项目**
   - 访问 [Supabase](https://supabase.com/)
   - 创建新项目并记录项目 URL 和 anon key

2. **创建数据库表**
   - 在 Supabase SQL 编辑器中执行 `supabase/schema.sql`
   - 然后执行 `supabase/rls.sql` 启用行级安全策略

3. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp .env.example .env.local

   # 编辑 .env.local，填入你的 Supabase 配置
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **重启开发服务器**
   ```bash
   npm run dev
   ```

**注意：** 不配置 Supabase 也可以正常使用，应用会自动使用 SQLite 本地存储。

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 📁 项目结构

```
player-grouping/
├── src/
│   ├── components/          # React 组件
│   │   ├── PlayerForm/      # 球员表单组件
│   │   ├── PlayerList/      # 球员列表组件
│   │   ├── TeamView/        # 团队展示组件
│   │   ├── Charts/          # 图表组件
│   │   ├── Navigation/      # 导航组件
│   │   └── common/          # 通用组件
│   ├── services/            # 数据库服务
│   │   └── database.ts      # SQLite 数据库服务
│   ├── repositories/        # 数据访问层
│   │   ├── player.repository.ts    # 球员仓库
│   │   └── grouping.repository.ts  # 分组历史仓库
│   ├── hooks/               # 自定义 Hooks
│   │   ├── usePlayerManager.ts  # 球员管理 Hook
│   │   └── useTheme.ts      # 主题管理 Hook
│   ├── utils/               # 工具函数
│   │   ├── basketballGroupingAlgorithm.ts  # 篮球分组算法
│   │   ├── storage.ts       # 本地存储工具（旧）
│   │   ├── backup.ts        # 备份恢复工具
│   │   ├── migration.ts     # 数据迁移工具
│   │   └── chartUtils.ts    # 图表工具函数
│   ├── types/               # TypeScript 类型定义
│   │   ├── player.ts        # 球员相关类型
│   │   ├── basketball.ts    # 篮球相关类型
│   │   └── database.ts      # 数据库类型定义
│   ├── styles/              # 全局样式
│   │   └── theme.css        # 主题样式
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 应用入口
├── design/                  # 设计文档
│   ├── ROADMAP.md          # 产品路线图
│   ├── FEATURES.md         # 功能设计
│   ├── IMPLEMENTATION.md   # 实现计划
│   └── SQLITE_MIGRATION_FINAL_V2.md  # SQLite 迁移方案
├── public/                  # 静态资源
└── package.json
```

## 🎮 使用指南

### 添加球员

1. **基本信息**
   - 填写球员姓名
   - 选择球员身高
   - 选择球员位置（后卫、前锋、中锋）

2. **能力评分**
   - 投篮能力（0-100）
   - 运球能力（0-100）
   - 防守能力（0-100）
   - 传球能力（0-100）
   - 篮板能力（0-100）

3. **比赛记录**
   - 记录比赛场次
   - 记录胜利场次

### 分组操作

1. **选择分组模式**
   - 5v5 模式：每队5人
   - 3v3 模式：每队3人

2. **执行分组**
   - 点击"开始分组"按钮
   - 系统会自动平衡各队能力和位置
   - 查看分组结果和统计数据

3. **结果分析**
   - 查看各队能力对比
   - 查看位置分配情况
   - 查看能力雷达图

### 数据管理

- **编辑球员**：点击球员卡片上的编辑按钮
- **删除球员**：点击球员卡片上的删除按钮
- **数据备份**：所有数据自动保存在 SQLite 数据库中，并持久化到 IndexedDB
- **自动迁移**：首次启动时自动从 LocalStorage 迁移旧数据到 SQLite
- **云端同步**：配置 Supabase 后，支持多设备数据同步
  - 自动处理离线场景
  - 网络恢复后自动同步待同步数据
  - 支持冲突检测和自动解决

### 数据迁移

如果您之前使用过旧版本（LocalStorage 存储）：

1. **自动迁移**
   - 首次启动新版本时，系统会自动检测旧数据
   - 自动创建备份并迁移到 SQLite
   - 迁移成功后自动清除 LocalStorage

2. **手动回滚**
   - 如需回退，可以在浏览器控制台执行：
   ```javascript
   import { rollbackMigration } from './utils/migration';
   await rollbackMigration();
   ```

3. **查看迁移状态**
   ```javascript
   import { getMigrationStatus } from './utils/migration';
   const status = await getMigrationStatus();
   console.log(status);
   ```

### 主题设置

- 点击右上角的设置图标
- 在深色/浅色主题之间切换
- 主题设置会自动保存

## 🧮 分组算法

### 算法原理

系统采用多因素平衡算法：

1. **能力评分计算**
   - 根据位置权重计算综合能力分
   - 考虑胜率加成
   - 加权计算各维度能力

2. **平衡分配策略**
   - 蛇形选人机制
   - 能力平衡算法
   - 位置互补原则
   - 胜率修正

3. **位置权重**
   - 后卫：侧重投篮、运球、传球
   - 前锋：均衡发展，全能能力
   - 中锋：侧重防守、篮板、内线

### 分组特点

- **5v5 模式**：适合标准篮球比赛，确保每队位置配置合理
- **3v3 模式**：适合街头篮球，强调个人能力
- **自适应平衡**：根据人数自动调整分组策略
- **可重现性**：相同输入产生相同结果

## 📝 开发指南

### 代码规范

- 使用 TypeScript 编写所有组件
- 遵循 React Hooks 最佳实践
- 组件文件使用 PascalCase 命名
- 工具函数使用 camelCase 命名
- 保持一致的代码风格

### 测试指南

#### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

#### 测试文件结构

```
src/
├── utils/
│   └── __tests__/
│       └── basketballGroupingAlgorithm.test.ts
├── hooks/
│   └── __tests__/
│       └── usePlayerManager.test.ts
```

#### 编写测试

- 使用 Vitest 作为测试框架
- 使用 Testing Library 进行组件测试
- 测试覆盖率应保持在 80% 以上
- 每个 Hook 和工具函数都应有对应测试

### 添加新功能

1. **创建组件**
   - 在 `src/components/` 中创建组件目录
   - 编写组件代码和样式
   - 添加 TypeScript 类型定义

2. **添加测试**
   - 在对应的 `__tests__` 目录创建测试文件
   - 编写单元测试和集成测试
   - 确保测试覆盖率达标

3. **更新文档**
   - 更新 README.md 中的功能说明
   - 如需要，更新设计文档

### 性能优化

- 使用 React.memo 避免不必要的重渲染
- 使用 useMemo 和 useCallback 优化性能
- 懒加载大型组件
- 优化图片和资源加载

### 浏览器兼容性

- 支持现代浏览器（Chrome、Firefox、Safari、Edge）
- 使用 CSS Variables 实现主题系统
- 支持移动端触摸操作

## 🐛 问题报告

遇到问题？请按以下格式提交 Issue：

```markdown
**问题描述：**
简要描述遇到的问题

**复现步骤：**
1. 打开应用
2. 执行某操作
3. 观察到错误

**预期行为：**
描述期望的正确行为

**环境信息：**
- 操作系统：
- 浏览器版本：
- Node.js 版本：
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### Commit 规范

使用规范的 Commit 消息格式：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建或工具相关

## 📝 未来计划

- [x] SQLite 数据库迁移（已完成）
- [x] 分组历史记录功能（已完成）
- [x] 数据备份和恢复（已完成）
- [ ] Supabase 云端同步（Phase 1 已完成：数据库表结构、RLS 策略、环境配置）
  - [x] 创建 Supabase 表结构和 RLS 策略
  - [ ] 实现 Repository 改造（SupabaseRepository、HybridRepository）
  - [ ] 实现匿名认证流程
  - [ ] 实现数据迁移工具（SQLite → Supabase）
  - [ ] 实现离线支持和同步队列
- [ ] 支持导入/导出球员数据（SQLite 文件）
- [ ] 添加更多分组算法
- [ ] 支持历史记录查看和管理界面
- [ ] 添加球员头像上传
- [ ] 支持团队战术设置
- [ ] 添加多语言支持
- [ ] 移动端 APP 开发
- [ ] 实时多设备同步

## 📄 许可证

MIT License

## 👨‍💻 作者

Julius - [GitHub](https://github.com/julius19910613)

## 🙏 致谢

感谢所有为篮球运动和技术社区做出贡献的开发者们！
