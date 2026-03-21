import { describe, it, expect } from 'vitest';
import {
  movePlayerBetweenTeams,
  recalculateTeamSkill,
  calculateBalance,
  previewBalanceAfterMove,
  GroupingAlgorithm
} from '@/utils/groupingAlgorithm';
import type { Player, Team } from '@/types';
import { BasketballPosition } from '@/types';

// 创建测试用的球员数据
function createMockPlayer(id: string, overall: number): Player {
  return {
    id,
    name: `Player ${id}`,
    position: BasketballPosition.PG,
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

// 创建测试用的队伍数据
function createMockTeams(): Team[] {
  return [
    {
      id: 'team-1',
      name: 'Team 1',
      players: [createMockPlayer('p1', 80), createMockPlayer('p2', 75)],
      totalSkill: 155
    },
    {
      id: 'team-2',
      name: 'Team 2',
      players: [createMockPlayer('p3', 70), createMockPlayer('p4', 85)],
      totalSkill: 155
    }
  ];
}

describe('movePlayerBetweenTeams', () => {
  it('应该正确移动球员到目标队伍', () => {
    const teams = createMockTeams();
    const result = movePlayerBetweenTeams(teams, 'p1', 'team-1', 'team-2');

    // 验证 team-1 不再包含 p1
    expect(result[0].players.find(p => p.id === 'p1')).toBeUndefined();
    // 验证 team-2 包含 p1
    expect(result[1].players.find(p => p.id === 'p1')).toBeDefined();
  });

  it('应该从原队伍移除球员', () => {
    const teams = createMockTeams();
    const originalTeam1PlayerCount = teams[0].players.length;
    const result = movePlayerBetweenTeams(teams, 'p1', 'team-1', 'team-2');

    expect(result[0].players.length).toBe(originalTeam1PlayerCount - 1);
  });

  it('应该重新计算两队的能力值', () => {
    const teams = createMockTeams();
    const result = movePlayerBetweenTeams(teams, 'p1', 'team-1', 'team-2');

    // team-1 的总能力应该是 p2 的能力 (75)
    expect(result[0].totalSkill).toBe(75);
    // team-2 的总能力应该是 p3 + p4 + p1 的能力 (70 + 85 + 80 = 235)
    expect(result[1].totalSkill).toBe(235);
  });

  it('应该处理不存在的 playerId', () => {
    const teams = createMockTeams();
    const result = movePlayerBetweenTeams(teams, 'non-existent', 'team-1', 'team-2');

    // 应该返回相同的队伍结构（但可能是副本）
    expect(result.length).toBe(teams.length);
    expect(result[0].totalSkill).toBe(teams[0].totalSkill);
  });

  it('应该处理相同的 fromTeamId 和 toTeamId', () => {
    const teams = createMockTeams();
    const result = movePlayerBetweenTeams(teams, 'p1', 'team-1', 'team-1');

    // 队伍应该保持不变（但可能是副本）
    expect(result[0].totalSkill).toBe(teams[0].totalSkill);
    expect(result[0].players.length).toBe(teams[0].players.length);
  });
});

describe('recalculateTeamSkill', () => {
  it('应该正确计算队伍总能力', () => {
    const team: Team = {
      id: 'team-1',
      name: 'Team 1',
      players: [createMockPlayer('p1', 80), createMockPlayer('p2', 75)],
      totalSkill: 0
    };

    const result = recalculateTeamSkill(team);
    expect(result).toBe(155);
  });

  it('应该处理空队伍', () => {
    const team: Team = {
      id: 'team-1',
      name: 'Team 1',
      players: [],
      totalSkill: 0
    };

    const result = recalculateTeamSkill(team);
    expect(result).toBe(0);
  });
});

describe('calculateBalance', () => {
  it('完全平衡时应该返回 0', () => {
    const teams: Team[] = [
      {
        id: 'team-1',
        name: 'Team 1',
        players: [],
        totalSkill: 100
      },
      {
        id: 'team-2',
        name: 'Team 2',
        players: [],
        totalSkill: 100
      }
    ];

    const result = calculateBalance(teams);
    expect(result).toBe(0);
  });

  it('不平衡时应该返回正值', () => {
    const teams: Team[] = [
      {
        id: 'team-1',
        name: 'Team 1',
        players: [],
        totalSkill: 100
      },
      {
        id: 'team-2',
        name: 'Team 2',
        players: [],
        totalSkill: 50
      }
    ];

    const result = calculateBalance(teams);
    expect(result).toBeGreaterThan(0);
  });

  it('应该正确处理多个队伍', () => {
    const teams: Team[] = [
      {
        id: 'team-1',
        name: 'Team 1',
        players: [],
        totalSkill: 100
      },
      {
        id: 'team-2',
        name: 'Team 2',
        players: [],
        totalSkill: 110
      },
      {
        id: 'team-3',
        name: 'Team 3',
        players: [],
        totalSkill: 90
      }
    ];

    const result = calculateBalance(teams);
    // 平均值是 100，标准差应该是 sqrt(((0)^2 + (10)^2 + (-10)^2) / 3) = sqrt(200/3) ≈ 8.16
    expect(result).toBeCloseTo(8.16, 1);
  });

  it('应该处理空数组', () => {
    const result = calculateBalance([]);
    expect(result).toBe(0);
  });
});

describe('previewBalanceAfterMove', () => {
  it('应该返回移动后的平衡度', () => {
    const teams = createMockTeams();
    const result = previewBalanceAfterMove(teams, 'p1', 'team-2');

    // 移动后平衡度应该是正值
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('不应该改变原始数据', () => {
    const teams = createMockTeams();
    const originalTeam1Skill = teams[0].totalSkill;
    const originalTeam2Skill = teams[1].totalSkill;

    previewBalanceAfterMove(teams, 'p1', 'team-2');

    // 原始数据应该保持不变
    expect(teams[0].totalSkill).toBe(originalTeam1Skill);
    expect(teams[1].totalSkill).toBe(originalTeam2Skill);
  });
});

describe('GroupingAlgorithm', () => {
  it('应该能够执行平衡分组', () => {
    const players = [
      createMockPlayer('p1', 90),
      createMockPlayer('p2', 80),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 60)
    ];

    const result = GroupingAlgorithm.groupPlayers(players, {
      teamCount: 2,
      strategy: 'balanced'
    });

    expect(result.length).toBe(2);
    expect(result[0].players.length + result[1].players.length).toBe(4);
  });

  it('应该能够执行位置平衡分组', () => {
    const players = [
      { ...createMockPlayer('p1', 90), position: BasketballPosition.PG },
      { ...createMockPlayer('p2', 80), position: BasketballPosition.SG },
      { ...createMockPlayer('p3', 70), position: BasketballPosition.PG },
      { ...createMockPlayer('p4', 60), position: BasketballPosition.SG }
    ];

    const result = GroupingAlgorithm.groupPlayers(players, {
      teamCount: 2,
      strategy: 'position-balanced'
    });

    expect(result.length).toBe(2);
  });

  it('应该能够执行随机分组', () => {
    const players = [
      createMockPlayer('p1', 90),
      createMockPlayer('p2', 80),
      createMockPlayer('p3', 70),
      createMockPlayer('p4', 60)
    ];

    const result = GroupingAlgorithm.groupPlayers(players, {
      teamCount: 2,
      strategy: 'random'
    });

    expect(result.length).toBe(2);
    expect(result[0].players.length + result[1].players.length).toBe(4);
  });

  it('静态方法 calculateBalance 应该正确计算平衡度', () => {
    const teams: Team[] = [
      {
        id: 'team-1',
        name: 'Team 1',
        players: [],
        totalSkill: 100
      },
      {
        id: 'team-2',
        name: 'Team 2',
        players: [],
        totalSkill: 100
      }
    ];

    const result = GroupingAlgorithm.calculateBalance(teams);
    expect(result).toBe(0);
  });
});
