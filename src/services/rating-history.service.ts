/**
 * 评分历史追踪服务
 * 
 * 记录球员能力评分的变化历史，支持查看评分趋势和统计分析
 */

import type { BasketballSkills } from '../types';

/**
 * 评分历史记录
 */
export interface RatingHistoryEntry {
  /** 记录 ID */
  id: string;
  /** 球员 ID */
  playerId: string;
  /** 评分快照 */
  skills: BasketballSkills;
  /** 变更原因 */
  reason: 'initial' | 'manual_edit' | 'ai_suggestion' | 'game_performance';
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 变更差异（相对于上一条记录） */
  changes?: Partial<Record<keyof BasketballSkills, number>>;
}

/**
 * 评分趋势统计
 */
export interface RatingTrend {
  /** 能力项 */
  skill: keyof BasketballSkills;
  /** 趋势方向 */
  direction: 'up' | 'down' | 'stable';
  /** 变化值 */
  change: number;
  /** 平均值 */
  average: number;
}

/**
 * 评分历史服务配置
 */
export interface RatingHistoryConfig {
  /** 最大历史记录数（每个球员） */
  maxRecordsPerPlayer?: number;
  /** 存储键名 */
  storageKey?: string;
}

/**
 * 评分历史追踪服务
 */
export class RatingHistoryService {
  private history: Map<string, RatingHistoryEntry[]> = new Map();
  private maxRecordsPerPlayer: number;
  private storageKey: string;

  constructor(config: RatingHistoryConfig = {}) {
    this.maxRecordsPerPlayer = config.maxRecordsPerPlayer ?? 50;
    this.storageKey = config.storageKey ?? 'rating_history';
    this.loadFromStorage();
  }

  /**
   * 记录评分变化
   */
  recordRating(
    playerId: string,
    skills: BasketballSkills,
    reason: RatingHistoryEntry['reason'],
    note?: string
  ): RatingHistoryEntry {
    // 获取该球员的历史记录
    const playerHistory = this.history.get(playerId) || [];
    
    // 计算变更差异
    let changes: Partial<Record<keyof BasketballSkills, number>> | undefined;
    if (playerHistory.length > 0) {
      const lastEntry = playerHistory[playerHistory.length - 1];
      changes = this.calculateChanges(lastEntry.skills, skills);
    }

    // 创建新记录
    const entry: RatingHistoryEntry = {
      id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      skills: { ...skills },
      reason,
      note,
      createdAt: new Date(),
      changes,
    };

    // 添加到历史
    playerHistory.push(entry);

    // 限制记录数量
    if (playerHistory.length > this.maxRecordsPerPlayer) {
      playerHistory.shift();
    }

    this.history.set(playerId, playerHistory);
    this.saveToStorage();

    return entry;
  }

  /**
   * 获取球员的评分历史
   */
  getPlayerHistory(playerId: string): RatingHistoryEntry[] {
    return this.history.get(playerId) || [];
  }

  /**
   * 获取最新评分
   */
  getLatestRating(playerId: string): BasketballSkills | null {
    const history = this.getPlayerHistory(playerId);
    if (history.length === 0) return null;
    return history[history.length - 1].skills;
  }

  /**
   * 获取评分趋势
   */
  getRatingTrend(playerId: string, skill?: keyof BasketballSkills): RatingTrend[] {
    const history = this.getPlayerHistory(playerId);
    if (history.length < 2) return [];

    const trends: RatingTrend[] = [];
    const skillKeys = skill 
      ? [skill] 
      : (Object.keys(history[0].skills) as (keyof BasketballSkills)[]);

    skillKeys.forEach(skillKey => {
      const values = history.map(h => h.skills[skillKey]);
      const latest = values[values.length - 1];
      const oldest = values[0];
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      const change = latest - oldest;

      trends.push({
        skill: skillKey,
        direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        change,
        average: Math.round(average * 10) / 10,
      });
    });

    return trends;
  }

  /**
   * 获取评分统计
   */
  getStatistics(playerId: string) {
    const history = this.getPlayerHistory(playerId);
    if (history.length === 0) {
      return {
        totalRecords: 0,
        averageOverall: 0,
        improvementRate: 0,
        mostChangedSkill: null,
      };
    }

    const overallScores = history.map(h => h.skills.overall);
    const averageOverall = overallScores.reduce((sum, v) => sum + v, 0) / overallScores.length;
    const improvementRate = overallScores.length > 1
      ? overallScores[overallScores.length - 1] - overallScores[0]
      : 0;

    // 找出变化最大的能力项
    let mostChangedSkill: { skill: keyof BasketballSkills; change: number } | null = null;
    if (history.length > 1) {
      const changes = history[history.length - 1].changes;
      if (changes) {
        let maxChange = 0;
        Object.entries(changes).forEach(([skill, change]) => {
          const absChange = Math.abs(change as number);
          if (absChange > maxChange) {
            maxChange = absChange;
            mostChangedSkill = {
              skill: skill as keyof BasketballSkills,
              change: change as number,
            };
          }
        });
      }
    }

    return {
      totalRecords: history.length,
      averageOverall: Math.round(averageOverall * 10) / 10,
      improvementRate,
      mostChangedSkill,
    };
  }

  /**
   * 清除球员历史
   */
  clearPlayerHistory(playerId: string): void {
    this.history.delete(playerId);
    this.saveToStorage();
  }

  /**
   * 清除所有历史
   */
  clearAllHistory(): void {
    this.history.clear();
    this.saveToStorage();
  }

  /**
   * 导出历史数据
   */
  exportHistory(): Record<string, RatingHistoryEntry[]> {
    const data: Record<string, RatingHistoryEntry[]> = {};
    this.history.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  /**
   * 导入历史数据
   */
  importHistory(data: Record<string, RatingHistoryEntry[]>): void {
    Object.entries(data).forEach(([playerId, entries]) => {
      this.history.set(playerId, entries);
    });
    this.saveToStorage();
  }

  /**
   * 计算变更差异
   */
  private calculateChanges(
    oldSkills: BasketballSkills,
    newSkills: BasketballSkills
  ): Partial<Record<keyof BasketballSkills, number>> {
    const changes: Partial<Record<keyof BasketballSkills, number>> = {};
    const skillKeys = Object.keys(oldSkills) as (keyof BasketballSkills)[];

    skillKeys.forEach(skill => {
      const diff = newSkills[skill] - oldSkills[skill];
      if (diff !== 0) {
        changes[skill] = diff;
      }
    });

    return changes;
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      const data = this.exportHistory();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('保存评分历史失败:', error);
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // 转换日期字符串为 Date 对象
        Object.entries(data).forEach(([playerId, entries]) => {
          const parsed = (entries as RatingHistoryEntry[]).map(entry => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
          }));
          this.history.set(playerId, parsed);
        });
      }
    } catch (error) {
      console.error('加载评分历史失败:', error);
    }
  }
}

/**
 * 导出默认实例
 */
export const ratingHistoryService = new RatingHistoryService();
