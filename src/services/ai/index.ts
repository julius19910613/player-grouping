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
  const available = aiClient.isAvailable();
  const lastError = aiClient.getLastError();

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
  /** 能力评分建议服务 */
  skillSuggestion: skillSuggestionService,
  /** 分组优化服务 */
  groupingOptimization: groupingOptimizationService,
  /** 检查服务状态 */
  getStatus: getAIServiceStatus,
  /** AI 客户端 */
  client: aiClient,
};
