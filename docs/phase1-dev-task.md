# Phase 1: 数据层 + 单元测试

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
正在实现"Tab 分离 + 拖拽分组"功能。Phase 1 需要实现数据层和单元测试。

**重要**：这是双 Subagent 协作的第一阶段，完成后会自动触发后续阶段。

## 你的任务

### 1. 优化分组算法
文件：`src/utils/groupingAlgorithm.ts`

新增函数：
```typescript
/**
 * 在队伍间移动球员
 */
export function movePlayerBetweenTeams(
  teams: Team[],
  playerId: string,
  fromTeamId: string,
  toTeamId: string
): Team[];

/**
 * 重新计算单个队伍的总能力
 */
export function recalculateTeamSkill(team: Team): number;

/**
 * 计算所有队伍的平衡度（标准差）
 * 返回值越小越平衡
 */
export function calculateBalance(teams: Team[]): number;

/**
 * 预览移动后的平衡度（不实际移动）
 */
export function previewBalanceAfterMove(
  teams: Team[],
  playerId: string,
  toTeamId: string
): number;
```

### 2. 创建拖拽状态管理
文件：`src/utils/dragDropState.ts`（新建）

```typescript
export interface DragDropState {
  teams: Team[];
  selectedPlayers: string[];
  balance: number;
  history: HistoryEntry[];
}

export interface HistoryEntry {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  timestamp: number;
}

/**
 * 创建初始状态
 */
export function createInitialState(
  players: Player[],
  teamCount: number
): DragDropState;

/**
 * 处理球员移动
 */
export function handlePlayerMove(
  state: DragDropState,
  playerId: string,
  toTeamId: string
): DragDropState;

/**
 * 撤销上一步操作
 */
export function undoLastMove(state: DragDropState): DragDropState;

/**
 * 验证移动是否合法
 */
export function validateMove(
  state: DragDropState,
  playerId: string,
  toTeamId: string
): { valid: boolean; reason?: string };

/**
 * 获取移动后的平衡度预览
 */
export function getBalanceAfterMove(
  state: DragDropState,
  playerId: string,
  toTeamId: string
): number;
```

### 3. 编写单元测试（重要！）

#### 3.1 创建测试目录结构
```bash
mkdir -p tests/unit
```

#### 3.2 测试文件 1：`tests/unit/groupingAlgorithm.test.ts`

测试用例：
- `movePlayerBetweenTeams`
  - 应该正确移动球员到目标队伍
  - 应该从原队伍移除球员
  - 应该重新计算两队的能力值
  - 应该处理不存在的 playerId
  - 应该处理相同的 fromTeamId 和 toTeamId

- `recalculateTeamSkill`
  - 应该正确计算队伍总能力
  - 应该处理空队伍

- `calculateBalance`
  - 完全平衡时应该返回 0
  - 不平衡时应该返回正值
  - 应该正确处理多个队伍

- `previewBalanceAfterMove`
  - 应该返回移动后的平衡度
  - 不应该改变原始数据

#### 3.3 测试文件 2：`tests/unit/dragDropState.test.ts`

测试用例：
- `createInitialState`
  - 应该正确初始化状态
  - 应该平均分配球员
  - 应该计算初始平衡度

- `handlePlayerMove`
  - 应该正确移动球员
  - 应该更新平衡度
  - 应该记录历史

- `undoLastMove`
  - 应该撤销上一步操作
  - 应该恢复之前的平衡度
  - 应该处理无历史的情况

- `validateMove`
  - 合法移动应该返回 valid=true
  - 移动到当前队伍应该返回 valid=false
  - 不存在的球员应该返回 valid=false

- `getBalanceAfterMove`
  - 应该返回预览值
  - 不应该改变原始状态

### 4. 运行测试
```bash
# 安装依赖（如果需要）
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# 运行单元测试
npm run test:unit -- --coverage

# 如果没有 test:unit 脚本，添加到 package.json：
# "scripts": {
#   "test:unit": "vitest run tests/unit"
# }
```

### 5. 配置 Vitest（如果需要）
创建 `vitest.config.ts`：
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

创建 `tests/setup.ts`：
```typescript
import '@testing-library/jest-dom';
```

## ⚠️ 强制要求（必须执行）

### 质量门禁
- ✅ 单元测试覆盖率必须 > 90%
- ✅ 所有单元测试必须通过
- ✅ 不能有 TypeScript 错误

### 最后一步：更新状态文件

完成所有任务后，**必须**更新状态文件：

```bash
# 使用以下命令更新状态文件
cat > /Users/ppt/Projects/player-grouping/docs/grouping-feature-state.json.patch << 'EOF'
{
  "phases": {
    "phase1": {
      "status": "completed",
      "devAgent": {
        "status": "completed",
        "completedAt": "$(date -Iseconds)"
      },
      "testCoverage": {
        "unit": <实际覆盖率，如 92>
      }
    }
  },
  "testResults": {
    "unit": {
      "passed": <通过数量>,
      "failed": <失败数量>,
      "coverage": <覆盖率>
    }
  },
  "updatedAt": "$(date -Iseconds)"
}
EOF

# 合并到状态文件（需要手动或用 jq）
```

或者直接编辑文件，更新以下字段：
- `phases.phase1.status` → `"completed"`
- `phases.phase1.devAgent.status` → `"completed"`
- `phases.phase1.devAgent.completedAt` → 当前时间
- `phases.phase1.testCoverage.unit` → 实际覆盖率
- `testResults.unit` → 测试结果
- `updatedAt` → 当前时间

**⚠️ 如果没有更新状态文件，Cron 将无法检测到完成，流程会中断！**

## 完成标准
- ✅ 所有函数实现完成
- ✅ 单元测试覆盖率 > 90%
- ✅ 所有单元测试通过
- ✅ 无 TypeScript 错误
- ✅ 状态文件已更新

## 预计时间
30 分钟

## 如果遇到问题
1. 如果依赖安装失败，尝试删除 `node_modules` 和 `package-lock.json` 后重新安装
2. 如果测试覆盖率不足，检查哪些函数没有被测试覆盖
3. 如果状态文件更新失败，手动编辑文件

---

**记住**：测试和实现同步进行，质量第一！
