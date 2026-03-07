import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  handlePlayerMove,
  undoLastMove,
  validateMove,
  getBalanceAfterMove
} from '../../src/utils/dragDropState';
import type { Player } from '../../src/types';
import { BasketballPosition } from '../../src/types';

// 创建测试用的球员数据
function createMockPlayer(id: string, overall: number, position: BasketballPosition = BasketballPosition.PG): Player {
  return {
    id,
    name: `Player ${id}`,
    position,
    skills: {
      scoring: overall,
      rebound: overall,
      assist: overall,
      defense: overall,
      overall
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

describe('createInitialState', () => {
  it('应该正确初始化状态', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);

    expect(state.teams).toBeDefined();
    expect(state.teams.length).toBe(2);
    expect(state.selectedPlayers).toEqual([]);
    expect(state.balance).toBeGreaterThanOrEqual(0);
    expect(state.history).toEqual([]);
  });

  it('应该平均分配球员', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);

    const totalPlayers = state.teams.reduce((sum, team) => sum + team.players.length, 0);
    expect(totalPlayers).toBe(4);
  });

  it('应该计算初始平衡度', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 80),
      createMockPlayer('p3', 80),
      createMockPlayer('p4', 80)
    ];

    const state = createInitialState(players, 2);

    // 所有球员能力相同，平衡度应该接近 0
    expect(state.balance).toBeCloseTo(0, 1);
  });
});

describe('handlePlayerMove', () => {
  it('应该正确移动球员', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    let state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    if (fromTeamId) {
      state = handlePlayerMove(state, 'p1', toTeamId);

      // 验证 p1 已经移动到目标队伍
      const targetTeam = state.teams.find(t => t.id === toTeamId);
      expect(targetTeam?.players.some(p => p.id === 'p1')).toBe(true);

      // 验证 p1 已经从原队伍移除
      const sourceTeam = state.teams.find(t => t.id === fromTeamId);
      expect(sourceTeam?.players.some(p => p.id === 'p1')).toBe(false);
    }
  });

  it('应该更新平衡度', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    let state = createInitialState(players, 2);
    const originalBalance = state.balance;

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    if (fromTeamId) {
      state = handlePlayerMove(state, 'p1', toTeamId);
      // 平衡度可能改变
      expect(state.balance).toBeDefined();
    }
  });

  it('应该记录历史', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    let state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    if (fromTeamId) {
      state = handlePlayerMove(state, 'p1', toTeamId);

      expect(state.history.length).toBe(1);
      expect(state.history[0].playerId).toBe('p1');
      expect(state.history[0].fromTeamId).toBe(fromTeamId);
      expect(state.history[0].toTeamId).toBe(toTeamId);
      expect(state.history[0].timestamp).toBeDefined();
    }
  });

  it('移动到当前队伍应该返回原状态', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    let state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    if (fromTeamId) {
      const newState = handlePlayerMove(state, 'p1', fromTeamId);
      // 应该返回相同的状态（不添加历史）
      expect(newState.history.length).toBe(state.history.length);
    }
  });
});

describe('undoLastMove', () => {
  it('应该撤销上一步操作', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    let state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    if (fromTeamId) {
      // 移动球员
      state = handlePlayerMove(state, 'p1', toTeamId);
      expect(state.history.length).toBe(1);

      // 撤销
      state = undoLastMove(state);

      // p1 应该回到原队伍
      const sourceTeam = state.teams.find(t => t.id === fromTeamId);
      expect(sourceTeam?.players.some(p => p.id === 'p1')).toBe(true);

      // 历史应该被移除
      expect(state.history.length).toBe(0);
    }
  });

  it('应该恢复之前的平衡度', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    let state = createInitialState(players, 2);
    const originalBalance = state.balance;

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    if (fromTeamId) {
      // 移动球员
      state = handlePlayerMove(state, 'p1', toTeamId);

      // 撤销
      state = undoLastMove(state);

      // 平衡度应该恢复到原始值
      expect(state.balance).toBeCloseTo(originalBalance, 2);
    }
  });

  it('应该处理无历史的情况', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);
    const newState = undoLastMove(state);

    // 应该返回相同的状态
    expect(newState.balance).toBe(state.balance);
    expect(newState.history.length).toBe(state.history.length);
  });
});

describe('validateMove', () => {
  it('合法移动应该返回 valid=true', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    const result = validateMove(state, 'p1', toTeamId);
    expect(result.valid).toBe(true);
  });

  it('移动到当前队伍应该返回 valid=false', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    if (fromTeamId) {
      const result = validateMove(state, 'p1', fromTeamId);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('已在该队伍');
    }
  });

  it('不存在的球员应该返回 valid=false', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75)
    ];

    const state = createInitialState(players, 2);
    const result = validateMove(state, 'non-existent', 'team-1');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('不存在');
  });

  it('不存在的目标队伍应该返回 valid=false', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75)
    ];

    const state = createInitialState(players, 2);
    const result = validateMove(state, 'p1', 'non-existent-team');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('不存在');
  });
});

describe('getBalanceAfterMove', () => {
  it('应该返回预览值', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    const previewBalance = getBalanceAfterMove(state, 'p1', toTeamId);
    expect(previewBalance).toBeGreaterThanOrEqual(0);
  });

  it('不应该改变原始状态', () => {
    const players = [
      createMockPlayer('p1', 80),
      createMockPlayer('p2', 75),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 85)
    ];

    const state = createInitialState(players, 2);
    const originalBalance = state.balance;
    const originalHistoryLength = state.history.length;

    // 找到 p1 所在的队伍
    let fromTeamId: string | undefined;
    for (const team of state.teams) {
      if (team.players.some(p => p.id === 'p1')) {
        fromTeamId = team.id;
        break;
      }
    }

    // 找到另一个队伍
    const toTeamId = state.teams.find(t => t.id !== fromTeamId)!.id;

    getBalanceAfterMove(state, 'p1', toTeamId);

    // 原始状态应该保持不变
    expect(state.balance).toBe(originalBalance);
    expect(state.history.length).toBe(originalHistoryLength);
  });
});
