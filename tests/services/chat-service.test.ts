/**
 * ChatService 测试
 * 测试聊天服务的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '@/services/chat-service';

// Mock fetch
global.fetch = vi.fn();

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use 'doubao' to avoid fallback to Gemini when backend fails (DEV mode)
    service = new ChatService({ provider: 'doubao' });
  });

  describe('消息发送', () => {
    it('应该成功发送消息', async () => {
      const mockResponse = {
        success: true,
        message: 'AI 回复',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await service.sendMessage('你好');

      expect(response).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('应该处理 API 错误', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: '服务器错误' }),
      });

      await expect(service.sendMessage('测试')).rejects.toMatchObject({
        code: 'API_ERROR',
        retryable: true,
      });
    });

    it('应该处理网络错误', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(service.sendMessage('测试')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        retryable: true,
      });
    });
  });

  describe('历史记录', () => {
    it('应该维护消息历史', async () => {
      const mockResponse = {
        success: true,
        message: '回复',
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.sendMessage('消息1');
      await service.sendMessage('消息2');

      const history = service.getHistory();
      expect(history).toHaveLength(4); // 2 user + 2 assistant
      expect(history[0]).toMatchObject({ role: 'user', content: '消息1' });
      expect(history[2]).toMatchObject({ role: 'user', content: '消息2' });
    });

    it('应该能够清空历史', async () => {
      const mockResponse = {
        success: true,
        message: '回复',
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.sendMessage('消息');
      service.clearHistory();

      expect(service.getHistory()).toHaveLength(0);
    });

    it('应该能够设置历史', () => {
      const history = [
        { role: 'user' as const, content: '历史消息' },
        { role: 'assistant' as const, content: '历史回复' },
      ];

      service.setHistory(history);

      expect(service.getHistory()).toEqual(history);
    });

    it('应该限制历史长度', () => {
      const serviceWithLimit = new ChatService({ maxHistoryLength: 2 });
      const longHistory = Array(10).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `消息${i}`,
      }));

      serviceWithLimit.setHistory(longHistory);

      expect(serviceWithLimit.getHistory().length).toBeLessThanOrEqual(2);
    });
  });

  describe('失败处理', () => {
    it('失败时应该移除用户消息', async () => {
      (fetch as any).mockRejectedValue(new Error('Error'));

      try {
        await service.sendMessage('测试');
      } catch (error) {
        // 预期的错误
      }

      expect(service.getHistory()).toHaveLength(0);
    });
  });

  describe('配置', () => {
    it('应该使用自定义配置', () => {
      const customService = new ChatService({
        provider: 'doubao',
        enableHistory: false,
        maxHistoryLength: 50,
      });

      // 配置应该是私有的，这里只测试实例创建成功
      expect(customService).toBeDefined();
    });
  });
});
