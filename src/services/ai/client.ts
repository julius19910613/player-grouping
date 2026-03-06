/**
 * AI 客户端 - 豆包/火山引擎 ARK API
 * 
 * 提供与豆包大模型 API 的通信功能
 * 支持错误处理、重试和降级机制
 */

import type {
  AIServiceConfig,
  ARKChatRequest,
  ARKChatResponse,
  AIError,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Omit<AIServiceConfig, 'apiKey' | 'baseUrl'>> & {
  apiKey?: string;
  baseUrl?: string;
} = {
  timeout: 30000,
  maxRetries: 3,
  enableFallback: true,
};

/**
 * AI 客户端类
 */
export class AIClient {
  private config: Required<AIServiceConfig>;
  private lastError?: AIError;

  constructor(config: AIServiceConfig = {}) {
    // 从环境变量读取默认值
    const envApiKey = import.meta.env.VITE_ARK_API_KEY as string | undefined;
    const envBaseUrl = import.meta.env.VITE_ARK_BASE_URL as string | undefined;

    this.config = {
      apiKey: config.apiKey || envApiKey || '',
      baseUrl: config.baseUrl || envBaseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      timeout: config.timeout || DEFAULT_CONFIG.timeout,
      maxRetries: config.maxRetries || DEFAULT_CONFIG.maxRetries,
      enableFallback: config.enableFallback ?? DEFAULT_CONFIG.enableFallback,
    };
  }

  /**
   * 检查 AI 服务是否可用
   */
  isAvailable(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  /**
   * 获取最后的错误
   */
  getLastError(): AIError | undefined {
    return this.lastError;
  }

  /**
   * 发送聊天请求
   */
  async chat(
    messages: ARKChatRequest['messages'],
    options: Partial<Pick<ARKChatRequest, 'temperature' | 'max_tokens'>> = {}
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw this.createError('SERVICE_UNAVAILABLE', 'AI 服务未配置', false);
    }

    const request: ARKChatRequest = {
      model: 'ep-20250214203807-lmzv9', // 豆包模型 endpoint
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
    };

    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw this.createError(
            'API_ERROR',
            errorData.message || `API 请求失败: ${response.status}`,
            response.status >= 500 || response.status === 429
          );
        }

        const data: ARKChatResponse = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
          throw this.createError('EMPTY_RESPONSE', 'API 返回空响应', true);
        }

        return data.choices[0].message.content;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw this.createError('TIMEOUT', '请求超时', true);
          }
          throw error;
        }
        throw this.createError('UNKNOWN', '未知错误', false);
      }
    });
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const aiError = this.normalizeError(error);
      this.lastError = aiError;

      // 检查是否可重试
      if (aiError.retryable && retryCount < this.config.maxRetries) {
        // 指数退避
        const delay = Math.pow(2, retryCount) * 1000;
        await this.sleep(delay);
        return this.executeWithRetry(fn, retryCount + 1);
      }

      throw aiError;
    }
  }

  /**
   * 规范化错误
   */
  private normalizeError(error: unknown): AIError {
    if (this.isAIError(error)) {
      return error;
    }
    
    if (error instanceof Error) {
      return this.createError('RUNTIME_ERROR', error.message, false);
    }
    
    return this.createError('UNKNOWN', String(error), false);
  }

  /**
   * 检查是否为 AIError
   */
  private isAIError(error: unknown): error is AIError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'retryable' in error
    );
  }

  /**
   * 创建错误对象
   */
  private createError(code: string, message: string, retryable: boolean): AIError {
    const error: AIError = { code, message, retryable };
    this.lastError = error;
    return error;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 导出默认实例
 */
export const aiClient = new AIClient();
