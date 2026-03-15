/**
 * Chat Service
 * 
 * 统一的聊天服务，支持多个 AI 提供商和 Function Calling
 * 优先使用后端 API route（避免 CORS 和地区限制）
 * 提供消息发送、流式响应和会话管理功能
 */

import { geminiClient, type GeminiError } from '../lib/gemini-client';
import { monitoringService, startTimer } from './monitoring-service';

/**
 * 聊天服务配置
 */
export interface ChatServiceConfig {
  provider?: 'gemini' | 'doubao';
  enableHistory?: boolean;
  maxHistoryLength?: number;
  enableFunctionCalling?: boolean;
}

/**
 * 聊天服务类
 */
export class ChatService {
  private provider: 'gemini' | 'doubao';
  private enableHistory: boolean;
  private maxHistoryLength: number;
  private enableFunctionCalling: boolean;
  private messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(config: ChatServiceConfig = {}) {
    this.provider = config.provider || 'gemini';
    this.enableHistory = config.enableHistory ?? true;
    this.maxHistoryLength = config.maxHistoryLength || 20;
    this.enableFunctionCalling = config.enableFunctionCalling ?? true;
  }

  /**
   * 发送消息
   * @param message 用户消息
   * @returns AI 响应（包含可能的搜索结果）
   */
  async sendMessage(message: string): Promise<any> {
    // 添加用户消息到历史
    if (this.enableHistory) {
      this.messageHistory.push({ role: 'user', content: message });
    }

    try {
      let response: any;

      // 优先尝试后端 API route（避免 CORS 和地区限制）
      try {
        response = await this.sendToBackend(message);
      } catch (backendError) {
        console.warn('Backend API failed, trying direct Gemini call:', backendError);

        // 如果后端失败，尝试直接调用（仅限开发环境）
        if (this.provider === 'gemini' && import.meta.env.DEV) {
          response = await this.sendToGemini(message);
        } else {
          throw backendError;
        }
      }

      // 添加 AI 响应到历史（只记录文本内容）
      const responseText = typeof response === 'string' ? response : response.message;
      if (this.enableHistory) {
        this.messageHistory.push({ role: 'assistant', content: responseText });
      }

      return response;
    } catch (error) {
      // 移除失败的用户消息
      if (this.enableHistory && this.messageHistory.length > 0) {
        this.messageHistory.pop();
      }

      throw error;
    }
  }

  /**
   * 发送消息（流式）
   * @param message 用户消息
   * @param onChunk 每次收到数据块的回调
   * @param history 可选的消息历史（如果提供，则使用此历史而非内部历史）
   * @returns 完整的 AI 响应
   */
  async sendMessageStream(
    message: string,
    onChunk: (text: string) => void,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    // 如果提供了外部历史，使用外部历史；否则使用内部历史管理
    const useExternalHistory = history !== undefined;

    if (!useExternalHistory && this.enableHistory) {
      this.messageHistory.push({ role: 'user', content: message });
    }

    try {
      let response: string;

      // 准备要发送的消息历史
      const messagesToSend = useExternalHistory
        ? history
        : this.messageHistory;

      // 优先尝试后端 API route
      try {
        response = await this.sendToBackendStream(messagesToSend!, onChunk);
      } catch (backendError) {
        console.warn('Backend API stream failed, trying direct Gemini call:', backendError);

        if (this.provider === 'gemini' && import.meta.env.DEV) {
          response = await this.sendToGeminiStream(messagesToSend!, onChunk);
        } else {
          throw backendError;
        }
      }

      // 添加 AI 响应到历史（仅当使用内部历史时）
      if (!useExternalHistory && this.enableHistory) {
        this.messageHistory.push({ role: 'assistant', content: response });
      }

      return response;
    } catch (error) {
      // 移除失败的用户消息（仅当使用内部历史时）
      if (!useExternalHistory && this.enableHistory && this.messageHistory.length > 0) {
        this.messageHistory.pop();
      }

      throw error;
    }
  }

