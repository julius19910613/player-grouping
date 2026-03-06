/**
 * 增强版球员表单组件
 * 
 * 集成 AI 评分建议和评分历史功能
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, BasketballPosition, BasketballSkills } from '../types';
import { POSITION_DETAILS, createDefaultBasketballSkills } from '../types';
import { AISuggestionPanel } from './AISuggestionPanel';
import { RatingHistoryChart } from './RatingHistoryChart';
import { ratingHistoryService } from '../services/rating-history.service';

export interface EnhancedPlayerFormProps {
  /** 初始球员数据（编辑模式） */
  initialPlayer?: Player;
  /** 提交回调 */
  onSubmit: (player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 能力分类配置
 */
const SKILL_CATEGORIES = [
  {
    id: 'shooting',
    name: '投篮能力',
    icon: '🏀',
    skills: [
      { key: 'twoPointShot', name: '两分投篮', description: '中距离和篮下投篮' },
      { key: 'threePointShot', name: '三分投篮', description: '三分线外投射' },
      { key: 'freeThrow', name: '罚球', description: '罚球命中率' },
    ],
  },
  {
    id: 'playmaking',
    name: '组织能力',
    icon: '🎯',
    skills: [
      { key: 'passing', name: '传球', description: '传球精准度和时机' },
      { key: 'ballControl', name: '控球', description: '运球和护球能力' },
      { key: 'courtVision', name: '场上视野', description: '阅读比赛和发现机会' },
    ],
  },
  {
    id: 'defense',
    name: '防守能力',
    icon: '🛡️',
    skills: [
      { key: 'perimeterDefense', name: '外线防守', description: '外线防守和移动' },
      { key: 'interiorDefense', name: '内线防守', description: '内线防守和卡位' },
      { key: 'steals', name: '抢断', description: '抢断和拦截能力' },
      { key: 'blocks', name: '盖帽', description: '封盖能力' },
    ],
  },
  {
    id: 'rebound',
    name: '篮板能力',
    icon: '💪',
    skills: [
      { key: 'offensiveRebound', name: '进攻篮板', description: '前场篮板争抢' },
      { key: 'defensiveRebound', name: '防守篮板', description: '后场篮板保护' },
    ],
  },
  {
    id: 'physical',
    name: '身体素质',
    icon: '⚡',
    skills: [
      { key: 'speed', name: '速度', description: '跑动速度和反应' },
      { key: 'strength', name: '力量', description: '对抗能力和力量' },
      { key: 'stamina', name: '耐力', description: '体能和持久力' },
      { key: 'vertical', name: '弹跳', description: '弹跳高度和爆发力' },
    ],
  },
  {
    id: 'mental',
    name: '篮球智商',
    icon: '🧠',
    skills: [
      { key: 'basketballIQ', name: '篮球智商', description: '战术理解和执行' },
      { key: 'teamwork', name: '团队配合', description: '与队友的配合' },
      { key: 'clutch', name: '关键时刻', description: '关键时刻的表现' },
    ],
  },
];

/**
 * 增强版球员表单
 */
export function EnhancedPlayerForm({
  initialPlayer,
  onSubmit,
  onCancel,
  style,
}: EnhancedPlayerFormProps) {
  const [name, setName] = useState(initialPlayer?.name || '');
  const [position, setPosition] = useState<BasketballPosition>(
    initialPlayer?.position || 'PG'
  );
  const [skills, setSkills] = useState<BasketballSkills>(
    initialPlayer?.skills || createDefaultBasketballSkills()
  );
  const [observations, setObservations] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['shooting'])
  );
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!initialPlayer;

  /**
   * 验证表单
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '球员姓名不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 提交表单
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      position,
      skills,
    };

    // 记录评分历史
    if (initialPlayer) {
      ratingHistoryService.recordRating(
        initialPlayer.id,
        skills,
        'manual_edit',
        '用户手动编辑'
      );
    }

    onSubmit(playerData);
  };

  /**
   * 更新能力值
   */
  const updateSkill = (key: keyof BasketballSkills, value: number) => {
    setSkills(prev => ({
      ...prev,
      [key]: Math.max(1, Math.min(99, value)),
    }));
  };

  /**
   * 应用 AI 建议
   */
  const handleApplyAISuggestion = (suggestedSkills: Partial<BasketballSkills>) => {
    setSkills(prev => ({
      ...prev,
      ...suggestedSkills,
    }));
  };

  /**
   * 添加观察记录
   */
  const handleAddObservation = (observation: string) => {
    setObservations(prev => [...prev, observation]);
  };

  /**
   * 切换分类展开
   */
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        ...style,
      }}
    >
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          {isEditMode ? '✏️ 编辑球员' : '➕ 添加球员'}
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>
          {isEditMode ? '修改球员信息和能力评分' : '填写球员信息和能力评分'}
        </p>
      </div>

      {/* 基本信息 */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          球员姓名 <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入球员姓名"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: errors.name ? '2px solid #EF4444' : '2px solid #E5E7EB',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        {errors.name && (
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#EF4444' }}>
            {errors.name}
          </p>
        )}
      </div>

      {/* 位置选择 */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          位置 <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(POSITION_DETAILS).map(([key, detail]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPosition(key as BasketballPosition)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: position === key ? `2px solid ${detail.color}` : '2px solid #E5E7EB',
                background: position === key ? `${detail.color}15` : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{detail.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{detail.name}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{detail.englishName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 功能开关 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setShowAIPanel(!showAIPanel)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: showAIPanel ? '2px solid #667eea' : '2px solid #E5E7EB',
            background: showAIPanel ? '#667eea15' : 'white',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          🤖 AI 评分建议 {showAIPanel ? '✓' : ''}
        </button>
        {isEditMode && (
          <button
            type="button"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: showHistoryPanel ? '2px solid #FF6B35' : '2px solid #E5E7EB',
              background: showHistoryPanel ? '#FF6B3515' : 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            📊 评分历史 {showHistoryPanel ? '✓' : ''}
          </button>
        )}
      </div>

      {/* AI 建议面板 */}
      <AnimatePresence>
        {showAIPanel && name && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '20px' }}
          >
            <AISuggestionPanel
              playerName={name}
              position={position}
              currentSkills={skills}
              observations={observations}
              onApply={handleApplyAISuggestion}
              onAddObservation={handleAddObservation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 评分历史面板 */}
      <AnimatePresence>
        {showHistoryPanel && initialPlayer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '20px' }}
          >
            <RatingHistoryChart
              playerId={initialPlayer.id}
              playerName={initialPlayer.name}
              daysRange={30}
              showStats={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 能力评分 */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
          能力评分
        </h3>

        {SKILL_CATEGORIES.map(category => (
          <div key={category.id} style={{ marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #E5E7EB',
                background: expandedCategories.has(category.id) ? '#F9FAFB' : 'white',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              <span>
                {category.icon} {category.name}
              </span>
              <span>{expandedCategories.has(category.id) ? '▼' : '▶'}</span>
            </button>

            <AnimatePresence>
              {expandedCategories.has(category.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', marginTop: '8px' }}
                >
                  {category.skills.map(skillInfo => {
                    const value = skills[skillInfo.key as keyof BasketballSkills];
                    return (
                      <div key={skillInfo.key} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{skillInfo.name}</span>
                            <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
                              {skillInfo.description}
                            </span>
                          </div>
                          <span style={{ fontSize: '16px', fontWeight: 600 }}>{value}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={value}
                          onChange={(e) => updateSkill(skillInfo.key as keyof BasketballSkills, parseInt(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* 综合能力 */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #FF6B35 0%, #F59E0B 100%)',
        borderRadius: '12px',
        marginBottom: '24px',
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
          综合能力评分
        </div>
        <div style={{ fontSize: '48px', fontWeight: 700 }}>
          {skills.overall}
        </div>
        <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.9 }}>
          {POSITION_DETAILS[position].description}
        </div>
      </div>

      {/* 提交按钮 */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            flex: 1,
            padding: '14px',
            background: '#FF6B35',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isEditMode ? '💾 保存修改' : '➕ 添加球员'}
        </motion.button>
        
        {onCancel && (
          <motion.button
            type="button"
            onClick={onCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              flex: 1,
              padding: '14px',
              background: '#F3F4F6',
              border: 'none',
              borderRadius: '8px',
              color: '#374151',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            取消
          </motion.button>
        )}
      </div>
    </motion.form>
  );
}
