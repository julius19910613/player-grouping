/**
 * 视频分析服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoAnalysisService } from '../video-analysis.service';
import type { AnalyzeVideoRequest } from '../video-analysis.service';

// Mock AI client
vi.mock('../ai/client', () => ({
  aiClient: {
    isAvailable: vi.fn(() => true),
    chat: vi.fn().mockResolvedValue(
      JSON.stringify({
        summary: '球员展现了出色的投篮能力',
        skills: {
          threePointShot: 85,
          passing: 80,
        },
        observations: ['三分投篮稳定', '传球视野开阔'],
        suggestions: ['建议加强突破能力'],
        confidence: 0.8,
      })
    ),
  },
}));

describe('VideoAnalysisService', () => {
  let service: VideoAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VideoAnalysisService();
  });

  describe('analyzeVideo', () => {
    it('should analyze video successfully', async () => {
      const request: AnalyzeVideoRequest = {
        videoId: 'test-video-id',
        playerId: 'test-player-id',
        videoUrl: 'https://test.com/video.mp4',
        duration: 120,
        videoType: 'training',
        playerPosition: 'PG',
      };

      const result = await service.analyzeVideo(request);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('observations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return fallback analysis when AI is not available', async () => {
      const { aiClient } = await import('../ai/client');
      vi.mocked(aiClient.isAvailable).mockReturnValue(false);

      const request: AnalyzeVideoRequest = {
        videoId: 'test-video-id',
        playerId: 'test-player-id',
        videoUrl: 'https://test.com/video.mp4',
        duration: 120,
        videoType: 'training',
      };

      const result = await service.analyzeVideo(request);

      expect(result.summary).toContain('暂时不可用');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should parse AI response correctly', async () => {
      const request: AnalyzeVideoRequest = {
        videoId: 'test-video-id',
        playerId: 'test-player-id',
        videoUrl: 'https://test.com/video.mp4',
        duration: 60,
        videoType: 'match',
        playerPosition: 'SG',
      };

      const result = await service.analyzeVideo(request);

      expect(result.skills).toHaveProperty('threePointShot', 85);
      expect(result.observations.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should include player position in prompt', () => {
      // Access private method through any
      const prompt = (service as any).buildAnalysisPrompt({
        playerPosition: 'PG',
        videoType: 'training',
        duration: 120,
      });

      expect(prompt).toContain('PG');
      expect(prompt).toContain('训练');
      expect(prompt).toContain('2');
    });

    it('should include player skills when available', () => {
      const prompt = (service as any).buildAnalysisPrompt({
        playerPosition: 'SF',
        videoType: 'match',
        duration: 180,
        playerSkills: {
          threePointShot: 80,
          passing: 75,
        },
      });

      expect(prompt).toContain('threePointShot');
      expect(prompt).toContain('passing');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        summary: 'Test summary',
        skills: { threePointShot: 90 },
        observations: ['Test observation'],
        suggestions: ['Test suggestion'],
        confidence: 0.85,
      });

      const result = (service as any).parseAIResponse(response, {});

      expect(result.summary).toBe('Test summary');
      expect(result.skills.threePointShot).toBe(90);
      expect(result.confidence).toBe(0.85);
    });

    it('should handle invalid JSON response', () => {
      const invalidResponse = 'This is not JSON';

      const result = (service as any).parseAIResponse(invalidResponse, {});

      // Should return fallback analysis
      expect(result).toHaveProperty('summary');
    });

    it('should clamp confidence to valid range', () => {
      const response = JSON.stringify({
        summary: 'Test',
        confidence: 1.5, // Invalid, should be clamped to 1
      });

      const result = (service as any).parseAIResponse(response, {});

      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getFallbackAnalysis', () => {
    it('should return valid fallback analysis', () => {
      const fallback = (service as any).getFallbackAnalysis({});

      expect(fallback).toHaveProperty('summary');
      expect(fallback).toHaveProperty('skills');
      expect(fallback).toHaveProperty('observations');
      expect(fallback).toHaveProperty('suggestions');
      expect(fallback.confidence).toBe(0.1);
    });
  });
});
