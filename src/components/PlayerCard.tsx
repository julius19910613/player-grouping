import React from 'react';
import { motion } from 'framer-motion';
import { POSITION_DETAILS } from '../types/basketball';
import type { BasketballPosition, BasketballSkills } from '../types/basketball';
import { SkillRadarChart } from './SkillRadarChart';

// 通用球员类型
interface PlayerBase {
  id: string;
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
}

interface PlayerCardProps {
  player: PlayerBase;
  onEdit?: (player: PlayerBase) => void;
  onDelete?: (id: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onEdit, onDelete }) => {
  const positionDetails = POSITION_DETAILS[player.position];

  return (
    <motion.div
      className="player-card"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}
    >
      {/* 头部 - 位置和名称 */}
      <div style={{
        backgroundColor: positionDetails.color,
        padding: '16px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>{positionDetails.icon}</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{positionDetails.name}</span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>({positionDetails.englishName})</span>
        </div>
        <h3 style={{ margin: 0, fontSize: '20px' }}>{player.name}</h3>
      </div>

      {/* 总评 */}
      <div style={{
        padding: '16px',
        textAlign: 'center',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: positionDetails.color + '20',
          border: `3px solid ${positionDetails.color}`
        }}>
          <span style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: positionDetails.color
          }}>
            {player.skills.overall}
          </span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>总体评分</div>
      </div>

      {/* 能力雷达图 */}
      <div style={{ padding: '12px' }}>
        <SkillRadarChart skills={player.skills} position={player.position} />
      </div>

      {/* 操作按钮 */}
      {(onEdit || onDelete) && (
        <div style={{
          padding: '12px',
          display: 'flex',
          gap: '8px',
          borderTop: '1px solid #eee'
        }}>
          {onEdit && (
            <button
              onClick={() => onEdit(player)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f0f0f0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✏️ 编辑
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(player.id)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ 删除
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
