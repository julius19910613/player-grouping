import React, { useState } from 'react';
import { BasketballPosition, BasketballSkills, createDefaultBasketballSkills, calculateOverallSkill, POSITION_DETAILS } from '../types/basketball';
import { PositionSelect } from './PositionSelect';
import { SkillSlider } from './SkillSlider';

interface Player {
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
}

interface PlayerFormProps {
  onAddPlayer: (player: Player) => void;
}

// 能力分类
const SKILL_CATEGORIES = {
  '投篮能力': ['twoPointShot', 'threePointShot', 'freeThrow'],
  '组织能力': ['passing', 'ballControl', 'courtVision'],
  '防守能力': ['perimeterDefense', 'interiorDefense', 'steals', 'blocks'],
  '篮板能力': ['offensiveRebound', 'defensiveRebound'],
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

export const PlayerForm: React.FC<PlayerFormProps> = ({ onAddPlayer }) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<BasketballPosition>(BasketballPosition.PG);
  const [skills, setSkills] = useState<BasketballSkills>(createDefaultBasketballSkills());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['投篮能力']));

  const handleSkillChange = (skillKey: keyof BasketballSkills, value: number) => {
    setSkills(prev => {
      const newSkills = { ...prev, [skillKey]: value };
      // 重新计算 overall
      const { overall, ...skillsWithoutOverall } = newSkills;
      newSkills.overall = calculateOverallSkill(skillsWithoutOverall as Omit<BasketballSkills, 'overall'>, position);
      return newSkills;
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { overall, ...skillsWithoutOverall } = skills;
    const finalOverall = calculateOverallSkill(skillsWithoutOverall as Omit<BasketballSkills, 'overall'>, position);
    
    onAddPlayer({
      name: name.trim(),
      position,
      skills: { ...skills, overall: finalOverall }
    });
    
    setName('');
    setSkills(createDefaultBasketballSkills());
  };

  const positionColor = POSITION_DETAILS[position].color;

  return (
    <form className="player-form" onSubmit={handleSubmit} style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '400px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>🏀 添加球员</h3>
      
      {/* 球员名称 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          球员名称:
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入球员名称"
          required
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 位置选择 */}
      <div style={{ marginBottom: '16px' }}>
        <PositionSelect value={position} onChange={setPosition} />
      </div>

      {/* 能力值设置 */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
          能力值设置
        </h4>
        
        {Object.entries(SKILL_CATEGORIES).map(([category, skillKeys]) => (
          <div key={category} style={{ marginBottom: '8px' }}>
            <div
              onClick={() => toggleCategory(category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                backgroundColor: expandedCategories.has(category) ? '#f0f0f0' : '#fafafa',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px'
              }}
            >
              <span>{expandedCategories.has(category) ? '▼' : '▶'}</span>
              <span>{category}</span>
            </div>
            
            {expandedCategories.has(category) && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fafafa', borderRadius: '0 0 4px 4px' }}>
                {skillKeys.map((skillKey) => (
                  <SkillSlider
                    key={skillKey}
                    label={SKILL_NAMES[skillKey] || skillKey}
                    value={skills[skillKey as keyof BasketballSkills] as number}
                    onChange={(value) => handleSkillChange(skillKey as keyof BasketballSkills, value)}
                    color={positionColor}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 总评显示 */}
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: positionColor + '20',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>总体评分: </span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: positionColor }}>
            {skills.overall}
          </span>
        </div>
      </div>

      {/* 提交按钮 */}
      <button
        type="submit"
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: positionColor,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'transform 0.1s ease'
        }}
      >
        添加球员
      </button>
    </form>
  );
};
