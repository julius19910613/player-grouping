/**
 * 评分历史图表组件
 * 
 * 展示球员能力评分的历史变化趋势
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { BasketballSkills } from '../types';
import { ratingHistoryService, type RatingHistoryEntry, type RatingTrend } from '../services/rating-history.service';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface RatingHistoryChartProps {
  /** 球员 ID */
  playerId: string;
  /** 球员姓名 */
  playerName: string;
  /** 展示的能力项（不指定则展示所有） */
  skills?: (keyof BasketballSkills)[];
  /** 时间范围（天数） */
  daysRange?: number;
  /** 显示统计信息 */
  showStats?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 能力名称映射
 */
const SKILL_NAMES: Partial<Record<keyof BasketballSkills, string>> = {
  twoPointShot: '两分投篮',
  threePointShot: '三分投篮',
  freeThrow: '罚球',
  passing: '传球',
  ballControl: '控球',
  courtVision: '场上视野',
  perimeterDefense: '外线防守',
  interiorDefense: '内线防守',
  steals: '抢断',
  blocks: '盖帽',
  offensiveRebound: '进攻篮板',
  defensiveRebound: '防守篮板',
  speed: '速度',
  strength: '力量',
  stamina: '耐力',
  vertical: '弹跳',
  basketballIQ: '篮球智商',
  teamwork: '团队配合',
  clutch: '关键时刻',
  overall: '综合能力',
};

/**
 * 评分历史图表组件
 */
export function RatingHistoryChart({
  playerId,
  playerName,
  skills,
  daysRange = 30,
  showStats = true,
  style,
}: RatingHistoryChartProps) {
  const [history, setHistory] = useState<RatingHistoryEntry[]>([]);
  const [trends, setTrends] = useState<RatingTrend[]>([]);
  const [stats, setStats] = useState<{
    totalRecords: number;
    averageOverall: number;
    improvementRate: number;
    mostChangedSkill: { skill: keyof BasketballSkills; change: number } | null;
  } | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<(keyof BasketballSkills)[]>(
    skills || ['overall']
  );

  /**
   * 加载历史数据
   */
  useEffect(() => {
    const allHistory = ratingHistoryService.getPlayerHistory(playerId);
    
    // 过滤时间范围
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysRange);
    const filteredHistory = allHistory.filter(entry => entry.createdAt >= cutoffDate);
    
    setHistory(filteredHistory);
    
    // 获取趋势
    const allTrends = ratingHistoryService.getRatingTrend(playerId);
    setTrends(allTrends);
    
    // 获取统计
    const statistics = ratingHistoryService.getStatistics(playerId);
    setStats(statistics);
  }, [playerId, daysRange]);

  /**
   * 准备图表数据
   */
  const prepareChartData = () => {
    if (history.length === 0) return null;

    const labels = history.map(entry => {
      const date = new Date(entry.createdAt);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const datasets = selectedSkills.map((skill, index) => {
      const colors = [
        '#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444',
        '#F59E0B', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
      ];
      const color = colors[index % colors.length];
      
      return {
        label: SKILL_NAMES[skill] || skill,
        data: history.map(entry => entry.skills[skill]),
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return { labels, datasets };
  };

  const chartData = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 40,
        max: 100,
        ticks: {
          stepSize: 10,
          font: { size: 11 },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  /**
   * 切换能力项显示
   */
  const toggleSkill = (skill: keyof BasketballSkills) => {
    setSelectedSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else {
        return [...prev, skill];
      }
    });
  };

  /**
   * 获取趋势图标
   */
  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
    }
  };

  /**
   * 获取趋势颜色
   */
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return '#10B981';
      case 'down':
        return '#EF4444';
      case 'stable':
        return '#6B7280';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rating-history-chart"
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        ...style,
      }}
    >
      {/* 标题 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          📊 评分历史趋势
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>
          {playerName} - 最近 {daysRange} 天
        </p>
      </div>

      {/* 统计信息 */}
      {showStats && stats && stats.totalRecords > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}>
          <div style={{
            background: '#F9FAFB',
            padding: '12px',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              记录总数
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>
              {stats.totalRecords}
            </div>
          </div>
          
          <div style={{
            background: '#F9FAFB',
            padding: '12px',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              平均综合
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>
              {stats.averageOverall}
            </div>
          </div>
          
          <div style={{
            background: '#F9FAFB',
            padding: '12px',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              进步幅度
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 600,
              color: stats.improvementRate > 0 ? '#10B981' : stats.improvementRate < 0 ? '#EF4444' : '#6B7280',
            }}>
              {stats.improvementRate > 0 ? '+' : ''}{stats.improvementRate}
            </div>
          </div>
        </div>
      )}

      {/* 能力选择器 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
          选择展示的能力项:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['overall', 'twoPointShot', 'threePointShot', 'passing', 'ballControl', 'perimeterDefense', 'speed', 'strength'].map(skill => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill as keyof BasketballSkills)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: selectedSkills.includes(skill as keyof BasketballSkills) 
                  ? '2px solid #FF6B35' 
                  : '2px solid transparent',
                background: selectedSkills.includes(skill as keyof BasketballSkills) 
                  ? '#FF6B3520' 
                  : '#F3F4F6',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {SKILL_NAMES[skill as keyof BasketballSkills]}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      {chartData ? (
        <div style={{ height: '300px', marginBottom: '20px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          fontSize: '14px',
        }}>
          暂无历史数据
        </div>
      )}

      {/* 趋势分析 */}
      {trends.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
            趋势分析:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px',
          }}>
            {trends
              .filter(t => selectedSkills.length === 0 || selectedSkills.includes(t.skill))
              .slice(0, 8)
              .map(trend => (
                <div
                  key={trend.skill}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  <span>{getTrendIcon(trend.direction)}</span>
                  <span style={{ flex: 1 }}>
                    {SKILL_NAMES[trend.skill]}
                  </span>
                  <span style={{
                    color: getTrendColor(trend.direction),
                    fontWeight: 600,
                  }}>
                    {trend.change > 0 ? '+' : ''}{trend.change}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
