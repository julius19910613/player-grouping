/**
 * AI 服务类型定义
 * 
 * 定义 AI 服务的请求、响应和相关配置类型
 */

import type { BasketballSkills, BasketballPosition } from '../../types';

/**
 * AI 服务配置
 */
export interface AIServiceConfig {
  /** API 密钥 */
  apiKey?: string;
  /** API 基础 URL */
  baseUrl?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用降级模式 */
  enableFallback?: boolean;
}

/**
 * AI 能力评分建议请求
 */
export interface SkillSuggestionRequest {
  /** 球员姓名 */
  playerName: string;
  /** 球员位置 */
  position: BasketballPosition;
  /** 当前能力评分（可选） */
  currentSkills?: Partial<BasketballSkills>;
  /** 观察记录（可选） */
  observations?: string[];
}

/**
 * AI 能力评分建议响应
 */
export interface SkillSuggestionResponse {
  /** 建议的能力评分 */
  suggestedSkills: Partial<BasketballSkills>;
  /** 建议理由 */
  reasoning: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 是否来自缓存或降级 */
  fromFallback?: boolean;
}

/**
 * AI 分组优化请求
 */
export interface GroupingOptimizationRequest {
  /** 待分组的球员 */
  players: Array<{
    id: string;
    name: string;
    position: BasketballPosition;
    skills: BasketballSkills;
  }>;
  /** 团队数量 */
  teamCount: number;
  /** 分组模式 */
  mode: '5v5' | '3v3' | 'custom';
  /** 优化目标 */
  optimizationGoal: 'balance' | 'competitive' | 'development';
}

/**
 * 团队优化结果
 */
export interface OptimizedTeam {
  /** 团队 ID */
  id: string;
  /** 团队名称 */
  name: string;
  /** 球员列表 */
  players: Array<{
    id: string;
    name: string;
    position: BasketballPosition;
  }>;
  /** 团队总能力 */
  totalSkill: number;
  /** 优势分析 */
  strengths: string[];
  /** 劣势分析 */
  weaknesses: string[];
}

/**
 * AI 分组优化响应
 */
export interface GroupingOptimizationResponse {
  /** 优化后的团队 */
  teams: OptimizedTeam[];
  /** 优化说明 */
  explanation: string;
  /** 平衡度评分 (0-100) */
  balanceScore: number;
  /** 是否来自缓存或降级 */
  fromFallback?: boolean;
}

/**
 * AI 服务状态
 */
export interface AIServiceStatus {
  /** 是否可用 */
  available: boolean;
  /** 当前模式 */
  mode: 'online' | 'offline' | 'degraded';
  /** 最后检查时间 */
  lastChecked: Date;
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * AI API 错误响应
 */
export interface AIError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 是否可重试 */
  retryable: boolean;
}

/**
 * 豆包/ARK API 请求格式
 */
export interface ARKChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean; // 是否启用流式输出
}

/**
 * 豆包/ARK API 响应格式（非流式）
 */
export interface ARKChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 豆包/ARK API 流式响应格式（SSE 中的 delta）
 */
export interface ARKStreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 能力评分建议缓存键
 */
export interface SkillSuggestionCacheKey {
  playerName: string;
  position: BasketballPosition;
  observationsHash?: string;
}

/**
 * 分组优化缓存键
 */
export interface GroupingCacheKey {
  playerIds: string[];
  teamCount: number;
  mode: string;
  goal: string;
}
