import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { POSITION_DETAILS } from '../types/basketball';
import type { BasketballPosition, BasketballSkills } from '../types/basketball';
import { SkillRadarChart } from './SkillRadarChart';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';

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
  onViewDetails?: (player: PlayerBase) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onEdit, 
  onDelete,
  onViewDetails 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const positionDetails = POSITION_DETAILS[player.position];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      data-testid="player-card"
    >
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow relative group">
        {/* 操作菜单 */}
        {(onEdit || onDelete || onViewDetails) && (
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`h-8 w-8 bg-white/80 hover:bg-white transition-opacity ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                  data-testid="player-card-menu"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem 
                    onClick={() => onViewDetails(player)}
                    data-testid="menu-view-details"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看详情
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem 
                    onClick={() => onEdit(player)}
                    data-testid="menu-quick-edit"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    快速编辑
                  </DropdownMenuItem>
                )}
                {(onEdit || onDelete || onViewDetails) && onDelete && (
                  <DropdownMenuSeparator />
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(player.id)}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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

        {/* 操作按钮 - 保留原有按钮作为备选 */}
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
