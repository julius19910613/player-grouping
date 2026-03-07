/**
 * 用户反馈服务
 * 收集和存储用户反馈数据
 */

export interface Feedback {
  id: string;
  type: 'like' | 'dislike' | 'suggestion' | 'bug';
  timestamp: string;
  messageId?: string;
  rating?: number; // 1-5
  comment?: string;
  context?: {
    page?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

class FeedbackService {
  private static instance: FeedbackService;
  private readonly STORAGE_KEY = 'user_feedback';

  private constructor() {}

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  /**
   * 提交反馈
   */
  submitFeedback(feedback: Omit<Feedback, 'id' | 'timestamp'>): Feedback {
    const newFeedback: Feedback = {
      ...feedback,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      context: {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
      },
    };

    // 存储到本地
    this.saveFeedback(newFeedback);

    // 在生产环境，可以发送到后端
    if (process.env.NODE_ENV === 'production') {
      this.sendToBackend(newFeedback);
    }

    return newFeedback;
  }

  /**
   * 获取所有反馈
   */
  getAllFeedback(): Feedback[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load feedback:', e);
      return [];
    }
  }

  /**
   * 获取反馈统计
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgRating: number;
    recentCount: number; // 最近7天
  } {
    const feedback = this.getAllFeedback();
    
    if (feedback.length === 0) {
      return {
        total: 0,
        byType: {},
        avgRating: 0,
        recentCount: 0,
      };
    }

    const byType: Record<string, number> = {};
    let totalRating = 0;
    let ratingCount = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let recentCount = 0;

    feedback.forEach(f => {
      byType[f.type] = (byType[f.type] || 0) + 1;
      
      if (f.rating) {
        totalRating += f.rating;
        ratingCount++;
      }

      if (new Date(f.timestamp).getTime() > sevenDaysAgo) {
        recentCount++;
      }
    });

    return {
      total: feedback.length,
      byType,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      recentCount,
    };
  }

  /**
   * 清除所有反馈
   */
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 保存反馈到本地
   */
  private saveFeedback(feedback: Feedback): void {
    try {
      const all = this.getAllFeedback();
      all.push(feedback);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save feedback:', e);
    }
  }

  /**
   * 发送反馈到后端
   */
  private async sendToBackend(feedback: Feedback): Promise<void> {
    try {
      // 预留后端接口
      // const response = await fetch('/api/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(feedback),
      // });
      
      console.log('[Feedback] Submitted:', feedback);
    } catch (e) {
      console.error('Failed to send feedback to backend:', e);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取或创建会话 ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }

    return sessionId;
  }
}

// 导出单例
export const feedbackService = FeedbackService.getInstance();
