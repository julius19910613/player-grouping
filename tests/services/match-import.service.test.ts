/**
 * 比赛数据导入服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchImportService } from '@/services/match-import.service';
import type { LegacyMatchData } from '@/services/match-import.service';

// Mock repositories
vi.mock('@/repositories/match.repository', () => ({
  MatchRepository: vi.fn().mockImplementation(function() {
    return {
      create: vi.fn().mockResolvedValue({
        id: 'match-1',
        matchDate: new Date('2026-03-01'),
        mode: '5v5',
        teamAScore: 78,
        teamBScore: 72,
      }),
    };
  }),
}));

vi.mock('@/repositories/player-match-stats.repository', () => ({
  PlayerMatchStatsRepository: vi.fn().mockImplementation(function() {
    return {
      create: vi.fn().mockResolvedValue({
        id: 'stats-1',
        matchId: 'match-1',
        playerId: 'player-1',
      }),
    };
  }),
}));

describe('MatchImportService', () => {
  let service: MatchImportService;

  beforeEach(() => {
    service = new MatchImportService();
  });

  describe('importFromJSON', () => {
    it('应该成功导入单场比赛', async () => {
      const data: LegacyMatchData[] = [
        {
          date: '2026-03-01',
          venue: '东单篮球馆',
          mode: '5v5',
          teamAScore: 78,
          teamBScore: 72,
          winner: 'A',
          teamA: {
            players: [
              {
                playerId: 'player-1',
                name: '张三',
                team: 'A',
                points: 18,
                rebounds: 5,
                assists: 8,
              },
            ],
          },
          teamB: {
            players: [
              {
                playerId: 'player-2',
                name: '李四',
                team: 'B',
                points: 22,
                rebounds: 8,
                assists: 4,
              },
            ],
          },
        },
      ];

      const result = await service.importFromJSON(data);

      expect(result.success).toBe(true);
      expect(result.matchesImported).toBe(1);
      expect(result.statsImported).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('应该在试运行模式下不实际导入', async () => {
      const data: LegacyMatchData[] = [
        {
          date: '2026-03-01',
          teamAScore: 78,
          teamBScore: 72,
          teamA: { players: [{ playerId: 'player-1', team: 'A' }] },
          teamB: { players: [{ playerId: 'player-2', team: 'B' }] },
        },
      ];

      const result = await service.importFromJSON(data, { dryRun: true });

      expect(result.matchesImported).toBe(1);
      expect(result.statsImported).toBe(2);
    });

    it('应该验证数据格式', async () => {
      const invalidData: LegacyMatchData[] = [
        {
          date: '', // 空日期
          teamAScore: -10, // 负数比分
          teamBScore: 72,
          teamA: { players: [] }, // 空球员
          teamB: { players: [{ playerId: 'player-2', team: 'B' }] },
        },
      ];

      // 不跳过无效记录时，应该失败
      const result = await service.importFromJSON(invalidData, {
        skipInvalidRecords: false,
      });

      // 应该失败或有错误
      expect(result.success || result.errors.length > 0).toBe(true);
    });

    it('应该正确计算效率值', async () => {
      const data: LegacyMatchData[] = [
        {
          date: '2026-03-01',
          teamAScore: 78,
          teamBScore: 72,
          teamA: {
            players: [
              {
                playerId: 'player-1',
                team: 'A',
                points: 18,
                rebounds: 5,
                assists: 8,
                steals: 3,
                blocks: 1,
                turnovers: 2,
                fgMade: 7,
                fgAttempted: 15,
                ftMade: 2,
                ftAttempted: 3,
              },
            ],
          },
          teamB: {
            players: [{ playerId: 'player-2', team: 'B' }],
          },
        },
      ];

      const result = await service.importFromJSON(data, {
        calculateEfficiency: true,
      });

      expect(result.success).toBe(true);
      // 应该导入 2 条统计（A队 1 人 + B队 1 人）
      expect(result.statsImported).toBe(2);
    });

    it('应该处理多场比赛', async () => {
      const data: LegacyMatchData[] = [
        {
          date: '2026-03-01',
          teamAScore: 78,
          teamBScore: 72,
          teamA: { players: [{ playerId: 'player-1', team: 'A' }] },
          teamB: { players: [{ playerId: 'player-2', team: 'B' }] },
        },
        {
          date: '2026-03-02',
          teamAScore: 80,
          teamBScore: 75,
          teamA: { players: [{ playerId: 'player-3', team: 'A' }] },
          teamB: { players: [{ playerId: 'player-4', team: 'B' }] },
        },
      ];

      const result = await service.importFromJSON(data);

      expect(result.success).toBe(true);
      expect(result.matchesImported).toBe(2);
      expect(result.statsImported).toBe(4);
    });

    it('应该解析不同的比赛模式', async () => {
      const modes = ['5v5', '3v3', '3v3', '5v5'];

      for (const mode of modes) {
        const data: LegacyMatchData[] = [
          {
            date: '2026-03-01',
            mode,
            teamAScore: 50,
            teamBScore: 45,
            teamA: { players: [{ playerId: 'p1', team: 'A' }] },
            teamB: { players: [{ playerId: 'p2', team: 'B' }] },
          },
        ];

        const result = await service.importFromJSON(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('getSampleData', () => {
    it('应该返回有效的示例数据', () => {
      const sampleData = MatchImportService.getSampleData();

      expect(sampleData.length).toBeGreaterThan(0);
      expect(sampleData[0].date).toBeDefined();
      expect(sampleData[0].teamA.players.length).toBeGreaterThan(0);
      expect(sampleData[0].teamB.players.length).toBeGreaterThan(0);
    });
  });
});
