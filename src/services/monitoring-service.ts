/**
 * 监控服务
 * 负责收集和上报 API 调用量、错误、性能指标
 */

export interface ApiUsageMetrics {
  timestamp: string;
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  timestamp: string;
  metric: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes';
  tags?: Record<string, string>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private metricsBuffer: ApiUsageMetrics[] = [];
  private performanceBuffer: PerformanceMetrics[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 60000; // 1分钟

  private constructor() {
    // 定期刷新缓冲区
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.FLUSH_INTERVAL);
      
      // 页面关闭前刷新
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 记录 API 调用
   */
  trackApiCall(metrics: ApiUsageMetrics): void {
    this.metricsBuffer.push(metrics);
    
    // 缓冲区满了就立即刷新
    if (this.metricsBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }

    // 同时输出到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Monitor]', {
        endpoint: metrics.endpoint,
        duration: `${metrics.duration}ms`,
        status: metrics.status,
        error: metrics.error || 'None',
      });
    }
  }

  /**
   * 记录性能指标
   */
  trackPerformance(metrics: PerformanceMetrics): void {
    this.performanceBuffer.push(metrics);

    // 开发环境输出
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance]', {
        metric: metrics.metric,
        value: `${metrics.value}${metrics.unit}`,
        tags: metrics.tags || {},
      });
    }
  }

  /**
   * 记录错误
   */
  trackError(error: Error, context?: Record<string, any>): void {
    const errorMetrics: ApiUsageMetrics = {
      timestamp: new Date().toISOString(),
      endpoint: context?.endpoint || 'unknown',
      method: context?.method || 'GET',
      duration: 0,
      status: 500,
      error: error.message,
      metadata: {
        stack: error.stack,
        ...context,
      },
    };

    this.trackApiCall(errorMetrics);

    // 在生产环境，可以发送到错误追踪服务（如 Sentry）
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(error, context);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalCalls: number;
    errorRate: number;
    avgDuration: number;
    endpoints: Record<string, number>;
  } {
    const metrics = this.metricsBuffer;
    
    if (metrics.length === 0) {
      return {
        totalCalls: 0,
        errorRate: 0,
        avgDuration: 0,
        endpoints: {},
      };
    }

    const totalCalls = metrics.length;
    const errors = metrics.filter(m => m.status >= 400).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const endpoints: Record<string, number> = {};

    metrics.forEach(m => {
      endpoints[m.endpoint] = (endpoints[m.endpoint] || 0) + 1;
    });

    return {
      totalCalls,
      errorRate: errors / totalCalls,
      avgDuration: totalDuration / totalCalls,
      endpoints,
    };
  }

  /**
   * 刷新缓冲区（发送到后端或存储）
   */
  private flush(): void {
    if (this.metricsBuffer.length === 0 && this.performanceBuffer.length === 0) {
      return;
    }

    const data = {
      apiMetrics: this.metricsBuffer,
      performanceMetrics: this.performanceBuffer,
    };

    // 存储到 localStorage（用于离线分析）
    try {
      const existingData = localStorage.getItem('monitoring_data');
      const allData = existingData ? JSON.parse(existingData) : [];
      allData.push({
        timestamp: new Date().toISOString(),
        data,
      });

      // 只保留最近 1000 条记录
      if (allData.length > 1000) {
        allData.splice(0, allData.length - 1000);
      }

      localStorage.setItem('monitoring_data', JSON.stringify(allData));
    } catch (e) {
      console.error('Failed to save monitoring data:', e);
    }

    // 清空缓冲区
    this.metricsBuffer = [];
    this.performanceBuffer = [];
  }

  /**
   * 发送错误到错误追踪服务
   */
  private sendToErrorTracking(error: Error, context?: Record<string, any>): void {
    // 预留 Sentry 集成接口
    // 如果未来需要集成 Sentry，可以在这里添加
    console.error('[Error Tracking]', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }
}

// 导出单例
export const monitoringService = MonitoringService.getInstance();

/**
 * 性能测量工具
 */
export class PerformanceTimer {
  private startTime: number;
  private metric: string;
  private tags?: Record<string, string>;

  constructor(metric: string, tags?: Record<string, string>) {
    this.startTime = performance.now();
    this.metric = metric;
    this.tags = tags;
  }

  /**
   * 停止计时并记录
   */
  stop(): number {
    const duration = performance.now() - this.startTime;
    
    monitoringService.trackPerformance({
      timestamp: new Date().toISOString(),
      metric: this.metric,
      value: duration,
      unit: 'ms',
      tags: this.tags,
    });

    return duration;
  }
}

/**
 * 创建性能计时器
 */
export function startTimer(metric: string, tags?: Record<string, string>): PerformanceTimer {
  return new PerformanceTimer(metric, tags);
}
