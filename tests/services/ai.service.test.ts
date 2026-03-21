/**
 * AI 服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIClient } from '@/services/ai/client';
import { SkillSuggestionService } from '@/services/ai/skill-suggestion.service';
import { GroupingOptimizationService } from '@/services/ai/grouping-optimization.service';
import { BasketballPosition } from '@/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AI Client', () => {
  let client: AIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // 使用测试配置
    client = new AIClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://test-api.example.com',
    });
  });

  describe('isAvailable', () => {
    it('应该返回 true 当配置了 API key', () => {
      expect(client.isAvailable()).toBe(true);
    });

    it('应该返回 false 当没有配置 API key', () => {
      // 清除环境变量影响
      const originalEnv = import.meta.env.VITE_ARK_API_KEY;
      vi.stubEnv('VITE_ARK_API_KEY', '');
      const noKeyClient = new AIClient();
      expect(noKeyClient.isAvailable()).toBe(false);
      vi.unstubAllEnvs();
    });
  });

  describe('chat', () => {
    it('应该成功发送请求并返回响应', async () => {
      const mockResponse = {
        id: 'test-id',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '这是测试响应',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.chat([
        { role: 'user', content: '你好' },
      ]);

      expect(result).toBe('这是测试响应');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('应该在 API 返回错误时抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: '服务器错误' }),
      });

      await expect(
        client.chat([{ role: 'user', content: '测试' }])
      ).rejects.toThrow();
    });

    it('应该在请求超时时抛出异常', async () => {
      // Mock AbortController
      const timeoutClient = new AIClient({
        apiKey: 'test-key',
        baseUrl: 'https://test-api.example.com',
        timeout: 50,
      });

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            // 模拟延迟响应，让 AbortController 触发
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ choices: [] }),
              });
            }, 200);
          })
      );

      await expect(
        timeoutClient.chat([{ role: 'user', content: '测试' }])
      ).rejects.toThrow();
    });
  });
});

describe('Skill Suggestion Service', () => {
  let service: SkillSuggestionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SkillSuggestionService();
    service.clearCache();
  });

  describe('getSuggestions', () => {
    it('应该在 AI 不可用时返回降级建议', async () => {
      // 使用没有 API key 的服务
      const fallbackService = new SkillSuggestionService();
      
      const result = await fallbackService.getSuggestions({
        playerName: '测试球员',
        position: BasketballPosition.PG,
      });

      expect(result.fromFallback).toBe(true);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.suggestedSkills).toBeDefined();
    });

    it('应该根据位置返回合理的建议', async () => {
      const result = await service.getSuggestions({
        playerName: '控卫球员',
        position: BasketballPosition.PG,
      });

      // 控卫应该有较高的传球和控球能力
      expect(result.suggestedSkills.passing).toBeGreaterThan(50);
      expect(result.suggestedSkills.ballControl).toBeGreaterThan(50);
    });

    it('应该根据观察记录调整建议', async () => {
      const result = await service.getSuggestions({
        playerName: '测试球员',
        position: BasketballPosition.SG,
        observations: ['投篮非常准', '三分命中率高'],
      });

      // 根据观察记录，投篮能力应该更高
      expect(result.suggestedSkills.threePointShot).toBeGreaterThan(50);
    });
  });
});

describe('Grouping Optimization Service', () => {
  let service: GroupingOptimizationService;

  const mockPlayers = [
    {
      id: '1',
      name: '球员A',
      position: BasketballPosition.PG,
      skills: {
        twoPointShot: 70,
        threePointShot: 75,
        freeThrow: 70,
        passing: 80,
        ballControl: 85,
        courtVision: 75,
        perimeterDefense: 65,
        interiorDefense: 50,
        steals: 70,
        blocks: 40,
        offensiveRebound: 45,
        defensiveRebound: 50,
        speed: 75,
        strength: 55,
        stamina: 70,
        vertical: 60,
        basketballIQ: 75,
        teamwork: 80,
        clutch: 70,
        overall: 70,
      },
    },
    {
      id: '2',
      name: '球员B',
      position: BasketballPosition.SG,
      skills: {
        twoPointShot: 75,
        threePointShot: 80,
        freeThrow: 75,
        passing: 60,
        ballControl: 70,
        courtVision: 55,
        perimeterDefense: 70,
        interiorDefense: 45,
        steals: 65,
        blocks: 35,
        offensiveRebound: 40,
        defensiveRebound: 45,
        speed: 80,
        strength: 50,
        stamina: 75,
        vertical: 70,
        basketballIQ: 65,
        teamwork: 65,
        clutch: 80,
        overall: 70,
      },
    },
    {
      id: '3',
      name: '球员C',
      position: BasketballPosition.SF,
      skills: {
        twoPointShot: 70,
        threePointShot: 65,
        freeThrow: 65,
        passing: 65,
        ballControl: 65,
        courtVision: 60,
        perimeterDefense: 70,
        interiorDefense: 65,
        steals: 60,
        blocks: 55,
        offensiveRebound: 60,
        defensiveRebound: 65,
        speed: 70,
        strength: 70,
        stamina: 75,
        vertical: 65,
        basketballIQ: 70,
        teamwork: 75,
        clutch: 70,
        overall: 70,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroupingOptimizationService();
    service.clearCache();
  });

  describe('optimize', () => {
    it('应该返回有效的分组结果', async () => {
      const result = await service.optimize({
        players: mockPlayers,
        teamCount: 1,
        mode: '3v3',
        optimizationGoal: 'balance',
      });

      expect(result.teams).toBeDefined();
      expect(result.teams.length).toBeGreaterThanOrEqual(1);
      expect(result.balanceScore).toBeGreaterThanOrEqual(0);
      expect(result.balanceScore).toBeLessThanOrEqual(100);
    });

    it('应该包含团队分析', async () => {
      const result = await service.optimize({
        players: mockPlayers,
        teamCount: 1,
        mode: '3v3',
        optimizationGoal: 'balance',
      });

      result.teams.forEach(team => {
        expect(team.totalSkill).toBeGreaterThan(0);
        expect(Array.isArray(team.strengths)).toBe(true);
        expect(Array.isArray(team.weaknesses)).toBe(true);
      });
    });

    it('应该在 AI 不可用时使用降级算法', async () => {
      const result = await service.optimize({
        players: mockPlayers,
        teamCount: 1,
        mode: '3v3',
        optimizationGoal: 'balance',
      });

      // 即使是降级，也应该返回有效结果
      expect(result.teams.length).toBeGreaterThan(0);
    });
  });
});
