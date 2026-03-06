/**
 * AI 能力评分建议服务
 * 
 * 基于球员信息和观察记录，使用 AI 提供能力评分建议
 * 支持降级到基于规则的建议
 */

import type { BasketballSkills, BasketballPosition } from '../../types';
import { POSITION_DETAILS } from '../../types';
import { aiClient } from './client';
import type {
  SkillSuggestionRequest,
  SkillSuggestionResponse,
  SkillSuggestionCacheKey,
} from './types';

/**
 * 能力评分建议服务
 */
export class SkillSuggestionService {
  private cache = new Map<string, { response: SkillSuggestionResponse; timestamp: number }>();
  private cacheTTL = 1000 * 60 * 60; // 1小时缓存

  /**
   * 获取能力评分建议
   */
  async getSuggestions(request: SkillSuggestionRequest): Promise<SkillSuggestionResponse> {
    // 检查缓存
    const cacheKey = this.getCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, fromFallback: true };
    }

    // 尝试使用 AI
    if (aiClient.isAvailable()) {
      try {
        const response = await this.getAISuggestions(request);
        this.setCache(cacheKey, response);
        return response;
      } catch (error) {
        console.warn('AI 建议失败，降级到规则建议:', error);
      }
    }

    // 降级到基于规则的建议
    const fallbackResponse = this.getFallbackSuggestions(request);
    this.setCache(cacheKey, fallbackResponse);
    return { ...fallbackResponse, fromFallback: true };
  }

  /**
   * 使用 AI 获取建议
   */
  private async getAISuggestions(request: SkillSuggestionRequest): Promise<SkillSuggestionResponse> {
    const { playerName, position, currentSkills, observations } = request;
    const positionDetail = POSITION_DETAILS[position];

    const systemPrompt = `你是一个专业的篮球能力评估专家。你需要根据球员信息和观察记录，为球员提供客观、合理的能力评分建议。

评分范围是 1-99，其中：
- 1-20: 初学者水平
- 21-40: 业余入门
- 41-60: 业余中等
- 61-80: 业余高手
- 81-99: 接近专业水平

请以 JSON 格式返回建议，格式如下：
{
  "suggestedSkills": {
    "twoPointShot": 数字,
    "threePointShot": 数字,
    "freeThrow": 数字,
    "passing": 数字,
    "ballControl": 数字,
    "courtVision": 数字,
    "perimeterDefense": 数字,
    "interiorDefense": 数字,
    "steals": 数字,
    "blocks": 数字,
    "offensiveRebound": 数字,
    "defensiveRebound": 数字,
    "speed": 数字,
    "strength": 数字,
    "stamina": 数字,
    "vertical": 数字,
    "basketballIQ": 数字,
    "teamwork": 数字,
    "clutch": 数字
  },
  "reasoning": "简短的评分理由",
  "confidence": 0.0-1.0 之间的置信度
}`;

    const userMessage = `请为以下球员提供能力评分建议：

球员姓名：${playerName}
位置：${positionDetail.name} (${positionDetail.englishName})
位置特点：${positionDetail.description}

${currentSkills ? `当前评分（供参考）：
${this.formatCurrentSkills(currentSkills, position)}` : '（暂无当前评分）'}

${observations && observations.length > 0 ? `观察记录：
${observations.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : ''}

请提供基于位置特点的合理评分建议。`;

    try {
      const response = await aiClient.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      // 解析 JSON 响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 响应格式无效');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 验证评分范围
      const suggestedSkills = this.validateSkills(parsed.suggestedSkills);

      return {
        suggestedSkills,
        reasoning: parsed.reasoning || 'AI 分析建议',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        fromFallback: false,
      };
    } catch (error) {
      console.error('AI 响应解析失败:', error);
      throw error;
    }
  }

  /**
   * 降级到基于规则的建议
   */
  private getFallbackSuggestions(request: SkillSuggestionRequest): SkillSuggestionResponse {
    const { position, currentSkills, observations } = request;

    // 基于位置的能力倾向
    const positionWeights = this.getPositionWeights(position);
    
    // 基础评分
    const baseSkills = this.getBaseSkillsForPosition(position);
    
    // 如果有观察记录，进行简单调整
    let adjustments: Partial<BasketballSkills> = {};
    if (observations && observations.length > 0) {
      adjustments = this.analyzeObservations(observations);
    }

    // 合并评分
    const suggestedSkills: Partial<BasketballSkills> = {};
    const skillKeys: (keyof BasketballSkills)[] = [
      'twoPointShot', 'threePointShot', 'freeThrow',
      'passing', 'ballControl', 'courtVision',
      'perimeterDefense', 'interiorDefense', 'steals', 'blocks',
      'offensiveRebound', 'defensiveRebound',
      'speed', 'strength', 'stamina', 'vertical',
      'basketballIQ', 'teamwork', 'clutch'
    ];

    skillKeys.forEach(skill => {
      const current = currentSkills?.[skill] ?? baseSkills[skill];
      const adjustment = adjustments[skill] ?? 0;
      const weight = positionWeights[skill] ?? 1;
      
      // 加权平均
      suggestedSkills[skill] = Math.round(
        current * 0.6 + (baseSkills[skill] + adjustment) * 0.4 * weight
      );
    });

    return {
      suggestedSkills,
      reasoning: '基于位置特点和基础规则的智能建议',
      confidence: 0.6,
      fromFallback: true,
    };
  }

  /**
   * 获取位置的能力权重
   */
  private getPositionWeights(position: BasketballPosition): Partial<Record<keyof BasketballSkills, number>> {
    const weights: Record<BasketballPosition, Partial<Record<keyof BasketballSkills, number>>> = {
      PG: {
        passing: 1.2, ballControl: 1.2, courtVision: 1.2,
        speed: 1.1, threePointShot: 1.1,
      },
      SG: {
        twoPointShot: 1.2, threePointShot: 1.2,
        perimeterDefense: 1.1, clutch: 1.1,
      },
      SF: {
        twoPointShot: 1.1, threePointShot: 1.0,
        perimeterDefense: 1.1, interiorDefense: 1.0,
        speed: 1.0, strength: 1.0,
      },
      PF: {
        twoPointShot: 1.0, interiorDefense: 1.2,
        offensiveRebound: 1.2, defensiveRebound: 1.2,
        strength: 1.2, blocks: 1.1,
      },
      C: {
        twoPointShot: 1.0, interiorDefense: 1.3,
        offensiveRebound: 1.3, defensiveRebound: 1.3,
        strength: 1.3, blocks: 1.3, vertical: 1.1,
      },
      UTILITY: {},
    };
    return weights[position];
  }

  /**
   * 获取位置的基础评分
   */
  private getBaseSkillsForPosition(position: BasketballPosition): BasketballSkills {
    const base = 50;
    const bonuses: Record<BasketballPosition, Partial<BasketballSkills>> = {
      PG: { passing: 10, ballControl: 10, courtVision: 10, speed: 5 },
      SG: { twoPointShot: 10, threePointShot: 10, freeThrow: 5 },
      SF: { twoPointShot: 5, perimeterDefense: 5, speed: 5 },
      PF: { interiorDefense: 10, defensiveRebound: 10, strength: 10 },
      C: { interiorDefense: 15, blocks: 10, defensiveRebound: 15, strength: 15 },
      UTILITY: {},
    };

    const result: BasketballSkills = {
      twoPointShot: base,
      threePointShot: base,
      freeThrow: base,
      passing: base,
      ballControl: base,
      courtVision: base,
      perimeterDefense: base,
      interiorDefense: base,
      steals: base,
      blocks: base,
      offensiveRebound: base,
      defensiveRebound: base,
      speed: base,
      strength: base,
      stamina: base,
      vertical: base,
      basketballIQ: base,
      teamwork: base,
      clutch: base,
      overall: base,
    };

    const bonus = bonuses[position];
    Object.entries(bonus).forEach(([key, value]) => {
      result[key as keyof BasketballSkills] = base + (value as number);
    });

    return result;
  }

  /**
   * 简单分析观察记录
   */
  private analyzeObservations(observations: string[]): Partial<BasketballSkills> {
    const adjustments: Partial<BasketballSkills> = {};
    
    // 关键词映射
    const keywordMap: Array<{
      keywords: string[];
      skill: keyof BasketballSkills;
      adjustment: number;
    }> = [
      { keywords: ['投篮准', '命中率高', '射手'], skill: 'twoPointShot', adjustment: 10 },
      { keywords: ['三分', '远投'], skill: 'threePointShot', adjustment: 10 },
      { keywords: ['传球', '助攻'], skill: 'passing', adjustment: 10 },
      { keywords: ['控球', '运球'], skill: 'ballControl', adjustment: 10 },
      { keywords: ['视野', '意识'], skill: 'courtVision', adjustment: 10 },
      { keywords: ['防守', '防'], skill: 'perimeterDefense', adjustment: 8 },
      { keywords: ['盖帽', '封盖'], skill: 'blocks', adjustment: 10 },
      { keywords: ['抢断', '断球'], skill: 'steals', adjustment: 10 },
      { keywords: ['篮板', '抢板'], skill: 'defensiveRebound', adjustment: 8 },
      { keywords: ['速度快', '跑得快'], skill: 'speed', adjustment: 10 },
      { keywords: ['力量', '强壮'], skill: 'strength', adjustment: 10 },
      { keywords: ['体力', '耐力'], skill: 'stamina', adjustment: 8 },
      { keywords: ['弹跳', '跳得高'], skill: 'vertical', adjustment: 10 },
    ];

    observations.forEach(obs => {
      keywordMap.forEach(({ keywords, skill, adjustment }) => {
        if (keywords.some(kw => obs.includes(kw))) {
          adjustments[skill] = (adjustments[skill] ?? 0) + adjustment;
        }
      });
    });

    return adjustments;
  }

  /**
   * 验证评分范围
   */
  private validateSkills(skills: Partial<BasketballSkills>): Partial<BasketballSkills> {
    const validated: Partial<BasketballSkills> = {};
    Object.entries(skills).forEach(([key, value]) => {
      if (typeof value === 'number') {
        validated[key as keyof BasketballSkills] = Math.max(1, Math.min(99, Math.round(value)));
      }
    });
    return validated;
  }

  /**
   * 格式化当前评分
   */
  private formatCurrentSkills(skills: Partial<BasketballSkills>, position: BasketballPosition): string {
    const positionDetail = POSITION_DETAILS[position];
    return Object.entries(skills)
      .filter(([_, value]) => typeof value === 'number')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(request: SkillSuggestionRequest): string {
    const key: SkillSuggestionCacheKey = {
      playerName: request.playerName,
      position: request.position,
      observationsHash: request.observations?.join(','),
    };
    return JSON.stringify(key);
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): SkillSuggestionResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.response;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, response: SkillSuggestionResponse): void {
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
export const skillSuggestionService = new SkillSuggestionService();
