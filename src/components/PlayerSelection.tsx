import { useState, useMemo } from 'react';
import type { Player } from '../types';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Search, UserCheck, UserX } from 'lucide-react';

export interface PlayerSelectionProps {
  players: Player[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  maxSelect?: number;
  className?: string;
}

export function PlayerSelection({ 
  players, 
  selectedIds, 
  onSelect, 
  maxSelect,
  className 
}: PlayerSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤球员列表
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return players;
    }
    const query = searchQuery.toLowerCase();
    return players.filter(player => 
      player.name.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // 全选/取消全选
  const allSelected = selectedIds.length === players.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelect([]);
    } else {
      // 如果有 maxSelect 限制，只选择前 maxSelect 个
      if (maxSelect) {
        onSelect(players.slice(0, maxSelect).map(p => p.id));
      } else {
        onSelect(players.map(p => p.id));
      }
    }
  };

  // 切换单个球员选择
  const handleTogglePlayer = (playerId: string) => {
    if (selectedIds.includes(playerId)) {
      onSelect(selectedIds.filter(id => id !== playerId));
    } else {
      // 检查是否达到最大选择数
      if (maxSelect && selectedIds.length >= maxSelect) {
        return;
      }
      onSelect([...selectedIds, playerId]);
    }
  };

  // 批量选择（当前搜索结果中的球员）
  const handleSelectFiltered = () => {
    const filteredIds = filteredPlayers.map(p => p.id);
    const newSelected = new Set(selectedIds);
    
    filteredIds.forEach(id => {
      if (maxSelect && newSelected.size >= maxSelect) {
        return;
      }
      newSelected.add(id);
    });
    
    onSelect(Array.from(newSelected));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索球员..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 操作按钮和统计 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex items-center gap-2"
          >
            {allSelected ? (
              <>
                <UserX className="h-4 w-4" />
                取消全选
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                全选
              </>
            )}
          </Button>
          
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectFiltered}
            >
              选择当前搜索结果
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          已选 {selectedIds.length} / {players.length} 人
          {maxSelect && ` (最多 ${maxSelect} 人)`}
        </div>
      </div>

      {/* 球员列表 */}
      <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            没有找到匹配的球员
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const isSelected = selectedIds.includes(player.id);
            const isDisabled = !isSelected && maxSelect && selectedIds.length >= maxSelect;

            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isSelected && "bg-primary/5 border-primary/30",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Checkbox
                  checked={Boolean(isSelected)}
                  onCheckedChange={() => !isDisabled && handleTogglePlayer(player.id)}
                  disabled={isDisabled as boolean}
                  id={`player-${player.id}`}
                />
                <Label
                  htmlFor={`player-${player.id}`}
                  className={cn(
                    "flex-1 cursor-pointer",
                    isDisabled && "cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-sm text-muted-foreground">
                      总评: {player.skills.overall}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    位置: {player.position}
                  </div>
                </Label>
              </div>
            );
          })
        )}
      </div>

      {/* 达到最大选择数提示 */}
      {maxSelect && selectedIds.length >= maxSelect && (
        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          已达到最大选择数量 ({maxSelect} 人)
        </div>
      )}
    </div>
  );
}

export default PlayerSelection;
