import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { BasketballTeam } from '../utils/basketballGroupingAlgorithm';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TeamComparisonChartProps {
  teams: BasketballTeam[];
}

// 团队颜色
const TEAM_COLORS = [
  '#FF6B35', // 篮球橙
  '#3B82F6', // 蓝
  '#10B981', // 绿
  '#8B5CF6', // 紫
  '#F59E0B', // 橙
  '#EF4444', // 红
];

export const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({ teams }) => {
  const data = {
    labels: teams.map(team => team.name),
    datasets: [
      {
        label: '团队总能力',
        data: teams.map(team => team.totalSkill),
        backgroundColor: teams.map((_, index) => TEAM_COLORS[index % TEAM_COLORS.length] + '80'),
        borderColor: teams.map((_, index) => TEAM_COLORS[index % TEAM_COLORS.length]),
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '团队实力对比',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: 'var(--color-text)',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const team = teams[context.dataIndex];
            return [
              `总能力: ${team.totalSkill}`,
              `球员数: ${team.players.length}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'var(--color-border-light)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // 计算平衡度
  const avgSkill = teams.reduce((sum, t) => sum + t.totalSkill, 0) / teams.length;
  const maxDiff = Math.max(...teams.map(t => Math.abs(t.totalSkill - avgSkill)));

  return (
    <div className="team-comparison-chart" style={{
      padding: 'var(--spacing-lg)',
      backgroundColor: 'var(--color-background)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ height: '250px' }}>
        <Bar data={data} options={options} />
      </div>
      
      {/* 统计信息 */}
      <div style={{ 
        marginTop: 'var(--spacing-md)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: 'var(--spacing-sm)',
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            平均能力
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            {Math.round(avgSkill)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            最大差距
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: maxDiff < 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {maxDiff}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            平衡度
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: maxDiff < 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {maxDiff < 5 ? '优秀' : maxDiff < 10 ? '良好' : '一般'}
          </div>
        </div>
      </div>
    </div>
  );
};
