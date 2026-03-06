import { useState, useEffect } from 'react';
import type { Player, Team, GroupingConfig } from './types';
import { 
  BasketballPosition, 
  POSITION_DETAILS, 
  createDefaultBasketballSkills,
  calculateOverallSkill 
} from './types';
import { GroupingAlgorithm } from './utils/groupingAlgorithm';
import { Storage } from './utils/storage';
import { playerRepository } from './repositories';

// shadcn/ui components
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Skeleton } from './components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './components/ui/select';

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [showGrouping, setShowGrouping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [playerName, setPlayerName] = useState('');
  const [playerPosition, setPlayerPosition] = useState<BasketballPosition>(BasketballPosition.PG);
  const [skills, setSkills] = useState(createDefaultBasketballSkills());

  // 加载球员数据（从 Supabase）
  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await playerRepository.findAll();
      setPlayers(data);
      console.log(`✅ 加载了 ${data.length} 名球员`);
    } catch (err) {
      console.error('❌ 加载球员失败:', err);
      setError('加载球员数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 添加球员
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert('请输入球员姓名');
      return;
    }

    try {
      // 计算总体能力
      const overall = calculateOverallSkill(skills, playerPosition);
      const playerSkills = { ...skills, overall };

      const newPlayer = await playerRepository.create({
        name: playerName,
        position: playerPosition,
        skills: playerSkills,
      });

      setPlayers([...players, newPlayer]);
      resetForm();
      console.log(`✅ 添加球员成功: ${newPlayer.name}`);
    } catch (err) {
      console.error('❌ 添加球员失败:', err);
      alert('添加球员失败，请重试');
    }
  };

  // 重置表单
  const resetForm = () => {
    setPlayerName('');
    setPlayerPosition(BasketballPosition.PG);
    setSkills(createDefaultBasketballSkills());
  };

  // 删除球员
  const handleDeletePlayer = async (id: string) => {
    if (!confirm('确定要删除这名球员吗？')) return;

    try {
      await playerRepository.delete(id);
      setPlayers(players.filter((p) => p.id !== id));
      console.log(`✅ 删除球员成功`);
    } catch (err) {
      console.error('❌ 删除球员失败:', err);
      alert('删除球员失败，请重试');
    }
  };

  // 执行分组
  const handleGrouping = () => {
    if (players.length < teamCount) {
      alert('球员数量不足以分组');
      return;
    }

    const config: GroupingConfig = {
      teamCount,
      strategy: 'balanced',
    };

    const result = GroupingAlgorithm.groupPlayers(players, config);
    setTeams(result);
    setShowGrouping(true);
  };

  // 重新分组
  const handleRegroup = () => {
    handleGrouping();
  };

  // 导出球员数据
  const handleExport = () => {
    Storage.exportPlayers(players);
  };

  // 导入球员数据
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedPlayers = await Storage.importPlayers(file);
      setPlayers([...players, ...importedPlayers]);
      alert(`成功导入 ${importedPlayers.length} 名球员`);
    } catch (error) {
      alert('导入失败，请确保文件格式正确');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 to-purple-600">
      {/* Header */}
      <header 
        className="bg-white/95 backdrop-blur-sm shadow-md py-8 px-4 text-center"
        data-testid="app-header"
      >
        <h1 className="text-4xl font-bold text-slate-800 mb-2">🏀 篮球球员分组程序</h1>
        <p className="text-slate-600 text-lg">智能分配球员到平衡的团队</p>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* 加载状态 */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full animate-spin" />
                <p className="text-slate-600">⏳ 加载球员数据中...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="flex items-center justify-between">
              <span>❌ {error}</span>
              <Button variant="outline" size="sm" onClick={loadPlayers}>
                重试
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 添加球员表单 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800 border-b-2 border-violet-500 pb-2">
              添加球员
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlayer} className="space-y-6" data-testid="player-form">
              {/* 姓名和位置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName">姓名</Label>
                  <Input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="输入球员姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">位置</Label>
                  <Select
                    value={playerPosition}
                    onValueChange={(value) => setPlayerPosition(value as BasketballPosition)}
                  >
                    <SelectTrigger id="position">
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
                <h3 className="text-lg font-medium text-slate-700">能力评分 (1-99)</h3>
                {Object.entries(skillCategories).map(([category, skillKeys]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-600">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {skillKeys.map((skillKey) => (
                        <div key={skillKey} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">{skillNames[skillKey]}</span>
                            <span className="font-semibold text-violet-600">
                              {skills[skillKey as keyof typeof skills]}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="99"
                            value={skills[skillKey as keyof typeof skills] as number}
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

              <Button type="submit" className="w-full md:w-auto">
                添加球员
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 球员列表 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl text-slate-800 border-b-2 border-violet-500 pb-2">
                球员列表 ({players.length})
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  导出数据
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    导入数据
                    <input type="file" accept=".json" onChange={handleImport} hidden />
                  </label>
                </Button>
                <Button variant="outline" size="sm" onClick={loadPlayers}>
                  刷新数据
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!loading && players.length === 0 ? (
              <p className="text-center text-slate-400 text-lg py-8">暂无球员，请先添加球员</p>
            ) : (
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                data-testid="player-list"
              >
                {players.map((player) => (
                  <Card 
                    key={player.id} 
                    className="bg-slate-50 shadow-sm hover:shadow-md transition-shadow"
                    data-testid="player-card"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-slate-800">{player.name}</h3>
                        <Badge
                          variant="outline"
                          className="border-2"
                          style={{ 
                            backgroundColor: `${POSITION_DETAILS[player.position].color}20`,
                            borderColor: POSITION_DETAILS[player.position].color,
                            color: POSITION_DETAILS[player.position].color
                          }}
                        >
                          {POSITION_DETAILS[player.position].icon} {POSITION_DETAILS[player.position].name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeletePlayer(player.id)}
                        >
                          ✕
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">总体能力</span>
                          <strong className="text-violet-600">{player.skills.overall}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">投篮</span>
                          <span className="text-slate-700">{Math.round((player.skills.twoPointShot + player.skills.threePointShot + player.skills.freeThrow) / 3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">组织</span>
                          <span className="text-slate-700">{Math.round((player.skills.passing + player.skills.ballControl + player.skills.courtVision) / 3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">防守</span>
                          <span className="text-slate-700">{Math.round((player.skills.perimeterDefense + player.skills.interiorDefense) / 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">篮板</span>
                          <span className="text-slate-700">{Math.round((player.skills.offensiveRebound + player.skills.defensiveRebound) / 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">身体素质</span>
                          <span className="text-slate-700">{Math.round((player.skills.speed + player.skills.strength + player.skills.stamina + player.skills.vertical) / 4)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分组设置 */}
        {players.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-slate-800 border-b-2 border-violet-500 pb-2">
                分组设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="teamCount">团队数量：</Label>
                  <Input
                    id="teamCount"
                    type="number"
                    min="2"
                    max={Math.floor(players.length / 2)}
                    value={teamCount}
                    onChange={(e) => setTeamCount(parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
                <Button 
                  onClick={handleGrouping}
                  data-testid="grouping-button"
                >
                  开始分组
                </Button>
                {showGrouping && (
                  <Button variant="outline" onClick={handleRegroup}>
                    重新分组
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分组结果 */}
        {showGrouping && teams.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-slate-800 border-b-2 border-violet-500 pb-2">
                分组结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                {teams.map((team) => (
                  <Card 
                    key={team.id}
                    className="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/30">
                        <h3 className="font-semibold text-lg">{team.name}</h3>
                        <Badge className="bg-white/20 text-white border-0">
                          总能力: {team.totalSkill}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {team.players.map((player) => (
                          <div 
                            key={player.id}
                            className="flex justify-between items-center bg-white/15 rounded-md px-3 py-2 text-sm"
                          >
                            <span className="font-medium">{player.name}</span>
                            <div className="flex items-center gap-2">
                              <span 
                                className="bg-white/30 px-2 py-0.5 rounded-full text-xs"
                                style={{ color: POSITION_DETAILS[player.position].color }}
                              >
                                {POSITION_DETAILS[player.position].icon} {POSITION_DETAILS[player.position].name}
                              </span>
                              <span className="font-semibold">{player.skills.overall}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="text-center bg-slate-100 rounded-lg p-4">
                <p className="text-slate-600 text-lg">
                  平衡度: <strong className="text-violet-600">{GroupingAlgorithm.calculateBalance(teams).toFixed(2)}</strong>
                  <span className="text-sm text-slate-500 ml-2">(越小越平衡)</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default App;
