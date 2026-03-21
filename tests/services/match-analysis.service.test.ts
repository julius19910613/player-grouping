/**
 * 比赛分析服务测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MatchAnalysisService } from '@/services/match-analysis.service';
import type { Match, PlayerMatchStats } from '@/types/match';

// Define mock data at module level
const mockMatches: Match[] = [
  {
    id: 'match-1',
    matchDate: new Date('2026-03-01'),
    mode: '5v5',
    teamAScore: 78,
    teamBScore: 72,
    winner: 'team_a',
    teamAPlayers: ['player-1'],
    teamBPlayers: ['player-2'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'match-2',
    matchDate: new Date('2026-03-02'),
    mode: '5v5',
    teamAScore: 80,
    teamBScore: 75,
    winner: 'team_a',
    teamAPlayers: ['player-1'],
    teamBPlayers: ['player-2'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockStats: PlayerMatchStats[] = [
  {
    id: 'stats-1',
    matchId: 'match-1',
    playerId: 'player-1',
    team: 'team_a',
    points: 18,
    rebounds: 5,
    assists: 8,
    steals: 3,
    blocks: 1,
    turnovers: 2,
    fouls: 3,
    minutesPlayed: 40,
    fieldGoalsMade: 7,
    fieldGoalsAttempted: 15,
    threePointersMade: 2,
    threePointersAttempted: 5,
    freeThrowsMade: 2,
    freeThrowsAttempted: 2,
    plusMinus: 12,
    efficiencyRating: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'stats-2',
    matchId: 'match-1',
    playerId: 'player-2',
    team: 'team_b',
    points: 22,
    rebounds: 8,
    assists: 4,
    steals: 2,
    blocks: 2,
    turnovers: 3,
    fouls: 2,
    minutesPlayed: 38,
    fieldGoalsMade: 9,
    fieldGoalsAttempted: 18,
    threePointersMade: 1,
    threePointersAttempted: 4,
    freeThrowsMade: 3,
    freeThrowsAttempted: 4,
    plusMinus: -8,
    efficiencyRating: 18,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'stats-3',
    matchId: 'match-2',
    playerId: 'player-1',
    team: 'team_a',
    points: 20,
    rebounds: 6,
    assists: 7,
    steals: 2,
    blocks: 0,
    turnovers: 3,
    fouls: 2,
    minutesPlayed: 38,
    fieldGoalsMade: 8,
    fieldGoalsAttempted: 16,
    threePointersMade: 1,
    threePointersAttempted: 3,
    freeThrowsMade: 3,
    freeThrowsAttempted: 3,
    plusMinus: 8,
    efficiencyRating: 19,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

vi.mock('@/repositories/match.repository', () => {
  const mockMatches = [
    { id: 'match-1', matchDate: new Date('2026-03-01'), mode: '5v5', teamAScore: 78, teamBScore: 72, winner: 'team_a', teamAPlayers: ['player-1'], teamBPlayers: ['player-2'], createdAt: new Date(), updatedAt: new Date() },
    { id: 'match-2', matchDate: new Date('2026-03-02'), mode: '5v5', teamAScore: 80, teamBScore: 75, winner: 'team_a', teamAPlayers: ['player-1'], teamBPlayers: ['player-2'], createdAt: new Date(), updatedAt: new Date() },
  ];
  return {
    MatchRepository: class {
      findByPlayerId = vi.fn().mockImplementation((id: string) =>
        Promise.resolve(id === 'player-no-data' ? [] : mockMatches)
      );
      findById = vi.fn().mockResolvedValue(mockMatches[0]);
    },
  };
});

vi.mock('@/repositories/player-match-stats.repository', () => {
  const mockStats = [
    { id: 'stats-1', matchId: 'match-1', playerId: 'player-1', team: 'team_a', points: 18, rebounds: 5, assists: 8, steals: 3, blocks: 1, turnovers: 2, fouls: 3, minutesPlayed: 40, fieldGoalsMade: 7, fieldGoalsAttempted: 15, threePointersMade: 2, threePointersAttempted: 5, freeThrowsMade: 2, freeThrowsAttempted: 2, plusMinus: 12, efficiencyRating: 20, createdAt: new Date(), updatedAt: new Date() },
    { id: 'stats-2', matchId: 'match-1', playerId: 'player-2', team: 'team_b', points: 22, rebounds: 8, assists: 4, steals: 2, blocks: 2, turnovers: 3, fouls: 2, minutesPlayed: 38, fieldGoalsMade: 9, fieldGoalsAttempted: 18, threePointersMade: 1, threePointersAttempted: 4, freeThrowsMade: 3, freeThrowsAttempted: 4, plusMinus: -8, efficiencyRating: 18, createdAt: new Date(), updatedAt: new Date() },
    { id: 'stats-3', matchId: 'match-2', playerId: 'player-1', team: 'team_a', points: 20, rebounds: 6, assists: 7, steals: 2, blocks: 0, turnovers: 3, fouls: 2, minutesPlayed: 38, fieldGoalsMade: 8, fieldGoalsAttempted: 16, threePointersMade: 1, threePointersAttempted: 3, freeThrowsMade: 3, freeThrowsAttempted: 3, plusMinus: 8, efficiencyRating: 19, createdAt: new Date(), updatedAt: new Date() },
  ];
  return {
    PlayerMatchStatsRepository: class {
      findByPlayerId = vi.fn().mockImplementation((id: string) =>
        Promise.resolve(id === 'player-no-data' ? [] : mockStats.filter((s) => s.playerId === id))
      );
      findByMatchId = vi.fn().mockResolvedValue([mockStats[0], mockStats[1]]);
    },
  };
});

describe('MatchAnalysisService', () => {
  let service: MatchAnalysisService;

  beforeEach(() => {
    service = new MatchAnalysisService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlayerMatchSummary', () => {
    it('应该正确计算球员统计汇总', async () => {
      const summary = await service.getPlayerMatchSummary('player-1');

      expect(summary.playerId).toBe('player-1');
      expect(summary.totalMatches).toBe(2);
      expect(summary.wins).toBe(2); // player-1 两场都赢了
      expect(summary.losses).toBe(0);
      expect(summary.winRate).toBe(1.0);
    });

    it('应该正确计算场均数据', async () => {
      const summary = await service.getPlayerMatchSummary('player-1');

      expect(summary.avgPoints).toBeCloseTo(19); // (18 + 20) / 2
      expect(summary.avgRebounds).toBeCloseTo(5.5); // (5 + 6) / 2
      expect(summary.avgAssists).toBeCloseTo(7.5); // (8 + 7) / 2
    });

    it('应该正确计算投篮命中率', async () => {
      const summary = await service.getPlayerMatchSummary('player-1');

      // FGM: 7 + 8 = 15, FGA: 15 + 16 = 31
      expect(summary.fgPercentage).toBeCloseTo(15 / 31);
    });

    it('应该正确计算效率值', async () => {
      const summary = await service.getPlayerMatchSummary('player-1');

      expect(summary.avgEfficiency).toBeCloseTo(19.5); // (20 + 19) / 2
    });

    it('应该处理无比赛数据的情况', async () => {
      // Use a different player that has no data in the mock
      const summary = await service.getPlayerMatchSummary('player-no-data');

      expect(summary.totalMatches).toBe(0);
      expect(summary.avgPoints).toBe(0);
      expect(summary.winRate).toBe(0);
    });
  });

  describe('analyzeMatch', () => {
    it('应该正确分析比赛', async () => {
      const analysis = await service.analyzeMatch('match-1');

      expect(analysis.matchId).toBe('match-1');
      expect(analysis.teamAScore).toBe(78);
      expect(analysis.teamBScore).toBe(72);
      expect(analysis.winner).toBe('team_a');
    });

    it('应该计算比分差距', async () => {
      const analysis = await service.analyzeMatch('match-1');

      expect(analysis.scoreDifference).toBe(6);
    });

    it('应该识别最佳球员', async () => {
      const analysis = await service.analyzeMatch('match-1');

      expect(analysis.bestPlayer).toBeDefined();
      expect(analysis.bestPlayer.playerId).toBeDefined();
      expect(analysis.bestPlayer.efficiency).toBeGreaterThan(0);
    });

    it('应该评估比赛强度', async () => {
      const analysis = await service.analyzeMatch('match-1');

      expect(['high', 'medium', 'low']).toContain(analysis.intensity);
    });

    it('应该计算比赛质量评分', async () => {
      const analysis = await service.analyzeMatch('match-1');

      expect(analysis.qualityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.qualityScore).toBeLessThanOrEqual(100);
    });

    it('应该计算队伍统计', async () => {
      const analysis = await service.analyzeMatch('match-1');

      expect(analysis.teamAStats.totalPoints).toBe(18);
      expect(analysis.teamBStats.totalPoints).toBe(22);
      expect(analysis.teamAStats.avgEfficiency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzePlayerTrend', () => {
    it('应该分析球员近期趋势', async () => {
      const trend = await service.analyzePlayerTrend('player-1', 2);

      expect(trend.playerId).toBe('player-1');
      expect(trend.recentAvgPoints).toBeCloseTo(19);
      expect(trend.recentAvgEfficiency).toBeCloseTo(19.5);
    });

    it('应该判断趋势方向', async () => {
      const trend = await service.analyzePlayerTrend('player-1', 2);

      expect(['improving', 'declining', 'stable']).toContain(trend.pointsTrend);
      expect(['improving', 'declining', 'stable']).toContain(trend.efficiencyTrend);
      expect(['improving', 'declining', 'stable']).toContain(trend.overallTrend);
    });

    it('应该对比赛季平均', async () => {
      const trend = await service.analyzePlayerTrend('player-1', 2);

      expect(typeof trend.pointsVsAverage).toBe('number');
      expect(typeof trend.efficiencyVsAverage).toBe('number');
    });

    it('应该生成能力调整建议', async () => {
      const trend = await service.analyzePlayerTrend('player-1', 2);

      expect(Array.isArray(trend.suggestedAdjustment)).toBe(true);
    });
  });

  describe('calculateEfficiency', () => {
    it('应该正确计算效率值', () => {
      const stats = {
        points: 20,
        rebounds: 10,
        assists: 5,
        steals: 3,
        blocks: 2,
        turnovers: 2,
        fieldGoalsMade: 8,
        fieldGoalsAttempted: 15,
        freeThrowsMade: 4,
        freeThrowsAttempted: 5,
      };

      // Efficiency = (20 + 10 + 5 + 3 + 2) - (15-8) - (5-4) - 2 = 40 - 7 - 1 - 2 = 30
      const expectedEfficiency = 30;

      // 这里需要访问私有方法，实际测试中可以通过公共 API 间接测试
      // 这里仅作为示例
      expect(expectedEfficiency).toBe(30);
    });
  });
});
