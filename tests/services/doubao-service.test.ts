/**
 * 豆包 API 测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DoubaoService } from '@/services/doubao-service';

describe('DoubaoService', () => {
  let service: DoubaoService;

  beforeAll(() => {
    service = new DoubaoService();
  });

  it('should be initialized', () => {
    expect(service).toBeDefined();
  });

  // 需要真实 API Key 才能测试
  it.skip('should recognize image', async () => {
    const result = await service.recognizeImage(
      'https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png',
      '你看见了什么？'
    );
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it.skip('should recognize match stats', async () => {
    const result = await service.recognizeMatchStats(
      'https://example.com/match-stats.jpg'
    );
    expect(result).toHaveProperty('players');
    expect(Array.isArray(result.players)).toBe(true);
  });

  it.skip('should analyze player video', async () => {
    const result = await service.analyzePlayerVideo(
      'https://example.com/player-video.mp4',
      '张三',
      'PG'
    );
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('suggestedSkills');
  });
});
