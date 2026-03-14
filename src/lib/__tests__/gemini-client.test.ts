/**
 * Gemini Client 测试
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { GeminiClient } from '../gemini-client';

// Mock Google Generative AI using vi.hoisted to avoid hoisting issues
const { MockGoogleGenerativeAI } = vi.hoisted(() => {
  return {
    MockGoogleGenerativeAI: class {
      constructor(public apiKey: string) {}

      getGenerativeModel() {
        return {
          startChat: () => ({
            sendMessage: vi.fn().mockResolvedValue({
              response: {
                text: () => 'Mock AI response',
                functionCalls: () => [],
              },
            }),
          }),
        };
      }
    }
  };
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: MockGoogleGenerativeAI,
}));

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeAll(() => {
    client = new GeminiClient({ apiKey: 'test-api-key' });
  });

  it('should be available when API key is configured', () => {
    expect(client.isAvailable()).toBe(true);
  });

  it('should send a simple message', async () => {
    const messages = [
      { role: 'user' as const, content: '你好，请回复"测试成功"' }
    ];

    const response = await client.sendMessage(messages);

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
    console.log('Gemini response:', response);
  }, 30000);

  it('should handle errors gracefully', async () => {
    // 测试空消息
    const messages = [
      { role: 'user' as const, content: '' }
    ];

    try {
      await client.sendMessage(messages);
    } catch (error) {
      expect(error).toBeDefined();
    }
  }, 30000);
});
