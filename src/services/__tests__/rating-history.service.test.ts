/**
 * 评分历史服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RatingHistoryService } from '../rating-history.service';
import { createDefaultBasketballSkills } from '../../types';

describe('RatingHistoryService', () => {
  let service: RatingHistoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RatingHistoryService({ storageKey: 'test_rating_history' });
    service.clearAllHistory();
  });

  describe('recordRating', () => {
    it('应该记录初始评分', () => {
      const skills = createDefaultBasketballSkills();
      const entry = service.recordRating('player-1', skills, 'initial', '初始评分');

      expect(entry.playerId).toBe('player-1');
      expect(entry.reason).toBe('initial');
      expect(entry.note).toBe('初始评分');
      expect(entry.changes).toBeUndefined(); // 第一条记录没有变更
    });

    it('应该计算变更差异', () => {
      const initialSkills = createDefaultBasketballSkills();
      service.recordRating('player-1', initialSkills, 'initial');

      const updatedSkills = {
        ...initialSkills,
        twoPointShot: initialSkills.twoPointShot + 10,
        passing: initialSkills.passing - 5,
      };
      const entry = service.recordRating('player-1', updatedSkills, 'manual_edit');

      expect(entry.changes).toBeDefined();
      expect(entry.changes?.twoPointShot).toBe(10);
      expect(entry.changes?.passing).toBe(-5);
    });

    it('应该限制最大记录数', () => {
      const skills = createDefaultBasketballSkills();
      const maxRecords = 5;
      const limitedService = new RatingHistoryService({
        maxRecordsPerPlayer: maxRecords,
        storageKey: 'test_limited_history',
      });

      for (let i = 0; i < 10; i++) {
        limitedService.recordRating('player-1', { ...skills, overall: skills.overall + i }, 'manual_edit');
      }

      const history = limitedService.getPlayerHistory('player-1');
      expect(history.length).toBe(maxRecords);
    });
  });

  describe('getPlayerHistory', () => {
    it('应该返回空数组（无历史）', () => {
      const history = service.getPlayerHistory('nonexistent');
      expect(history).toEqual([]);
    });

    it('应该返回完整历史记录', () => {
      const skills = createDefaultBasketballSkills();
      service.recordRating('player-1', skills, 'initial');
      service.recordRating('player-1', { ...skills, overall: 60 }, 'manual_edit');

      const history = service.getPlayerHistory('player-1');
      expect(history.length).toBe(2);
      expect(history[0].reason).toBe('initial');
      expect(history[1].reason).toBe('manual_edit');
    });
  });

  describe('getLatestRating', () => {
    it('应该返回 null（无历史）', () => {
      const latest = service.getLatestRating('nonexistent');
      expect(latest).toBeNull();
    });

    it('应该返回最新评分', () => {
      const skills = createDefaultBasketballSkills();
      service.recordRating('player-1', { ...skills, overall: 50 }, 'initial');
      service.recordRating('player-1', { ...skills, overall: 60 }, 'manual_edit');

      const latest = service.getLatestRating('player-1');
      expect(latest?.overall).toBe(60);
    });
  });

  describe('getRatingTrend', () => {
    it('应该返回空数组（历史记录不足）', () => {
      const skills = createDefaultBasketballSkills();
      service.recordRating('player-1', skills, 'initial');

      const trends = service.getRatingTrend('player-1');
      expect(trends).toEqual([]);
    });

    it('应该计算正确的趋势', () => {
      const skills = createDefaultBasketballSkills();
      
      // 记录 3 次历史
      service.recordRating('player-1', { ...skills, overall: 50 }, 'initial');
      service.recordRating('player-1', { ...skills, overall: 55 }, 'manual_edit');
      service.recordRating('player-1', { ...skills, overall: 60 }, 'manual_edit');

      const trends = service.getRatingTrend('player-1');
      
      // 找到 overall 的趋势
      const overallTrend = trends.find(t => t.skill === 'overall');
      expect(overallTrend).toBeDefined();
      expect(overallTrend?.direction).toBe('up');
      expect(overallTrend?.change).toBe(10);
      expect(overallTrend?.average).toBe(55); // (50 + 55 + 60) / 3
    });
  });

  describe('getStatistics', () => {
    it('应该返回空统计（无历史）', () => {
      const stats = service.getStatistics('nonexistent');
      expect(stats.totalRecords).toBe(0);
      expect(stats.averageOverall).toBe(0);
      expect(stats.improvementRate).toBe(0);
      expect(stats.mostChangedSkill).toBeNull();
    });

    it('应该计算正确的统计数据', () => {
      const skills = createDefaultBasketballSkills();
      
      service.recordRating('player-1', { ...skills, overall: 50, twoPointShot: 50 }, 'initial');
      service.recordRating('player-1', { ...skills, overall: 60, twoPointShot: 70 }, 'manual_edit');

      const stats = service.getStatistics('player-1');
      
      expect(stats.totalRecords).toBe(2);
      expect(stats.averageOverall).toBe(55);
      expect(stats.improvementRate).toBe(10);
      expect(stats.mostChangedSkill).toBeDefined();
      expect(stats.mostChangedSkill?.skill).toBe('twoPointShot');
      expect(stats.mostChangedSkill?.change).toBe(20);
    });
  });

  describe('clearPlayerHistory', () => {
    it('应该清除指定球员的历史', () => {
      const skills = createDefaultBasketballSkills();
      service.recordRating('player-1', skills, 'initial');
      service.recordRating('player-2', skills, 'initial');

      service.clearPlayerHistory('player-1');

      expect(service.getPlayerHistory('player-1')).toEqual([]);
      expect(service.getPlayerHistory('player-2').length).toBe(1);
    });
  });

  describe('clearAllHistory', () => {
    it('应该清除所有历史', () => {
      const skills = createDefaultBasketballSkills();
      service.recordRating('player-1', skills, 'initial');
      service.recordRating('player-2', skills, 'initial');

      service.clearAllHistory();

      expect(service.getPlayerHistory('player-1')).toEqual([]);
      expect(service.getPlayerHistory('player-2')).toEqual([]);
    });
  });

  describe('exportHistory / importHistory', () => {
    it('应该正确导出和导入历史数据', () => {
      const skills = createDefaultBasketballSkills();
      service.recordRating('player-1', { ...skills, overall: 50 }, 'initial');
      service.recordRating('player-1', { ...skills, overall: 60 }, 'manual_edit');

      const exported = service.exportHistory();
      expect(Object.keys(exported)).toContain('player-1');
      expect(exported['player-1'].length).toBe(2);

      const newService = new RatingHistoryService({ storageKey: 'test_import_history' });
      newService.importHistory(exported);

      const imported = newService.getPlayerHistory('player-1');
      expect(imported.length).toBe(2);
      expect(imported[1].skills.overall).toBe(60);
    });
  });
});
