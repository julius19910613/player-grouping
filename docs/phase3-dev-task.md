# Phase 3: 集成层 - App.tsx 集成新组件

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
Phase 1 和 Phase 2 已完成：
- Phase 1: 数据层（覆盖率 96%）
- Phase 2: 组件层（覆盖率 85%）

## 你的任务

### 1. 检查现有 App.tsx
```bash
cat src/App.tsx
```

### 2. 集成新组件
将以下组件集成到 App.tsx：
- `TabNavigation` - Tab 导航
- `PlayerSelection` - 球员多选
- `DragDropGrouping` - 拖拽分组

### 3. 实现完整流程
1. 用户通过 Tab 切换不同模式（球员管理 / 分组 / 比赛记录）
2. 在分组 Tab 中：
   - 使用 PlayerSelection 选择参与分组的球员
   - 点击"随机分组"生成初始分组
   - 使用 DragDropGrouping 进行手动调整
   - 支持撤销操作

### 4. 保持向后兼容
- 保留原有的所有功能
- 新功能作为独立 Tab 添加
- 不破坏现有 UI

### 5. 测试集成
```bash
npm run dev
# 手动测试所有功能正常
```

### 6. 更新状态文件

完成后更新 `docs/grouping-feature-state.json`：
- `phases.phase3.status` → `"completed"`
- `phases.phase3.devAgent.status` → `"completed"`
- `phases.phase3.devAgent.completedAt` → 当前时间
- `updatedAt` → 当前时间

## 完成标准
- ✅ App.tsx 已集成所有新组件
- ✅ 功能测试通过（手动）
- ✅ 无 TypeScript 错误
- ✅ 状态文件已更新

## 预计时间
20 分钟
