import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { POSITION_DETAILS } from '../../types/basketball';
import type { BasketballPosition, BasketballSkills } from '../../types/basketball';
import { SkillRadarChart } from '../SkillRadarChart';

interface PlayerDetailDialogProps {
  open: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    position: BasketballPosition;
    skills: BasketballSkills;
    phone?: string;
    level?: string;
    attendCount?: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    matches?: MatchRecord[];
  } | null;
  onEdit?: () => void;
}

interface MatchRecord {
  id: string;
  date: string;
  venue: string;
  group: string;
  performance: number;
  notes?: string;
}

export function PlayerDetailDialog({ 
  open, 
  onClose, 
  player,
  onEdit 
}: PlayerDetailDialogProps) {
  if (!player) return null;

  const positionDetails = POSITION_DETAILS[player.position];

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return '-';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid="player-detail-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{positionDetails.icon}</span>
            <span>球员详情 - {player.name}</span>
            <Badge variant="outline" style={{ color: positionDetails.color }}>
              {positionDetails.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">概览</TabsTrigger>
            <TabsTrigger value="skills" data-testid="tab-skills">技能</TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">比赛记录</TabsTrigger>
          </TabsList>

          {/* 概览 Tab */}
          <TabsContent value="overview" className="mt-4" data-testid="tab-content-overview">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="姓名" value={player.name} />
              <InfoItem label="手机号" value={player.phone || '-'} />
              <InfoItem label="等级" value={player.level || '-'} />
              <InfoItem label="位置" value={positionDetails.name} />
              <InfoItem label="参加次数" value={player.attendCount?.toString() || '0'} />
              <InfoItem label="总体评分" value={player.skills.overall.toString()} />
              <InfoItem label="创建时间" value={formatDate(player.createdAt)} />
              <InfoItem label="最后更新" value={formatDate(player.updatedAt)} />
            </div>

            {onEdit && (
              <div className="mt-6 flex justify-end">
                <Button onClick={onEdit} data-testid="edit-player-btn">
                  编辑信息
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 技能 Tab */}
          <TabsContent value="skills" className="mt-4" data-testid="tab-content-skills">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4">技能雷达图</h3>
                <SkillRadarChart 
                  skills={player.skills} 
                  position={player.position} 
                />
              </div>

              <div>
                <h3 className="font-medium mb-4">技能详情</h3>
                <div className="space-y-3">
                  <SkillBar label="两分投篮" value={player.skills.twoPointShot} />
                  <SkillBar label="三分投篮" value={player.skills.threePointShot} />
                  <SkillBar label="传球" value={player.skills.passing} />
                  <SkillBar label="控球" value={player.skills.ballControl} />
                  <SkillBar label="外线防守" value={player.skills.perimeterDefense} />
                  <SkillBar label="篮板" value={Math.round((player.skills.offensiveRebound + player.skills.defensiveRebound) / 2)} />
                  <SkillBar label="速度" value={player.skills.speed} />
                  <SkillBar label="耐力" value={player.skills.stamina} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 比赛记录 Tab */}
          <TabsContent value="matches" className="mt-4" data-testid="tab-content-matches">
            {player.matches && player.matches.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">比赛记录 ({player.matches.length} 场)</h3>
                  <Button variant="outline" size="sm" data-testid="add-match-btn">
                    + 添加记录
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left">日期</th>
                        <th className="px-4 py-2 text-left">场地</th>
                        <th className="px-4 py-2 text-left">分组</th>
                        <th className="px-4 py-2 text-left">表现</th>
                        <th className="px-4 py-2 text-left">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {player.matches.map((match) => (
                        <tr key={match.id} className="border-t">
                          <td className="px-4 py-2">{match.date}</td>
                          <td className="px-4 py-2">{match.venue}</td>
                          <td className="px-4 py-2">{match.group}</td>
                          <td className="px-4 py-2">
                            {'⭐'.repeat(Math.min(match.performance, 5))}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {match.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12" data-testid="no-matches">
                <span className="text-4xl mb-4 block">📋</span>
                <p className="text-muted-foreground">还没有比赛记录</p>
                <Button variant="outline" size="sm" className="mt-4">
                  + 添加记录
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 辅助组件
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}
