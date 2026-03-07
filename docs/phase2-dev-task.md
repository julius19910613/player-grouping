# Phase 2: 组件层 + 组件测试

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
Phase 1 已完成（数据层 + 单元测试，覆盖率 96%），现在进入 Phase 2：组件层。

## 你的任务

### 1. 创建 Tab 导航组件
文件：`src/components/TabNavigation.tsx`

```typescript
import React from 'react';
import { Button } from './ui/button';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

export interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  persistKey?: string; // 用于 localStorage 持久化
}

export function TabNavigation({ tabs, activeTab, onTabChange, persistKey }: TabNavigationProps) {
  // 实现逻辑
}

export default TabNavigation;
```

### 2. 创建球员多选组件
文件：`src/components/PlayerSelection.tsx`

```typescript
import React from 'react';
import { Player } from '../types';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';

export interface PlayerSelectionProps {
  players: Player[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  maxSelect?: number;
}

export function PlayerSelection({ 
  players, 
  selectedIds, 
  onSelect, 
  maxSelect 
}: PlayerSelectionProps) {
  // 实现逻辑：
  // - 显示所有球员（带 Checkbox）
  // - 支持全选/取消全选
  // - 支持搜索过滤
  // - 显示已选数量
  // - 支持 maxSelect 限制
}

export default PlayerSelection;
```

### 3. 创建拖拽分组组件
文件：`src/components/DragDropGrouping.tsx`

```typescript
import React, { useState } from 'react';
import { Team, Player } from '../types';
import { DragDropState } from '../utils/dragDropState';

export interface DragDropGroupingProps {
  teams: Team[];
  balance: number;
  onPlayerMove: (playerId: string, toTeamId: string) => void;
  onUndo?: () => void;
}

export function DragDropGrouping({ 
  teams, 
  balance, 
  onPlayerMove, 
  onUndo 
}: DragDropGroupingProps) {
  // 实现逻辑：
  // - 显示所有队伍（卡片形式）
  // - 每个队伍显示球员列表
  // - 支持拖拽球员到其他队伍
  // - 实时显示平衡度
  // - 支持撤销操作
}

export default DragDropGrouping;
```

### 4. 编写组件测试（重要！）

#### 4.1 创建测试目录
```bash
mkdir -p tests/components
```

#### 4.2 测试文件 1：`tests/components/TabNavigation.test.tsx`

测试用例：
- 应该渲染所有 Tab
- 应该高亮当前激活的 Tab
- 点击 Tab 应该触发 onTabChange
- 应该支持 localStorage 持久化
- 应该处理只有一个 Tab 的情况

#### 4.3 测试文件 2：`tests/components/PlayerSelection.test.tsx`

测试用例：
- 应该渲染所有球员
- 点击 Checkbox 应该触发 onSelect
- 全选按钮应该选中所有球员
- 应该显示已选数量
- 应该支持搜索过滤
- 应该支持 maxSelect 限制

#### 4.4 测试文件 3：`tests/components/DragDropGrouping.test.tsx`

测试用例：
- 应该渲染所有队伍
- 应该显示每个队伍的球员
- 应该显示平衡度
- 拖拽应该触发 onPlayerMove
- 撤销按钮应该触发 onUndo
- 移动后应该重新计算平衡度

### 5. 运行测试
```bash
npm run test:components -- --coverage

# 如果没有 test:components 脚本，添加到 package.json：
# "scripts": {
#   "test:components": "vitest run tests/components"
# }
```

## ⚠️ 强制要求（必须执行）

### 质量门禁
- ✅ 组件测试覆盖率必须 > 80%
- ✅ 所有组件测试必须通过
- ✅ 不能有 TypeScript 错误

### 最后一步：更新状态文件

完成所有任务后，**必须**更新状态文件：

更新 `docs/grouping-feature-state.json`：
- `phases.phase2.status` → `"completed"`
- `phases.phase2.devAgent.status` → `"completed"`
- `phases.phase2.devAgent.completedAt` → 当前时间
- `phases.phase2.testCoverage.component` → 实际覆盖率
- `testResults.component` → 测试结果
- `updatedAt` → 当前时间

**⚠️ 如果没有更新状态文件，流程会中断！**

## 完成标准
- ✅ 所有组件实现完成
- ✅ 组件测试覆盖率 > 80%
- ✅ 所有组件测试通过
- ✅ 无 TypeScript 错误
- ✅ 状态文件已更新

## 预计时间
40 分钟

---

**记住**：组件要考虑移动端和桌面端响应式！
