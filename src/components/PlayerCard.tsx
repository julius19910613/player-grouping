import React from 'react';
import { motion } from 'framer-motion';
import { POSITION_DETAILS } from '../types/basketball';
import type { BasketballPosition, BasketballSkills } from '../types/basketball';
import { SkillRadarChart } from './SkillRadarChart';
import { Card } from './ui/card';
import { Button } from './ui/button';

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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid="player-card"
    >
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        {/* 头部 - 位置和名称 */}
        <div 
          className="p-4 text-white"
          style={{ backgroundColor: positionDetails.color }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{positionDetails.icon}</span>
            <span className="text-lg font-bold">{positionDetails.name}</span>
            <span className="text-xs opacity-80">({positionDetails.englishName})</span>
          </div>
          <h3 className="text-xl m-0">{player.name}</h3>
        </div>

        {/* 总评 */}
        <div className="p-4 text-center border-b border-slate-200">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-full"
            style={{ 
              backgroundColor: `${positionDetails.color}20`,
              border: `3px solid ${positionDetails.color}`
            }}
          >
            <span 
              className="text-3xl font-bold"
              style={{ color: positionDetails.color }}
            >
              {player.skills.overall}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">总体评分</div>
        </div>

        {/* 能力雷达图 */}
        <div className="p-3">
          <SkillRadarChart skills={player.skills} position={player.position} />
        </div>

        {/* 操作按钮 */}
        {(onEdit || onDelete) && (
          <div className="p-3 flex gap-2 border-t border-slate-200">
            {onEdit && (
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => onEdit(player)}
              >
                ✏️ 编辑
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => onDelete(player.id)}
              >
                🗑️ 删除
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
};
