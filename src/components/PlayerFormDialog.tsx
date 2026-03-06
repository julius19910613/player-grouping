import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import type { BasketballSkills } from '../types';
import { BasketballPosition, POSITION_DETAILS, createDefaultBasketballSkills } from '../types';

interface PlayerFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; position: BasketballPosition; skills: BasketballSkills }) => void;
}

// 技能分类
const skillCategories = {
  '投篮': ['twoPointShot', 'threePointShot', 'freeThrow'],
  '组织': ['passing', 'ballControl', 'courtVision'],
  '防守': ['perimeterDefense', 'interiorDefense', 'steals', 'blocks'],
  '篮板': ['offensiveRebound', 'defensiveRebound'],
  '身体素质': ['speed', 'strength', 'stamina', 'vertical'],
  '篮球智商': ['basketballIQ', 'teamwork', 'clutch']
};

// 技能中文映射
const skillNames: Record<string, string> = {
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

export function PlayerFormDialog({ open, onClose, onSubmit }: PlayerFormDialogProps) {
  const [playerName, setPlayerName] = useState('');
  const [playerPosition, setPlayerPosition] = useState<BasketballPosition>(BasketballPosition.PG);
  const [skills, setSkills] = useState<BasketballSkills>(createDefaultBasketballSkills());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('请输入球员姓名');
      return;
    }
    onSubmit({ name: playerName, position: playerPosition, skills });
    // Reset form
    setPlayerName('');
    setPlayerPosition(BasketballPosition.PG);
    setSkills(createDefaultBasketballSkills());
  };

  const handleClose = () => {
    setPlayerName('');
    setPlayerPosition(BasketballPosition.PG);
    setSkills(createDefaultBasketballSkills());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="player-form-dialog">
        <DialogHeader>
          <DialogTitle>添加球员</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 姓名和位置 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">姓名</Label>
              <Input 
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="输入球员姓名"
                data-testid="player-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">位置</Label>
              <Select
                value={playerPosition}
                onValueChange={(value) => setPlayerPosition(value as BasketballPosition)}
              >
                <SelectTrigger id="position" data-testid="player-position-select">
                  <SelectValue placeholder="选择位置" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_DETAILS).map(([key, detail]) => (
                    <SelectItem key={key} value={key}>
                      {detail.icon} {detail.name} ({detail.englishName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 技能评分 */}
          <div className="space-y-4">
            <h3 className="font-semibold">能力评分 (1-99)</h3>
            {Object.entries(skillCategories).map(([category, skillKeys]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {skillKeys.map((skillKey) => (
                    <div key={skillKey} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{skillNames[skillKey]}</span>
                        <span className="font-semibold text-primary">
                          {skills[skillKey as keyof BasketballSkills]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={skills[skillKey as keyof BasketballSkills] as number}
                        onChange={(e) =>
                          setSkills({ ...skills, [skillKey]: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose}>取消</Button>
            <Button type="submit" data-testid="submit-player-button">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
