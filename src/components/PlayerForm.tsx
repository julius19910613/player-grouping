import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BasketballPosition, createDefaultBasketballSkills, calculateOverallSkill, POSITION_DETAILS } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';
import { PositionSelect } from './PositionSelect';
import { SkillSlider } from './SkillSlider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="player-form"
    >
      <Card className="max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">🏀 添加球员</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 球员名称 */}
          <div className="space-y-2">
            <Label>球员名称</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入球员名称"
              required
            />
          </div>

          {/* 位置选择 */}
          <div>
            <PositionSelect value={position} onChange={setPosition} />
          </div>

          {/* 能力值设置 */}
          <div className="space-y-2">
            <h4 className="text-sm text-slate-500 font-medium">
              能力值设置
            </h4>
            
            {Object.entries(SKILL_CATEGORIES).map(([category, skillKeys]) => (
              <div key={category}>
                <div
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer font-medium text-sm hover:bg-slate-100 transition-colors"
                  style={{ backgroundColor: expandedCategories.has(category) ? '#f0f0f0' : '#fafafa' }}
                >
                  <span>{expandedCategories.has(category) ? '▼' : '▶'}</span>
                  <span>{category}</span>
                </div>
                
                <AnimatePresence>
                  {expandedCategories.has(category) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 bg-slate-50 rounded-b"
                    >
                      {skillKeys.map((skillKey) => (
                        <SkillSlider
                          key={skillKey}
                          label={SKILL_NAMES[skillKey] || skillKey}
                          value={skills[skillKey as keyof BasketballSkills] as number}
                          onChange={(value) => handleSkillChange(skillKey as keyof BasketballSkills, value)}
                          color={positionColor}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* 总评显示 */}
            <div 
              className="mt-3 p-3 rounded-lg text-center"
              style={{ backgroundColor: `${positionColor}20` }}
            >
              <span className="text-sm text-slate-500">总体评分: </span>
              <span 
                className="text-3xl font-bold"
                style={{ color: positionColor }}
              >
                {skills.overall}
              </span>
            </div>
          </div>

          {/* 提交按钮 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              type="submit" 
              className="w-full"
              style={{ backgroundColor: positionColor }}
            >
              添加球员
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.form>
  );
};
