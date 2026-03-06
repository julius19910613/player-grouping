/**
 * AI 分组优化服务
 * 
 * 使用 AI 优化球员分组，提供更智能的平衡策略
 * 支持降级到传统算法
 */

import type { BasketballSkills, BasketballPosition } from '../../types';
import { POSITION_DETAILS } from '../../types';
import { BasketballGroupingAlgorithm } from '../../utils/basketballGroupingAlgorithm';
import { aiClient } from './client';
import type {
  GroupingOptimizationRequest,
  GroupingOptimizationResponse,
  OptimizedTeam,
  GroupingCacheKey,
} from './types';

/**
 * 分组优化服务
 */
export class GroupingOptimizationService {
  private cache = new Map<string, { response: GroupingOptimizationResponse; timestamp: number }>();
  private cacheTTL = 1000 * 60 * 30; // 30分钟缓存

  /**
   * 优化分组
   */
  async optimize(request: GroupingOptimizationRequest): Promise<GroupingOptimizationResponse> {
    // 检查缓存
    const cacheKey = this.getCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, fromFallback: true };
    }

    // 尝试使用 AI
    if (aiClient.isAvailable()) {
      try {
        const response = await this.getAIOptimization(request);
        this.setCache(cacheKey, response);
        return response;
      } catch (error) {
        console.warn('AI 分组优化失败，降级到传统算法:', error);
      }
    }

    // 降级到传统算法
    const fallbackResponse = this.getFallbackOptimization(request);
    this.setCache(cacheKey, fallbackResponse);
    return { ...fallbackResponse, fromFallback: true };
  }

  /**
   * 使用 AI 优化分组
   */
  private async getAIOptimization(request: GroupingOptimizationRequest): Promise<GroupingOptimizationResponse> {
    const { players, teamCount, mode, optimizationGoal } = request;

    const systemPrompt = `你是一个专业的篮球分组专家。你需要根据球员的能力和位置，提供最优化的分组方案。

分组原则：
1. 团队实力应尽量平衡
2. 每个队伍应有合理的位置配置
3. 考虑球员之间的化学反应（如传球能力强的后卫配合投篮好的前锋）

优化目标：
- balance: 追求各队总能力最接近
- competitive: 追求最强的对抗性
- development: 侧重球员成长，强弱搭配

请以 JSON 格式返回分组方案，格式如下：
{
  "teams": [
    {
      "playerIds": ["球员id1", "球员id2", ...],
      "strengths": ["优势1", "优势2"],
      "weaknesses": ["劣势1"]
    },
    ...
  ],
  "explanation": "分组理由说明",
  "balanceScore": 0-100 的平衡度评分
}`;

    const playersInfo = players.map(p => {
      const pos = POSITION_DETAILS[p.position];
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        positionName: pos.name,
        overall: p.skills.overall,
        topSkills: this.getTopSkills(p.skills, 3),
      };
    });

    const userMessage = `请为以下球员提供优化分组方案：

分组模式: ${mode === '5v5' ? '5v5 (每个队伍5人)' : mode === '3v3' ? '3v3 (每个队伍3人)' : '自定义'}
队伍数量: ${teamCount}
优化目标: ${optimizationGoal}

球员列表:
${JSON.stringify(playersInfo, null, 2)}

请提供公平、合理的分组方案。`;

    try {
      const response = await aiClient.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ], {
        temperature: 0.5, // 降低温度以获得更确定的结果
      });

      // 解析 JSON 响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 响应格式无效');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 构建 OptimizedTeam 数组
      const teams: OptimizedTeam[] = parsed.teams.map((teamData: { playerIds: string[]; strengths: string[]; weaknesses: string[] }, index: number) => {
        const teamPlayers = teamData.playerIds
          .map((id: string) => players.find(p => p.id === id))
          .filter(Boolean)
          .map(p => ({
            id: p!.id,
            name: p!.name,
            position: p!.position,
          }));

        return {
          id: `team-${index + 1}`,
          name: `团队 ${index + 1}`,
          players: teamPlayers,
          totalSkill: teamPlayers.reduce((sum, tp) => {
            const fullPlayer = players.find(p => p.id === tp.id);
            return sum + (fullPlayer?.skills.overall ?? 0);
          }, 0),
          strengths: teamData.strengths || [],
          weaknesses: teamData.weaknesses || [],
        };
      });

      return {
        teams,
        explanation: parsed.explanation || 'AI 智能优化分组',
        balanceScore: Math.min(100, Math.max(0, parsed.balanceScore || 70)),
        fromFallback: false,
      };
    } catch (error) {
      console.error('AI 响应解析失败:', error);
      throw error;
    }
  }

  /**
   * 降级到传统算法
   */
  private getFallbackOptimization(request: GroupingOptimizationRequest): GroupingOptimizationResponse {
    const { players, teamCount, mode, optimizationGoal } = request;

    // 使用传统分组算法
    let teams;
    if (mode === '5v5') {
      teams = BasketballGroupingAlgorithm.groupFor5v5(players);
    } else if (mode === '3v3') {
      teams = BasketballGroupingAlgorithm.groupFor3v3(players);
    } else {
      teams = BasketballGroupingAlgorithm.groupFor5v5(players);
    }

    // 如果队伍数量不匹配，截取或合并
    if (teams.length > teamCount) {
      teams = teams.slice(0, teamCount);
    }

    // 计算平衡度
    const balanceScore = this.calculateBalanceScore(teams);

    // 添加优势/劣势分析
    const optimizedTeams: OptimizedTeam[] = teams.map((team) => ({
      id: team.id,
      name: team.name,
      players: team.players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
      })),
      totalSkill: team.totalSkill,
      strengths: this.analyzeStrengths(team.players),
      weaknesses: this.analyzeWeaknesses(team.players),
    }));

    return {
      teams: optimizedTeams,
      explanation: this.generateExplanation(optimizedTeams, optimizationGoal),
      balanceScore,
      fromFallback: true,
    };
  }

  /**
   * 获取球员最强的几个能力
   */
  private getTopSkills(skills: BasketballSkills, count: number): Array<{ skill: string; value: number }> {
    const skillEntries = Object.entries(skills)
      .filter(([key]) => key !== 'overall')
      .map(([skill, value]) => ({ skill, value: value as number }))
      .sort((a, b) => b.value - a.value);
    
    return skillEntries.slice(0, count);
  }

  /**
   * 计算平衡度评分
   */
  private calculateBalanceScore(teams: Array<{ totalSkill: number }>): number {
    if (teams.length <= 1) return 100;

    const skills = teams.map(t => t.totalSkill);
    const avg = skills.reduce((sum, s) => sum + s, 0) / skills.length;
    const maxDiff = Math.max(...skills) - Math.min(...skills);
    
    // 差距越小，分数越高
    // 假设平均每队 250 分，差距 50 分以内算很好
    const score = Math.max(0, 100 - (maxDiff / avg) * 100);
    return Math.round(score);
  }

  /**
   * 分析团队优势
   */
  private analyzeStrengths(players: Array<{ position: BasketballPosition; skills: BasketballSkills }>): string[] {
    const strengths: string[] = [];
    
    // 计算各项能力的平均值
    const avgSkills: Record<string, number> = {};
    const skillKeys = ['twoPointShot', 'threePointShot', 'passing', 'ballControl', 
                       'perimeterDefense', 'interiorDefense', 'steals', 'blocks',
                       'offensiveRebound', 'defensiveRebound', 'speed', 'strength'];
    
    skillKeys.forEach(skill => {
      const sum = players.reduce((s, p) => s + (p.skills[skill as keyof BasketballSkills] as number), 0);
      avgSkills[skill] = sum / players.length;
    });

    // 找出优势（平均值 > 60）
    if (avgSkills.threePointShot > 60) strengths.push('三分投射能力强');
    if (avgSkills.twoPointShot > 60) strengths.push('中距离投篮稳定');
    if (avgSkills.passing > 60) strengths.push('组织进攻能力强');
    if (avgSkills.perimeterDefense > 60) strengths.push('外线防守出色');
    if (avgSkills.interiorDefense > 60) strengths.push('内线防守扎实');
    if (avgSkills.defensiveRebound > 60) strengths.push('篮板保护能力强');
    if (avgSkills.speed > 60) strengths.push('速度快，转换进攻强');

    return strengths.slice(0, 3);
  }

  /**
   * 分析团队劣势
   */
  private analyzeWeaknesses(players: Array<{ position: BasketballPosition; skills: BasketballSkills }>): string[] {
    const weaknesses: string[] = [];
    
    // 计算各项能力的平均值
    const avgSkills: Record<string, number> = {};
    const skillKeys = ['twoPointShot', 'threePointShot', 'passing', 'ballControl', 
                       'perimeterDefense', 'interiorDefense', 'steals', 'blocks',
                       'offensiveRebound', 'defensiveRebound', 'speed', 'strength'];
    
    skillKeys.forEach(skill => {
      const sum = players.reduce((s, p) => s + (p.skills[skill as keyof BasketballSkills] as number), 0);
      avgSkills[skill] = sum / players.length;
    });

    // 找出劣势（平均值 < 50）
    if (avgSkills.threePointShot < 50) weaknesses.push('三分投射需要提升');
    if (avgSkills.perimeterDefense < 50) weaknesses.push('外线防守偏弱');
    if (avgSkills.interiorDefense < 50) weaknesses.push('内线防守不足');
    if (avgSkills.defensiveRebound < 50) weaknesses.push('篮板保护有待加强');
    if (avgSkills.passing < 50) weaknesses.push('组织配合需要磨合');
    if (avgSkills.speed < 50) weaknesses.push('速度偏慢');

    return weaknesses.slice(0, 2);
  }

  /**
   * 生成分组说明
   */
  private generateExplanation(_teams: OptimizedTeam[], goal: string): string {
    const goalDescriptions: Record<string, string> = {
      balance: '基于能力平衡的传统算法分组',
      competitive: '追求高强度对抗的分组方案',
      development: '侧重球员成长的强弱搭配',
    };

    return goalDescriptions[goal] || '智能分组方案';
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(request: GroupingOptimizationRequest): string {
    const key: GroupingCacheKey = {
      playerIds: request.players.map(p => p.id).sort(),
      teamCount: request.teamCount,
      mode: request.mode,
      goal: request.optimizationGoal,
    };
    return JSON.stringify(key);
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): GroupingOptimizationResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.response;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, response: GroupingOptimizationResponse): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 导出默认实例
 */
export const groupingOptimizationService = new GroupingOptimizationService();
