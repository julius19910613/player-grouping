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
import './App.css';

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
    <div className="app">
      <header className="header">
        <h1>🏀 篮球球员分组程序</h1>
        <p>智能分配球员到平衡的团队</p>
      </header>

      <main className="main">
        {/* 加载状态 */}
        {loading && (
          <div className="loading">
            <p>⏳ 加载球员数据中...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="error">
            <p>❌ {error}</p>
            <button onClick={loadPlayers}>重试</button>
          </div>
        )}

        {/* 添加球员表单 */}
        <section className="section">
          <h2>添加球员</h2>
          <form onSubmit={handleAddPlayer} className="player-form">
            <div className="form-row">
              <label>
                姓名：
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="输入球员姓名"
                />
              </label>
              <label>
                位置：
                <select
                  value={playerPosition}
                  onChange={(e) => setPlayerPosition(e.target.value as BasketballPosition)}
                >
                  {Object.entries(POSITION_DETAILS).map(([key, detail]) => (
                    <option key={key} value={key}>
                      {detail.icon} {detail.name} ({detail.englishName})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="skills-section">
              <h3>能力评分 (1-99)</h3>
              {Object.entries(skillCategories).map(([category, skillKeys]) => (
                <div key={category} className="skill-category">
                  <h4>{category}</h4>
                  <div className="skills-grid">
                    {skillKeys.map((skillKey) => (
                      <label key={skillKey}>
                        {skillNames[skillKey]}:
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={skills[skillKey as keyof typeof skills] as number}
                          onChange={(e) =>
                            setSkills({ ...skills, [skillKey]: parseInt(e.target.value) })
                          }
                        />
                        <span>{skills[skillKey as keyof typeof skills]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="btn btn-primary">
              添加球员
            </button>
          </form>
        </section>

        {/* 球员列表 */}
        <section className="section">
          <h2>球员列表 ({players.length})</h2>
          <div className="player-actions">
            <button onClick={handleExport} className="btn">
              导出数据
            </button>
            <label className="btn">
              导入数据
              <input type="file" accept=".json" onChange={handleImport} hidden />
            </label>
            <button onClick={loadPlayers} className="btn">
              刷新数据
            </button>
          </div>
          {!loading && players.length === 0 ? (
            <p className="empty-message">暂无球员，请先添加球员</p>
          ) : (
            <div className="player-list">
              {players.map((player) => (
                <div key={player.id} className="player-card">
                  <div className="player-header">
                    <h3>{player.name}</h3>
                    <span 
                      className="position-badge"
                      style={{ 
                        backgroundColor: `${POSITION_DETAILS[player.position].color}20`,
                        borderColor: POSITION_DETAILS[player.position].color
                      }}
                    >
                      {POSITION_DETAILS[player.position].icon} {POSITION_DETAILS[player.position].name}
                    </span>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="btn-delete"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="player-skills">
                    <div className="skill-item overall">
                      <span>总体能力</span>
                      <strong>{player.skills.overall}</strong>
                    </div>
                    <div className="skill-item">
                      <span>投篮</span>
                      <span>{Math.round((player.skills.twoPointShot + player.skills.threePointShot + player.skills.freeThrow) / 3)}</span>
                    </div>
                    <div className="skill-item">
                      <span>组织</span>
                      <span>{Math.round((player.skills.passing + player.skills.ballControl + player.skills.courtVision) / 3)}</span>
                    </div>
                    <div className="skill-item">
                      <span>防守</span>
                      <span>{Math.round((player.skills.perimeterDefense + player.skills.interiorDefense) / 2)}</span>
                    </div>
                    <div className="skill-item">
                      <span>篮板</span>
                      <span>{Math.round((player.skills.offensiveRebound + player.skills.defensiveRebound) / 2)}</span>
                    </div>
                    <div className="skill-item">
                      <span>身体素质</span>
                      <span>{Math.round((player.skills.speed + player.skills.strength + player.skills.stamina + player.skills.vertical) / 4)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 分组设置 */}
        {players.length > 0 && (
          <section className="section">
            <h2>分组设置</h2>
            <div className="grouping-controls">
              <label>
                团队数量：
                <input
                  type="number"
                  min="2"
                  max={Math.floor(players.length / 2)}
                  value={teamCount}
                  onChange={(e) => setTeamCount(parseInt(e.target.value))}
                />
              </label>
              <button onClick={handleGrouping} className="btn btn-primary">
                开始分组
              </button>
              {showGrouping && (
                <button onClick={handleRegroup} className="btn">
                  重新分组
                </button>
              )}
            </div>
          </section>
        )}

        {/* 分组结果 */}
        {showGrouping && teams.length > 0 && (
          <section className="section">
            <h2>分组结果</h2>
            <div className="teams-grid">
              {teams.map((team) => (
                <div key={team.id} className="team-card">
                  <div className="team-header">
                    <h3>{team.name}</h3>
                    <span className="team-skill">总能力: {team.totalSkill}</span>
                  </div>
                  <div className="team-players">
                    {team.players.map((player) => (
                      <div key={player.id} className="team-player">
                        <span className="player-name">{player.name}</span>
                        <span 
                          className="player-position"
                          style={{ color: POSITION_DETAILS[player.position].color }}
                        >
                          {POSITION_DETAILS[player.position].icon} {POSITION_DETAILS[player.position].name}
                        </span>
                        <span className="player-overall">{player.skills.overall}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="balance-info">
              <p>
                平衡度: {GroupingAlgorithm.calculateBalance(teams).toFixed(2)}
                (越小越平衡)
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
