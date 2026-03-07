/**
 * 使用统计仪表板组件
 * 显示 API 调用量、错误率、性能指标
 */

import { memo, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { monitoringService } from '../services/monitoring-service';
import { feedbackService } from '../services/feedback-service';
import { BarChart3, X, Activity, AlertCircle, MessageSquare } from 'lucide-react';

export const MonitoringDashboard = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiStats, setApiStats] = useState(monitoringService.getStats());
  const [feedbackStats, setFeedbackStats] = useState(feedbackService.getStats());

  // 刷新统计数据
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setApiStats(monitoringService.getStats());
        setFeedbackStats(feedbackService.getStats());
      }, 5000); // 每5秒刷新

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* 打开按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-40"
        aria-label="查看使用统计"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>

      {/* 仪表板对话框 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-title"
        >
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 id="dashboard-title" className="text-xl font-semibold">
                使用统计
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* API 调用统计 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">API 调用统计</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{apiStats.totalCalls}</div>
                  <div className="text-sm text-muted-foreground">总调用次数</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {(apiStats.errorRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">错误率</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {apiStats.avgDuration.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">平均响应时间</div>
                </div>
              </div>

              {/* 端点分布 */}
              {Object.keys(apiStats.endpoints).length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">端点调用分布</div>
                  {Object.entries(apiStats.endpoints).map(([endpoint, count]) => (
                    <div key={endpoint} className="flex justify-between text-sm py-1">
                      <span>{endpoint}</span>
                      <span className="text-muted-foreground">{count} 次</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 用户反馈统计 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">用户反馈</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{feedbackStats.total}</div>
                  <div className="text-sm text-muted-foreground">总反馈数</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {feedbackStats.avgRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">平均评分</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{feedbackStats.recentCount}</div>
                  <div className="text-sm text-muted-foreground">最近7天</div>
                </div>
              </div>

              {/* 反馈类型分布 */}
              {Object.keys(feedbackStats.byType).length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">反馈类型分布</div>
                  {Object.entries(feedbackStats.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm py-1">
                      <span className="capitalize">{type}</span>
                      <span className="text-muted-foreground">{count} 次</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 健康指标 */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-lg font-medium">健康指标</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>API 可用性</span>
                  <span
                    className={
                      apiStats.errorRate < 0.05
                        ? 'text-green-600'
                        : apiStats.errorRate < 0.1
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }
                  >
                    {((1 - apiStats.errorRate) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>响应速度</span>
                  <span
                    className={
                      apiStats.avgDuration < 1000
                        ? 'text-green-600'
                        : apiStats.avgDuration < 2000
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }
                  >
                    {apiStats.avgDuration < 1000
                      ? '优秀'
                      : apiStats.avgDuration < 2000
                      ? '良好'
                      : '需优化'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>用户满意度</span>
                  <span
                    className={
                      feedbackStats.avgRating >= 4
                        ? 'text-green-600'
                        : feedbackStats.avgRating >= 3
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }
                  >
                    {feedbackStats.avgRating >= 4
                      ? '高'
                      : feedbackStats.avgRating >= 3
                      ? '中等'
                      : '需改进'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-muted-foreground text-center">
              数据每 5 秒自动刷新 · 数据仅存储在本地浏览器
            </div>
          </div>
        </div>
      )}
    </>
  );
});

MonitoringDashboard.displayName = 'MonitoringDashboard';