  /**
   * 发送到后端 API route（流式）
   */
  private async sendToBackendStream(messages: Array<{ role: 'user' | 'assistant'; content: string }>, onChunk: (text: string) => void): Promise<string> {
    const apiUrl = import.meta.env.PROD
      ? 'https://player-grouping.vercel.app/api/chat'
      : 'http://localhost:3000/api/chat';

    const timer = startTimer('chat_api_call_stream', {
      endpoint: '/api/chat',
      provider: this.provider,
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          messages,
          enableFunctionCalling: this.enableFunctionCalling,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createChatError(
          'API_ERROR',
          error.message || `API 请求失败: ${response.status}`,
          response.status >= 500 || response.status === 429
        );
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullText = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep the last incomplete line
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              if (dataStr.trim() === '') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.text) {
                  onChunk(data.text);
                  fullText += data.text;
                } else if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', dataStr, e);
              }
            }
          }
        }
      }

      const duration = timer.stop();
      monitoringService.trackApiCall({
        timestamp: new Date().toISOString(),
        endpoint: '/api/chat',
        method: 'POST',
        duration,
        status: 200,
        metadata: { messageLength: fullText.length, streamed: true },
      });

      return fullText;
    } catch (error) {
      if (this.isChatError(error)) throw error;
      throw this.createChatError('NETWORK_ERROR', '网络错误，请检查网络连接', true);
    }
  }

  /**
   * 发送到后端 API route（支持 Function Calling）
   */
  private async sendToBackend(_message: string): Promise<any> {
    const apiUrl = import.meta.env.PROD
      ? 'https://player-grouping.vercel.app/api/chat'
      : 'http://localhost:3000/api/chat';

    // 开始性能追踪
    const timer = startTimer('chat_api_call', {
      endpoint: '/api/chat',
      provider: this.provider,
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: this.messageHistory,
          enableFunctionCalling: this.enableFunctionCalling,
        }),
      });

      const duration = timer.stop();

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        // 记录失败请求
        monitoringService.trackApiCall({
          timestamp: new Date().toISOString(),
          endpoint: '/api/chat',
          method: 'POST',
          duration,
          status: response.status,
          error: error.message || 'Unknown error',
        });

        throw this.createChatError(
          'API_ERROR',
          error.message || `API 请求失败: ${response.status}`,
          response.status >= 500 || response.status === 429
        );
      }

      const data = await response.json();

      if (!data.success || !data.message) {
        throw this.createChatError('INVALID_RESPONSE', 'API 返回格式错误', false);
      }

      // 记录成功请求
      monitoringService.trackApiCall({
        timestamp: new Date().toISOString(),
        endpoint: '/api/chat',
        method: 'POST',
        duration,
        status: 200,
        metadata: {
          messageLength: data.message.length,
          hasSearchResults: !!data.searchResults,
        },
      });

      // Return full response data (including searchResults if available)
      return data;
    } catch (error) {
      // 记录错误
      if (!this.isChatError(error)) {
        monitoringService.trackError(error as Error, {
          endpoint: '/api/chat',
          method: 'POST',
          provider: this.provider,
        });
      }

      if (this.isChatError(error)) {
        throw error;
      }

      throw this.createChatError(
        'NETWORK_ERROR',
        '网络错误，请检查网络连接',
        true
      );
    }
  }

  /**
   * 发送到 Gemini
   */
  private async sendToGemini(_message: string): Promise<string> {
    if (!geminiClient.isAvailable()) {
      throw this.createChatError('SERVICE_UNAVAILABLE', 'Gemini 服务未配置', false);
    }

    try {
      const response = await geminiClient.sendMessage(this.messageHistory);
      return response;
    } catch (error) {
      throw this.normalizeGeminiError(error as GeminiError);
    }
  }

  /**
   * 发送到 Gemini（流式）
   */
  private async sendToGeminiStream(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!geminiClient.isAvailable()) {
      throw this.createChatError('SERVICE_UNAVAILABLE', 'Gemini 服务未配置', false);
    }

    try {
      const response = await geminiClient.sendMessageStream(messages, onChunk);
      return response;
    } catch (error) {
      throw this.normalizeGeminiError(error as GeminiError);
    }
  }

  /**
   * 清空会话历史
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * 获取会话历史
   */
  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.messageHistory];
  }

  /**
   * 设置会话历史
   */
  setHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): void {
    this.messageHistory = history.slice(-this.maxHistoryLength);
  }

  /**
   * 检查是否为 ChatError
   */
  private isChatError(error: unknown): error is ChatError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'retryable' in error
    );
  }

  /**
   * 规范化 Gemini 错误
   */
  private normalizeGeminiError(error: GeminiError): ChatError {
    // 保留 error 参数用于日志记录或未来扩展
    console.debug('Gemini error:', error);
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      provider: 'gemini',
    };
  }

  /**
   * 创建聊天错误
   */
  private createChatError(code: string, message: string, retryable: boolean): ChatError {
    return {
      code,
      message,
      retryable,
      provider: this.provider,
    };
  }
}

/**
 * 聊天错误
 */
export interface ChatError {
  code: string;
  message: string;
  retryable: boolean;
  provider: 'gemini' | 'doubao';
}

/**
 * 导出默认实例
 */
export const chatService = new ChatService();
