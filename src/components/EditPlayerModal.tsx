import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BasketballPosition, calculateOverallSkill, POSITION_DETAILS } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';
import type { Player } from '../hooks/usePlayerManager';
import { PositionSelect } from './PositionSelect';
import { SkillSlider } from './SkillSlider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface EditPlayerModalProps {
  player: Player;
  onSave: (id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>) => boolean;
  onCancel: () => void;
  isOpen: boolean;
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

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  onSave,
  onCancel,
  isOpen
}) => {
  const [name, setName] = useState(player.name);
  const [position, setPosition] = useState<BasketballPosition>(player.position);
  const [skills, setSkills] = useState<BasketballSkills>(player.skills);
  const [errors, setErrors] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['投篮能力']));

  // 当 player 改变时重置状态
  useEffect(() => {
    setName(player.name);
    setPosition(player.position);
    setSkills(player.skills);
    setErrors([]);
  }, [player]);

  // 计算总体评分
  const calculatedOverall = useMemo(() => {
    const { overall, ...skillsWithoutOverall } = skills;
    return calculateOverallSkill(skillsWithoutOverall as Omit<BasketballSkills, 'overall'>, position);
  }, [skills, position]);

  // 更新能力值
  const handleSkillChange = useCallback((skillKey: keyof BasketballSkills, value: number) => {
    setSkills(prev => ({
      ...prev,
      [skillKey]: value
    }));
  }, []);

  // 切换分类展开状态
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    const newErrors: string[] = [];

    if (!name || name.trim().length === 0) {
      newErrors.push('球员名称不能为空');
    }

    if (name.length > 50) {
      newErrors.push('球员名称不能超过50个字符');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [name]);

  // 提交保存
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const success = onSave(player.id, {
      name: name.trim(),
      position,
      skills: { ...skills, overall: calculatedOverall }
    });

    if (success) {
      onCancel();
    }
  }, [player.id, name, position, skills, calculatedOverall, validateForm, onSave, onCancel]);

  // 点击背景关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  if (!isOpen) return null;

  const positionColor = POSITION_DETAILS[position].color;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <Card className="w-[90%] max-w-md max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200">
          <CardTitle className="text-lg">✏️ 编辑球员</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </Button>
        </CardHeader>

        {/* 表单 */}
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 错误提示 */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  {errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* 球员名称 */}
            <div className="space-y-2">
              <Label>球员名称</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入球员名称"
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

                  {expandedCategories.has(category) && (
                    <div className="p-3 bg-slate-50 rounded-b">
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
              <div 
                className="mt-3 p-3 rounded-lg text-center"
                style={{ backgroundColor: `${positionColor}20` }}
              >
                <span className="text-sm text-slate-500">总体评分: </span>
                <span 
                  className="text-3xl font-bold"
                  style={{ color: positionColor }}
                >
                  {calculatedOverall}
                </span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                style={{ backgroundColor: positionColor }}
              >
                保存
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
