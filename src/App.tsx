import { useState, useEffect, useCallback } from 'react';
import type { Player, Team, GroupingConfig, BasketballSkills } from './types';
import { 
  BasketballPosition, 
  POSITION_DETAILS, 
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

// SAP Fiori components
import { ShellBar } from './components/ShellBar';
import { PlayerFormDialog } from './components/PlayerFormDialog';

// 新增数据管理组件
import { Toaster } from './components/ui/toaster';
import { ImportWizard } from './components/import/ImportWizard';
import { PlayerDetailDialog } from './components/dialogs/PlayerDetailDialog';
import { toastSuccess, toastInfo } from './lib/toast';

// Phase 2: 新组件
import { TabNavigation } from './components/TabNavigation';
import { PlayerSelection } from './components/PlayerSelection';
import { DragDropGrouping } from './components/DragDropGrouping';

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [showGrouping, setShowGrouping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 新增：数据管理相关状态
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState<'players' | 'games'>('players');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Phase 3: Tab 导航和分组相关状态
  const [activeTab, setActiveTab] = useState('players');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [groupingTeams, setGroupingTeams] = useState<Team[]>([]);
  const [undoStack, setUndoStack] = useState<Team[][]>([]);

  // Tab 配置
  const tabs = [
    { id: 'players', label: '球员管理', icon: '👥' },
    { id: 'grouping', label: '分组', icon: '🎯' },
    { id: 'games', label: '比赛记录', icon: '📊' },
  ];

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
  const handleAddPlayer = async (data: { name: string; position: BasketballPosition; skills: BasketballSkills }) => {
    try {
      // 计算总体能力
      const overall = calculateOverallSkill(data.skills, data.position);
      const playerSkills = { ...data.skills, overall };

      const newPlayer = await playerRepository.create({
        name: data.name,
        position: data.position,
        skills: playerSkills,
      });

      setPlayers([...players, newPlayer]);
      setIsFormOpen(false);
      console.log(`✅ 添加球员成功: ${newPlayer.name}`);
    } catch (err) {
      console.error('❌ 添加球员失败:', err);
      alert('添加球员失败，请重试');
    }
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

  // 新增：批量导入球员处理函数
  const handleBatchImport = useCallback(async (data: Array<{
    name?: string;
    position?: BasketballPosition;
    skills?: Partial<BasketballSkills>;
    [key: string]: unknown;
  }>) => {
    try {
      let success = 0;
      let failed = 0;

      for (const item of data) {
        try {
          if (!item.name || !item.position) {
            failed++;
            continue;
          }

          const skills: BasketballSkills = {
            twoPointShot: 50,
            threePointShot: 50,
            freeThrow: 50,
            passing: 50,
            ballControl: 50,
            courtVision: 50,
            perimeterDefense: 50,
            interiorDefense: 50,
            steals: 50,
            blocks: 50,
            offensiveRebound: 50,
            defensiveRebound: 50,
            speed: 50,
            strength: 50,
            stamina: 50,
            vertical: 50,
            basketballIQ: 50,
            teamwork: 50,
            clutch: 50,
            overall: 50,
            ...item.skills,
          };

          await playerRepository.create({
            name: item.name,
            position: item.position,
            skills,
          });
          success++;
        } catch {
          failed++;
        }
      }

      // 重新加载球员列表
      await loadPlayers();
      
      return { success, failed };
    } catch (error) {
      console.error('导入失败:', error);
      throw error;
    }
  }, [loadPlayers]);

  // 新增：打开导入弹窗
  const handleOpenImportPlayers = useCallback(() => {
    setImportType('players');
    setIsImportOpen(true);
  }, []);

  const handleOpenImportGames = useCallback(() => {
    setImportType('games');
    setIsImportOpen(true);
  }, []);

  // 新增：导出数据
  const handleExportData = useCallback(() => {
    Storage.exportPlayers(players);
    toastSuccess(`成功导出 ${players.length} 名球员数据`);
  }, [players]);

  // 新增：编辑球员（从详情页）
  const handleEditFromDetail = useCallback(() => {
    setIsDetailOpen(false);
    // 这里可以打开编辑弹窗
    toastInfo('编辑功能开发中...');
  }, []);

  // 新增：查看球员详情（目前未连接到UI，保留以备后用）
  // @ts-ignore - 功能保留以备后用
  const _unusedOpenPlayerDetail = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setIsDetailOpen(true);
  }, []);

  // Phase 3: 新的分组功能
  // 基于选中的球员进行随机分组
  const handleNewGrouping = useCallback(() => {
    const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));
    
    if (selectedPlayers.length < teamCount) {
      toastInfo('选择的球员数量不足以分组');
      return;
    }

    const config: GroupingConfig = {
      teamCount,
      strategy: 'balanced',
    };

    const result = GroupingAlgorithm.groupPlayers(selectedPlayers, config);
    
    // 保存当前状态到撤销栈
    setUndoStack(prev => [...prev, groupingTeams]);
    setGroupingTeams(result);
  }, [players, selectedPlayerIds, teamCount, groupingTeams]);

  // 球员移动（拖拽）
  const handlePlayerMove = useCallback((playerId: string, toTeamId: string) => {
    setUndoStack(prev => [...prev, groupingTeams]);
    
    setGroupingTeams(prevTeams => {
      const newTeams = prevTeams.map(team => ({
        ...team,
        players: [...team.players]
      }));

      // 找到球员所在的队伍并移除
      let movedPlayer: Player | undefined;
      for (const team of newTeams) {
        const playerIndex = team.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
          movedPlayer = team.players.splice(playerIndex, 1)[0];
          break;
        }
      }

      // 添加到目标队伍
      if (movedPlayer) {
        const targetTeam = newTeams.find(t => t.id === toTeamId);
        if (targetTeam) {
          targetTeam.players.push(movedPlayer);
        }
      }

      // 重新计算每个队伍的总战力
      return newTeams.map(team => ({
        ...team,
        totalSkill: team.players.reduce((sum, p) => sum + p.skills.overall, 0)
      }));
    });
  }, [groupingTeams]);

  // 撤销操作
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setGroupingTeams(previousState);
    }
  }, [undoStack]);

  // 计算平衡度
  const groupingBalance = groupingTeams.length > 0 
    ? GroupingAlgorithm.calculateBalance(groupingTeams) 
    : 0;

  // 过滤球员（搜索）
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    POSITION_DETAILS[player.position].name.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background pt-12">
      <ShellBar 
        onOpenImportPlayers={handleOpenImportPlayers}
        onOpenImportGames={handleOpenImportGames}
        onOpenExport={handleExportData}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 加载状态 */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full animate-spin" />
                <p className="text-muted-foreground">⏳ 加载球员数据中...</p>
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

        {/* Tab 导航 */}
        {!loading && !error && (
          <div className="mb-6">
            <TabNavigation 
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              persistKey="player-grouping-active-tab"
            />
          </div>
        )}

        {/* Tab 1: 球员管理 */}
        {activeTab === 'players' && !loading && (
          <>
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* 搜索和筛选 */}
              <div className="flex items-center gap-3">
                <Input 
                  placeholder="搜索球员..." 
                  className="w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="search-input"
                />
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  data-testid="export-button"
                >
                  导出
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid="import-button"
                >
                  <label className="cursor-pointer">
                    导入
                    <input type="file" accept=".json" onChange={handleImport} hidden />
                  </label>
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setIsFormOpen(true)}
                  data-testid="add-player-button"
                >
                  添加球员
                </Button>
              </div>
            </div>
            
            {/* Player Cards Grid */}
            {filteredPlayers.length > 0 && (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6"
                data-testid="player-grid"
              >
                {filteredPlayers.map(player => (
                  <Card 
                    key={player.id}
                    className="hover:shadow-lg transition-shadow bg-card group"
                    data-testid="player-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
                            {player.name[0]}
                          </div>
                          <div>
                            <CardTitle className="text-base">{player.name}</CardTitle>
                            <Badge 
                              variant="secondary" 
                              className="mt-1"
                              style={{
                                backgroundColor: `${POSITION_DETAILS[player.position].color}20`,
                                color: POSITION_DETAILS[player.position].color
                              }}
                            >
                              {POSITION_DETAILS[player.position].icon} {POSITION_DETAILS[player.position].name}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              data-testid={`player-card-menu-${player.id}`}
                            >
                              ⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedPlayer(player);
                                setIsDetailOpen(true);
                              }}
                            >
                              👁️ 查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedPlayer(player);
                                setIsDetailOpen(true);
                                // TODO: 添加快速编辑模式
                                toastInfo('快速编辑功能开发中...');
                              }}
                            >
                              ✏️ 快速编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-destructive"
                            >
                              🗑️ 删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* KPI */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary">
                            {player.skills.overall}
                          </div>
                          <div className="text-xs text-muted-foreground">总体能力</div>
                        </div>
                      </div>
                      
                      {/* 技能条 */}
                      <div className="space-y-2">
                        <SkillBar 
                          label="投篮" 
                          value={Math.round((player.skills.twoPointShot + player.skills.threePointShot + player.skills.freeThrow) / 3)} 
                        />
                        <SkillBar 
                          label="组织" 
                          value={Math.round((player.skills.passing + player.skills.ballControl + player.skills.courtVision) / 3)} 
                        />
                        <SkillBar 
                          label="防守" 
                          value={Math.round((player.skills.perimeterDefense + player.skills.interiorDefense) / 2)} 
                        />
                        <SkillBar 
                          label="篮板" 
                          value={Math.round((player.skills.offensiveRebound + player.skills.defensiveRebound) / 2)} 
                        />
                        <SkillBar 
                          label="身体素质" 
                          value={Math.round((player.skills.speed + player.skills.strength + player.skills.stamina + player.skills.vertical) / 4)} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredPlayers.length === 0 && (
              <Card className="mb-6">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground text-lg">
                    {searchQuery ? '没有找到匹配的球员' : '暂无球员，请先添加球员'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsFormOpen(true)}
                    >
                      添加第一名球员
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Legacy Grouping Section (保留向后兼容) */}
            {players.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>快速分组（简易版）</CardTitle>
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

            {/* Legacy Grouping Results */}
            {showGrouping && teams.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>分组结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                    {teams.map((team) => (
                      <Card 
                        key={team.id}
                        className="bg-gradient-to-br from-primary to-accent text-white shadow-lg"
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
                  <div className="text-center bg-muted rounded-lg p-4">
                    <p className="text-foreground text-lg">
                      平衡度: <strong className="text-primary">{GroupingAlgorithm.calculateBalance(teams).toFixed(2)}</strong>
                      <span className="text-sm text-muted-foreground ml-2">(越小越平衡)</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Tab 2: 分组（新功能） */}
        {activeTab === 'grouping' && !loading && (
          <>
            {/* 分组设置 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>分组设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="newTeamCount">团队数量：</Label>
                    <Input
                      id="newTeamCount"
                      type="number"
                      min="2"
                      max={Math.floor(players.length / 2)}
                      value={teamCount}
                      onChange={(e) => setTeamCount(parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <Button 
                    onClick={handleNewGrouping}
                    disabled={selectedPlayerIds.length < teamCount}
                    data-testid="new-grouping-button"
                  >
                    🎲 随机分组
                  </Button>
                </div>
                
                {selectedPlayerIds.length < teamCount && (
                  <p className="text-sm text-muted-foreground">
                    请至少选择 {teamCount} 名球员（当前已选 {selectedPlayerIds.length} 名）
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 球员选择 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>选择参与分组的球员</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelection 
                  players={players}
                  selectedIds={selectedPlayerIds}
                  onSelect={setSelectedPlayerIds}
                  maxSelect={teamCount * 10} // 限制最多选择
                />
              </CardContent>
            </Card>

            {/* 拖拽分组结果 */}
            {groupingTeams.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>分组结果（可拖拽调整）</CardTitle>
                </CardHeader>
                <CardContent>
                  <DragDropGrouping 
                    teams={groupingTeams}
                    balance={100 - groupingBalance} // 转换为百分比（越高越好）
                    onPlayerMove={handlePlayerMove}
                    onUndo={handleUndo}
                    canUndo={undoStack.length > 0}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Tab 3: 比赛记录（占位） */}
        {activeTab === 'games' && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">
                📊 比赛记录功能开发中...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                敬请期待
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* Dialog Form */}
      <PlayerFormDialog 
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddPlayer}
      />

      {/* Import Wizard */}
      <ImportWizard
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type={importType}
        onImport={handleBatchImport}
      />

      {/* Player Detail Dialog */}
      <PlayerDetailDialog
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        player={selectedPlayer}
        onEdit={handleEditFromDetail}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

// 简单的技能条组件
function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="font-medium w-8">{value}</span>
      </div>
    </div>
  );
}

export default App;
