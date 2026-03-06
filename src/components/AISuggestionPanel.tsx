/**
 * AI 评分建议面板组件
 * 
 * 展示 AI 提供的能力评分建议，支持一键应用
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BasketballSkills, BasketballPosition } from '../types';
import { skillSuggestionService } from '../services/ai';
import type { SkillSuggestionResponse } from '../services/ai/types';
import { POSITION_DETAILS } from '../types';

export interface AISuggestionPanelProps {
  /** 球员姓名 */
  playerName: string;
  /** 球员位置 */
  position: BasketballPosition;
  /** 当前能力评分 */
  currentSkills?: Partial<BasketballSkills>;
  /** 观察记录 */
  observations?: string[];
  /** 应用建议回调 */
  onApply: (suggestedSkills: Partial<BasketballSkills>) => void;
  /** 添加观察记录回调 */
  onAddObservation?: (observation: string) => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * AI 评分建议面板
 */
export function AISuggestionPanel({
  playerName,
  position,
  currentSkills,
  observations,
  onApply,
  onAddObservation,
  style,
}: AISuggestionPanelProps) {
  const [suggestion, setSuggestion] = useState<SkillSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newObservation, setNewObservation] = useState('');
  const [showObservations, setShowObservations] = useState(false);
  const [localObservations, setLocalObservations] = useState<string[]>(observations || []);

  const positionDetail = POSITION_DETAILS[position];

  /**
   * 获取 AI 建议
   */
  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await skillSuggestionService.getSuggestions({
        playerName,
        position,
        currentSkills,
        observations: localObservations,
      });
      setSuggestion(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取建议失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 添加观察记录
   */
  const handleAddObservation = () => {
    if (newObservation.trim()) {
      const updated = [...localObservations, newObservation.trim()];
      setLocalObservations(updated);
      onAddObservation?.(newObservation.trim());
      setNewObservation('');
      // 自动重新获取建议
      setTimeout(() => fetchSuggestion(), 100);
    }
  };

  /**
   * 应用建议
   */
  const handleApply = () => {
    if (suggestion) {
      onApply(suggestion.suggestedSkills);
    }
  };

  // 初始加载建议
  useEffect(() => {
    if (playerName && position) {
      fetchSuggestion();
    }
  }, [playerName, position]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ai-suggestion-panel"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        ...style,
      }}
    >
      {/* 标题 */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>🤖</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>AI 评分建议</h3>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            {positionDetail.icon} {positionDetail.name} - {playerName}
          </p>
        </div>
      </div>

      {/* 观察记录区域 */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowObservations(!showObservations)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          📝 观察记录 ({localObservations.length}) {showObservations ? '▼' : '▶'}
        </button>

        <AnimatePresence>
          {showObservations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ marginTop: '12px' }}
            >
              {/* 现有观察记录 */}
              {localObservations.length > 0 && (
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', fontSize: '14px' }}>
                  {localObservations.map((obs, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      {obs}
                    </li>
                  ))}
                </ul>
              )}

              {/* 添加新观察 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddObservation()}
                  placeholder="添加观察记录（例如：投篮非常准）"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                  }}
                />
                <button
                  onClick={handleAddObservation}
                  disabled={!newObservation.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    cursor: newObservation.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                  }}
                >
                  添加
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ margin: 0, fontSize: '14px' }}>AI 正在分析...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div style={{
          background: 'rgba(255, 59, 48, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>❌ {error}</p>
          <button
            onClick={fetchSuggestion}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            重试
          </button>
        </div>
      )}

      {/* 建议内容 */}
      {suggestion && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* 降级提示 */}
          {suggestion.fromFallback && (
            <div style={{
              background: 'rgba(255, 193, 7, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '12px',
            }}>
              ⚠️ 使用规则建议（AI 服务不可用）
            </div>
          )}

          {/* 置信度 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              置信度: {Math.round(suggestion.confidence * 100)}%
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${suggestion.confidence * 100}%` }}
                style={{
                  height: '100%',
                  background: 'white',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>

          {/* 建议理由 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            💡 {suggestion.reasoning}
          </div>

          {/* 能力建议列表 */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
              建议评分:
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              fontSize: '13px',
            }}>
              {Object.entries(suggestion.suggestedSkills)
                .filter(([key]) => key !== 'overall')
                .slice(0, 6)
                .map(([skill, value]) => {
                  const currentValue = currentSkills?.[skill as keyof BasketballSkills];
                  const diff = currentValue !== undefined 
                    ? (value as number) - currentValue 
                    : 0;
                  
                  return (
                    <div key={skill} style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {skill.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span>
                        {value as number}
                        {diff !== 0 && (
                          <span style={{
                            marginLeft: '4px',
                            color: diff > 0 ? '#4ade80' : '#f87171',
                            fontSize: '11px',
                          }}>
                            ({diff > 0 ? '+' : ''}{diff})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 应用按钮 */}
          <motion.button
            onClick={handleApply}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '8px',
              color: '#667eea',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✨ 应用建议
          </motion.button>
        </motion.div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
