import { useState, useEffect } from 'react';
import type { Player, Team, GroupingConfig, PlayerPosition } from './types/player';
import { calculateOverallSkill, POSITION_NAMES } from './types/player';
import { GroupingAlgorithm } from './utils/groupingAlgorithm';
import { Storage } from './utils/storage';
import './App.css';

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [showGrouping, setShowGrouping] = useState(false);

  // 表单状态
  const [playerName, setPlayerName] = useState('');
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>('MID');
  const [skills, setSkills] = useState({
    speed: 5,
    shooting: 5,
    passing: 5,
    defense: 5,
    physical: 5,
  });

  // 加载本地存储的球员数据
  useEffect(() => {
    const savedPlayers = Storage.loadPlayers();
    setPlayers(savedPlayers);
  }, []);

  // 保存球员数据到本地存储
  useEffect(() => {
    if (players.length > 0) {
      Storage.savePlayers(players);
    }
  }, [players]);

  // 添加球员
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert('请输入球员姓名');
      return;
    }

    const playerSkills = {
      ...skills,
      overall: 0,
    };
    playerSkills.overall = calculateOverallSkill(playerSkills);

    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: playerName,
      position: playerPosition,
      skills: playerSkills,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setPlayers([...players, newPlayer]);
    resetForm();
  };

  // 重置表单
  const resetForm = () => {
    setPlayerName('');
    setPlayerPosition('MID');
    setSkills({
      speed: 5,
      shooting: 5,
      passing: 5,
      defense: 5,
      physical: 5,
    });
  };

  // 删除球员
  const handleDeletePlayer = (id: string) => {
    if (confirm('确定要删除这名球员吗？')) {
      setPlayers(players.filter((p) => p.id !== id));
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

  return (
    <div className="app">
      <header className="header">
        <h1>⚽ 球员分组程序</h1>
        <p>智能分配球员到平衡的团队</p>
      </header>

      <main className="main">
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
                  onChange={(e) => setPlayerPosition(e.target.value as PlayerPosition)}
                >
                  {Object.entries(POSITION_NAMES).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="skills-grid">
              {Object.entries(skills).map(([skill, value]) => (
                <label key={skill}>
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}:
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(e) =>
                      setSkills({ ...skills, [skill]: parseInt(e.target.value) })
                    }
                  />
                  <span>{value}</span>
                </label>
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
          </div>
          {players.length === 0 ? (
            <p className="empty-message">暂无球员，请先添加球员</p>
          ) : (
            <div className="player-list">
              {players.map((player) => (
                <div key={player.id} className="player-card">
                  <div className="player-header">
                    <h3>{player.name}</h3>
                    <span className="position-badge">
                      {POSITION_NAMES[player.position]}
                    </span>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="btn-delete"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="player-skills">
                    <div className="skill-item">
                      <span>总体能力</span>
                      <strong>{player.skills.overall}</strong>
                    </div>
                    <div className="skill-item">
                      <span>速度</span>
                      <span>{player.skills.speed}</span>
                    </div>
                    <div className="skill-item">
                      <span>射门</span>
                      <span>{player.skills.shooting}</span>
                    </div>
                    <div className="skill-item">
                      <span>传球</span>
                      <span>{player.skills.passing}</span>
                    </div>
                    <div className="skill-item">
                      <span>防守</span>
                      <span>{player.skills.defense}</span>
                    </div>
                    <div className="skill-item">
                      <span>身体</span>
                      <span>{player.skills.physical}</span>
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
                        <span className="player-position">
                          {POSITION_NAMES[player.position]}
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
