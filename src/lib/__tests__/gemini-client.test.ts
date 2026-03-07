/**
 * Gemini Client 测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GeminiClient } from '../gemini-client';

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeAll(() => {
    client = new GeminiClient();
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
