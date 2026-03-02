import React from 'react';
import { BasketballSkills, BasketballPosition, POSITION_DETAILS } from '../types/basketball';

interface SkillRadarChartProps {
  skills: BasketballSkills;
  position: BasketballPosition;
}

// 能力分类
const SKILL_CATEGORIES = {
  '投篮': ['twoPointShot', 'threePointShot', 'freeThrow'],
  '组织': ['passing', 'ballControl', 'courtVision'],
  '防守': ['perimeterDefense', 'interiorDefense', 'steals', 'blocks'],
  '篮板': ['offensiveRebound', 'defensiveRebound'],
  '身体素质': ['speed', 'strength', 'stamina', 'vertical'],
  '篮球智商': ['basketballIQ', 'teamwork', 'clutch']
};

// 能力中文名映射
const SKILL_NAMES: Record<string, string> = {
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
  clutch: '关键时刻'
};

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ skills, position }) => {
  const positionDetails = POSITION_DETAILS[position];

  // 计算各类别平均分
  const categoryScores = Object.entries(SKILL_CATEGORIES).map(([category, skillKeys]) => {
    const avg = skillKeys.reduce((sum, key) => sum + (skills[key as keyof BasketballSkills] as number), 0) / skillKeys.length;
    return { category, score: Math.round(avg) };
  });

  return (
    <div className="skill-radar-chart" style={{
      padding: '16px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: `2px solid ${positionDetails.color}`
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: positionDetails.color }}>
        {positionDetails.icon} {positionDetails.chineseName} 能力分析
      </h4>
      
      {/* 简易条形图 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {categoryScores.map(({ category, score }) => (
          <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '70px', fontSize: '12px' }}>{category}</span>
            <div style={{
              flex: 1,
              height: '12px',
              backgroundColor: '#e0e0e0',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${score}%`,
                height: '100%',
                backgroundColor: positionDetails.color,
                borderRadius: '6px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ width: '30px', fontSize: '12px', fontWeight: 'bold' }}>{score}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: positionDetails.color }}>
          {skills.overall}
        </span>
        <span style={{ fontSize: '12px', color: '#666' }}> 总评</span>
      </div>
    </div>
  );
};
