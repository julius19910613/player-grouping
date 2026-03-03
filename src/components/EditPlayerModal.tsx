import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BasketballPosition, calculateOverallSkill, POSITION_DETAILS } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';
import type { Player } from '../hooks/usePlayerManager';
import { PositionSelect } from './PositionSelect';
import { SkillSlider } from './SkillSlider';

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
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* 头部 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>✏️ 编辑球员</h3>
          <button
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* 错误提示 */}
          {errors.length > 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#dc2626'
            }}>
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          )}

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
                {calculatedOverall}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: positionColor,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
