import { useState } from 'react';
import type { Team, Player } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { GripVertical, Undo2, Users } from 'lucide-react';

export interface DragDropGroupingProps {
  teams: Team[];
  balance: number;
  onPlayerMove: (playerId: string, toTeamId: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  className?: string;
}

export function DragDropGrouping({ 
  teams, 
  balance, 
  onPlayerMove, 
  onUndo,
  canUndo = false,
  className 
}: DragDropGroupingProps) {
  const [draggedPlayer, setDraggedPlayer] = useState<{ player: Player; fromTeamId: string } | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);

  // 开始拖拽
  const handleDragStart = (e: React.DragEvent, player: Player, fromTeamId: string) => {
    setDraggedPlayer({ player, fromTeamId });
    // 安全检查 dataTransfer（测试环境可能没有）
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
    // 设置拖拽图像
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  // 拖拽结束
  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedPlayer(null);
    setDragOverTeamId(null);
  };

  // 拖拽经过队伍
  const handleDragOver = (e: React.DragEvent, teamId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTeamId(teamId);
  };

  // 拖拽离开队伍
  const handleDragLeave = () => {
    setDragOverTeamId(null);
  };

  // 放下球员
  const handleDrop = (e: React.DragEvent, toTeamId: string) => {
    e.preventDefault();
    
    if (draggedPlayer && draggedPlayer.fromTeamId !== toTeamId) {
      onPlayerMove(draggedPlayer.player.id, toTeamId);
    }
    
    setDraggedPlayer(null);
    setDragOverTeamId(null);
  };

  // 计算平衡度状态
  const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
    if (balance >= 90) return 'default';
    if (balance >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={getBalanceVariant(balance)} className="text-base px-4 py-2">
            平衡度: {balance.toFixed(1)}%
          </Badge>
          <Progress value={balance} className="w-32" />
        </div>

        {onUndo && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-2"
          >
            <Undo2 className="h-4 w-4" />
            撤销
          </Button>
        )}
      </div>

      {/* 提示信息 */}
      {draggedPlayer && (
        <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          正在拖拽: {draggedPlayer.player.name} - 请拖到目标队伍
        </div>
      )}

      {/* 队伍网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => {
          const isDragOver = dragOverTeamId === team.id;
          
          return (
            <Card
              key={team.id}
              className={cn(
                "transition-all",
                isDragOver && "ring-2 ring-primary border-primary"
              )}
              onDragOver={(e) => handleDragOver(e, team.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, team.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {team.name}
                  </div>
                  <Badge variant="outline">
                    战力: {team.totalSkill}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {team.players.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    拖拽球员到此处
                  </div>
                ) : (
                  <div className="space-y-2">
                    {team.players.map((player) => {
                      const isDragging = draggedPlayer?.player.id === player.id;
                      
                      return (
                        <div
                          key={player.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player, team.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "flex items-center gap-3 p-3 bg-secondary/50 rounded-lg cursor-move transition-all hover:bg-secondary",
                            isDragging && "opacity-50"
                          )}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{player.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {player.position} · 总评 {player.skills.overall}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isDragOver && team.players.length > 0 && (
                  <div className="mt-2 p-3 border-2 border-dashed border-primary rounded-lg text-center text-sm text-primary">
                    放开以添加球员
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 平衡度说明 */}
      <div className="text-xs text-muted-foreground text-center">
        平衡度基于各队伍总战力差异计算。数值越高表示队伍越均衡。
      </div>
    </div>
  );
}

export default DragDropGrouping;
