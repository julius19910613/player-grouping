# Phase 4: 集成测试

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
Phase 1-3 已完成：
- Phase 1: 数据层（覆盖率 96%）
- Phase 2: 组件层（覆盖率 85%）
- Phase 3: 集成层（App.tsx 已更新）

## 你的任务

### 1. 创建集成测试文件
文件：`tests/integration/grouping-flow.test.tsx`

### 2. 测试用例

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';

describe('分组流程集成测试', () => {
  
  // 1. Tab 切换测试
  it('应该能够切换到分组 Tab', async () => {
    render(<App />);
    
    // 找到分组 Tab 并点击
    const groupingTab = screen.getByRole('tab', { name: /分组/i });
    fireEvent.click(groupingTab);
    
    // 验证分组界面显示
    expect(screen.getByText(/选择球员/i)).toBeInTheDocument();
  });
  
  // 2. 完整分组流程测试
  it('应该完成完整的分组流程', async () => {
    // 1) 切换到分组 Tab
    // 2) 选择球员
    // 3) 点击随机分组
    // 4) 验证生成了队伍
    // 5) 验证平衡度显示
  });
  
  // 3. 拖拽调整测试
  it('应该支持拖拽调整分组', async () => {
    // 1) 生成初始分组
    // 2) 拖拽球员到另一个队伍
    // 3) 验证队伍更新
    // 4) 验证平衡度重新计算
  });
  
  // 4. 撤销操作测试
  it('应该支持撤销操作', async () => {
    // 1) 生成初始分组
    // 2) 移动球员
    // 3) 点击撤销
    // 4) 验证恢复到之前状态
  });
  
  // 5. 边界条件测试
  it('应该处理选择球员不足的情况', async () => {
    // 选择少于 2 个球员时，分组按钮应该禁用或提示
  });
  
  // 6. 数据持久化测试（可选）
  it('分组结果应该可保存', async () => {
    // 验证分组结果可以保存到历史
  });
});
```

### 3. 运行测试
```bash
npm run test:integration -- --coverage

# 如果没有脚本，使用：
npm run test -- tests/integration --coverage
```

### 4. 质量门禁
- ✅ 所有集成测试通过
- ✅ 测试覆盖核心流程
- ✅ 无 console 错误

### 5. 更新状态文件

完成后更新 `docs/grouping-feature-state.json`：
- `phases.phase4.status` → `"completed"`
- `phases.phase4.testAgent.status` → `"completed"`
- `phases.phase4.testAgent.completedAt` → 当前时间
- `testResults.integration` → 测试结果
- `updatedAt` → 当前时间

## 完成标准
- ✅ 集成测试文件已创建
- ✅ 核心流程测试通过
- ✅ 状态文件已更新

## 预计时间
15 分钟
