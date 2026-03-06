/**
 * AI 服务模块
 * 
 * 提供智能能力评分建议和分组优化功能
 * 支持降级到传统算法
 */

// 导出类型
export type {
  AIServiceConfig,
  SkillSuggestionRequest,
  SkillSuggestionResponse,
  GroupingOptimizationRequest,
  GroupingOptimizationResponse,
  OptimizedTeam,
  AIServiceStatus,
  AIError,
} from './types';

// 导出客户端
export { AIClient, aiClient } from './client';

// 导出服务
export { SkillSuggestionService, skillSuggestionService } from './skill-suggestion.service';
export { GroupingOptimizationService, groupingOptimizationService } from './grouping-optimization.service';

/**
 * 检查 AI 服务状态
 */
export function getAIServiceStatus(): import('./types').AIServiceStatus {
  // 在运行时获取实例
  const { aiClient: client } = require('./client');
  const available = client.isAvailable();
  const lastError = client.getLastError();

  return {
    available,
    mode: available ? 'online' : 'offline',
    lastChecked: new Date(),
    error: lastError?.message,
  };
}

/**
 * AI 服务统一入口
 */
export const aiService = {
  get skillSuggestion() {
    const { skillSuggestionService: service } = require('./skill-suggestion.service');
    return service;
  },
  get groupingOptimization() {
    const { groupingOptimizationService: service } = require('./grouping-optimization.service');
    return service;
  },
  get client() {
    const { aiClient: client } = require('./client');
    return client;
  },
  /** 检查服务状态 */
  getStatus: getAIServiceStatus,
};
