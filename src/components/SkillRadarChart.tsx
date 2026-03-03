import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { BasketballPosition, POSITION_DETAILS } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';

// 注册 Chart.js 组件
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface SkillRadarChartProps {
  skills: BasketballSkills;
  position: BasketballPosition;
}

// 能力分类和对应字段
const SKILL_CATEGORIES = [
  { label: '投篮', keys: ['twoPointShot', 'threePointShot', 'freeThrow'] },
  { label: '组织', keys: ['passing', 'ballControl', 'courtVision'] },
  { label: '防守', keys: ['perimeterDefense', 'interiorDefense', 'steals', 'blocks'] },
  { label: '篮板', keys: ['offensiveRebound', 'defensiveRebound'] },
  { label: '身体', keys: ['speed', 'strength', 'stamina', 'vertical'] },
  { label: '球商', keys: ['basketballIQ', 'teamwork', 'clutch'] },
];

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ skills, position }) => {
  const positionDetails = POSITION_DETAILS[position];

  // 计算各类别平均分
  const categoryScores = SKILL_CATEGORIES.map(({ keys }) => {
    const avg = keys.reduce((sum, key) => sum + (skills[key as keyof BasketballSkills] as number), 0) / keys.length;
    return Math.round(avg);
  });

  const data = {
    labels: SKILL_CATEGORIES.map(c => c.label),
    datasets: [
      {
        label: '能力值',
        data: categoryScores,
        backgroundColor: positionDetails.color + '40',
        borderColor: positionDetails.color,
        borderWidth: 2,
        pointBackgroundColor: positionDetails.color,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: positionDetails.color,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 99,
        min: 0,
        ticks: {
          stepSize: 20,
          font: {
            size: 10,
          },
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="skill-radar-chart" style={{
      padding: '16px',
      backgroundColor: 'var(--color-background-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: `2px solid ${positionDetails.color}`
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: positionDetails.color, textAlign: 'center' }}>
        {positionDetails.icon} {positionDetails.name} 能力分析
      </h4>
      
      <div style={{ height: '200px' }}>
        <Radar data={data} options={options} />
      </div>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '28px', fontWeight: 'bold', color: positionDetails.color }}>
          {skills.overall}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}> 总评</span>
      </div>
    </div>
  );
};
