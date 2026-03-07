/**
 * Function Executor 测试
 * 测试 Function Calling 的核心逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionExecutor } from '../../lib/function-executor';

// Mock playerRepository
const mockPlayerRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIds: vi.fn(),
};

// Mock grouping algorithm
const mockGroupingAlgorithm = {
  groupPlayers: vi.fn(),
  calculateBalance: vi.fn(),
};

describe('FunctionExecutor', () => {
  let executor: FunctionExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new FunctionExecutor(
      mockPlayerRepository as any,
      mockGroupingAlgorithm as any
    );
  });

  describe('query_players', () => {
    it('应该查询所有球员', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
      ];

      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);

      const result = await executor.execute('query_players', {});

      expect(result.count).toBe(2);
      expect(result.players).toHaveLength(2);
      expect(result.players[0]).toMatchObject({
        id: '1',
        name: '张三',
        position: 'guard',
        overall: 85,
      });
    });

    it('应该按姓名筛选', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
      ];

      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);

      const result = await executor.execute('query_players', { name: '张' });

      expect(result.count).toBe(1);
      expect(result.players[0].name).toBe('张三');
    });

    it('应该按位置筛选', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
      ];

      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);

      const result = await executor.execute('query_players', { position: 'guard' });

      expect(result.count).toBe(1);
      expect(result.players[0].position).toBe('guard');
    });

    it('应该按最低能力筛选', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
      ];

      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);

      const result = await executor.execute('query_players', { minOverall: 88 });

      expect(result.count).toBe(1);
      expect(result.players[0].skills.overall).toBeGreaterThanOrEqual(88);
    });

    it('应该限制返回数量', async () => {
      const mockPlayers = Array(20).fill(null).map((_, i) => ({
        id: `${i}`,
        name: `球员${i}`,
        position: 'guard',
        skills: { overall: 80 },
      }));

      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);

      const result = await executor.execute('query_players', { limit: 5 });

      expect(result.players.length).toBeLessThanOrEqual(5);
    });
  });

  describe('create_grouping', () => {
    it('应该创建分组', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
        { id: '3', name: '王五', position: 'center', skills: { overall: 88 } },
        { id: '4', name: '赵六', position: 'guard', skills: { overall: 82 } },
      ];

      const mockTeams = [
        {
          id: 'team1',
          name: 'Team 1',
          players: [mockPlayers[0], mockPlayers[1]],
          totalSkill: 175,
        },
        {
          id: 'team2',
          name: 'Team 2',
          players: [mockPlayers[2], mockPlayers[3]],
          totalSkill: 170,
        },
      ];

      mockPlayerRepository.findByIds.mockResolvedValue(mockPlayers);
      mockGroupingAlgorithm.groupPlayers.mockReturnValue(mockTeams);
      mockGroupingAlgorithm.calculateBalance.mockReturnValue(5);

      const result = await executor.execute('create_grouping', {
        playerIds: ['1', '2', '3', '4'],
        teamCount: 2,
        strategy: 'balanced',
      });

      expect(result.teams).toHaveLength(2);
      expect(result.balance).toBe(5);
      expect(result.teams[0]).toMatchObject({
        name: 'Team 1',
        totalSkill: 175,
      });
    });

    it('应该验证球员数量', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
      ];

      mockPlayerRepository.findByIds.mockResolvedValue(mockPlayers);

      await expect(
        executor.execute('create_grouping', {
          playerIds: ['1'],
          teamCount: 2,
        })
      ).rejects.toThrow('需要至少 2 名球员');
    });
  });

  describe('get_player_stats', () => {
    it('应该获取球员统计', async () => {
      const mockPlayer = {
        id: '1',
        name: '张三',
        position: 'guard',
        skills: { overall: 85, twoPointShot: 90 },
        gamesPlayed: 10,
        winRate: 0.7,
      };

      mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

      const result = await executor.execute('get_player_stats', {
        playerId: '1',
      });

      expect(result).toMatchObject({
        name: '张三',
        position: 'guard',
        skills: { overall: 85, twoPointShot: 90 },
        gamesPlayed: 10,
        winRate: 0.7,
      });
    });

    it('应该处理球员不存在', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        executor.execute('get_player_stats', { playerId: '999' })
      ).rejects.toThrow('球员不存在');
    });
  });

  describe('suggest_lineup', () => {
    it('应该建议最佳阵容', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
        { id: '3', name: '王五', position: 'center', skills: { overall: 88 } },
      ];

      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);

      const result = await executor.execute('suggest_lineup', {
        tactic: 'offensive',
      });

      expect(result.tactic).toBe('offensive');
      expect(result.lineup).toBeDefined();
      expect(Array.isArray(result.lineup)).toBe(true);
    });

    it('应该从指定球员池中选择', async () => {
      const mockPlayers = [
        { id: '1', name: '张三', position: 'guard', skills: { overall: 85 } },
        { id: '2', name: '李四', position: 'forward', skills: { overall: 90 } },
      ];

      mockPlayerRepository.findByIds.mockResolvedValue(mockPlayers);

      const result = await executor.execute('suggest_lineup', {
        tactic: 'balanced',
        playerPool: ['1', '2'],
      });

      expect(result.tactic).toBe('balanced');
      expect(result.lineup.length).toBeLessThanOrEqual(2);
    });
  });

  describe('错误处理', () => {
    it('应该处理未知函数', async () => {
      await expect(
        executor.execute('unknown_function', {})
      ).rejects.toThrow('Unknown function');
    });
  });
});
