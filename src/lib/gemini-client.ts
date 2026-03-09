/**
 * Gemini API Client
 * 
 * 提供与 Google Gemini API 的通信功能
 * 支持错误处理、重试、超时机制和 Function Calling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { tools } from './tools';
import { executeToolCall } from './tools/executor';

/**
 * Gemini Client 配置
 */
export interface GeminiClientConfig {
  apiKey?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Gemini API 错误
 */
export interface GeminiError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Gemini Client 类
 */
export class GeminiClient {
  private apiKey: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;
  private genAI: GoogleGenerativeAI | null = null;
  private lastError?: GeminiError;

  constructor(config: GeminiClientConfig = {}) {
    this.apiKey = config.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    this.model = config.model || 'gemini-3.1-flash-lite-preview';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!(this.apiKey && this.genAI);
  }

  /**
   * 获取最后的错误
   */
  getLastError(): GeminiError | undefined {
    return this.lastError;
  }

  /**
   * 发送消息（支持 Function Calling）
   * @param messages 消息列表
   * @returns AI 响应文本
   */
  async sendMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw this.createError('SERVICE_UNAVAILABLE', 'Gemini 服务未配置', false);
    }

    return this.executeWithRetry(async () => {
      const model = this.genAI!.getGenerativeModel({
        model: this.model,
        tools: [{ functionDeclarations: tools as any }],
      });

      // 转换消息格式
      const geminiMessages = this.convertMessages(messages);

      // 创建超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        // 初始请求
        let result = await model.generateContent({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        });

        clearTimeout(timeoutId);

        // 处理 Function Calling
        const response = result.response;

        // 检查是否有函数调用
        const functionCall = response.functionCalls()?.[0];

        if (functionCall) {
          // 执行工具调用
          console.log('Function call:', functionCall.name, functionCall.args);

          const toolResult = await executeToolCall(
            functionCall.name as any,
            functionCall.args as Record<string, any>
          );

          // 将工具结果返回给 AI
          const functionResponseMessage = {
            role: 'function',
            parts: [{
              functionResponse: {
                name: functionCall.name,
                response: toolResult,
              },
            }],
          };

          // 发送工具结果，获取最终响应
          result = await model.generateContent({
            contents: [
              ...geminiMessages,
              {
                role: 'model',
                parts: response.candidates?.[0]?.content?.parts || [{ functionCall }],
              },
              functionResponseMessage as any,
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          });

          const finalResponse = result.response;
          const finalText = finalResponse.text();

          if (!finalText) {
            throw this.createError('EMPTY_RESPONSE', 'API 返回空响应', true);
          }

          return finalText;
        }

        // 普通文本响应
        const text = response.text();

        if (!text) {
          throw this.createError('EMPTY_RESPONSE', 'API 返回空响应', true);
        }

        return text;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  /**
   * 发送消息（流式）
   * @param messages 消息列表
   * @param onChunk 每次收到数据块的回调
   */
  async sendMessageStream(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw this.createError('SERVICE_UNAVAILABLE', 'Gemini 服务未配置', false);
    }

    return this.executeWithRetry(async () => {
      const model = this.genAI!.getGenerativeModel({ model: this.model });
      const geminiMessages = this.convertMessages(messages);

      const result = await model.generateContentStream({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onChunk(chunkText);
      }

      return fullText;
    });
  }

  /**
   * 转换消息格式为 Gemini 格式
   */
  private convertMessages(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
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
      const geminiError = this.normalizeError(error);
      this.lastError = geminiError;

      // 检查是否可重试
      if (geminiError.retryable && retryCount < this.maxRetries) {
        // 指数退避
        const delay = Math.pow(2, retryCount) * 1000;
        await this.sleep(delay);
        return this.executeWithRetry(fn, retryCount + 1);
      }

      throw geminiError;
    }
  }

  /**
   * 规范化错误
   */
  private normalizeError(error: unknown): GeminiError {
    // 处理 Gemini API 错误
    if (error instanceof Error) {
      // 网络错误
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return this.createError('NETWORK_ERROR', '网络错误，请检查网络连接', true);
      }

      // 超时错误
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return this.createError('TIMEOUT', '请求超时', true);
      }

      // API 错误（429 限流等）
      if (error.message.includes('429') || error.message.includes('quota')) {
        return this.createError('RATE_LIMIT', 'API 调用频率超限，请稍后重试', true);
      }

      // 已规范化的错误
      if (this.isGeminiError(error)) {
        return error;
      }

      return this.createError('RUNTIME_ERROR', error.message, false);
    }

    return this.createError('UNKNOWN', String(error), false);
  }

  /**
   * 检查是否为 GeminiError
   */
  private isGeminiError(error: unknown): error is GeminiError {
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
  private createError(code: string, message: string, retryable: boolean): GeminiError {
    const error: GeminiError = { code, message, retryable };
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
export const geminiClient = new GeminiClient();
