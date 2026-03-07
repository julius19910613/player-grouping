import type { Player, Team } from '../types';
import { GroupingAlgorithm } from './groupingAlgorithm';
import { calculateBalance } from './groupingAlgorithm';

/**
 * 拖拽状态管理
 */
export interface DragDropState {
  teams: Team[];
  selectedPlayers: string[];
  balance: number;
  history: HistoryEntry[];
}

/**
 * 历史记录条目
 */
export interface HistoryEntry {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  timestamp: number;
}

/**
 * 创建初始状态
 */
export function createInitialState(
  players: Player[],
  teamCount: number
): DragDropState {
  // 使用 GroupingAlgorithm 进行初始分组
  const teams = GroupingAlgorithm.groupPlayers(players, {
    teamCount,
    strategy: 'balanced'
  });

  const balance = calculateBalance(teams);

  return {
    teams,
    selectedPlayers: [],
    balance,
    history: []
  };
}

/**
 * 处理球员移动
 */
export function handlePlayerMove(
  state: DragDropState,
  playerId: string,
  toTeamId: string
): DragDropState {
  // 找到球员当前所在队伍
  let fromTeamId: string | undefined;

  for (const team of state.teams) {
    if (team.players.some(p => p.id === playerId)) {
      fromTeamId = team.id;
      break;
    }
  }

  // 如果找不到球员或已经在目标队伍，返回原状态
  if (!fromTeamId || fromTeamId === toTeamId) {
    return state;
  }

  // 创建历史记录
  const historyEntry: HistoryEntry = {
    playerId,
    fromTeamId,
    toTeamId,
    timestamp: Date.now()
  };

  // 执行移动
  const newTeams = state.teams.map(team => ({
    ...team,
    players: [...team.players],
    totalSkill: team.totalSkill
  }));

  // 找到球员
  let player: Player | undefined;
  let fromTeamIndex = -1;
  let toTeamIndex = -1;

  for (let i = 0; i < newTeams.length; i++) {
    if (newTeams[i].id === fromTeamId) {
      fromTeamIndex = i;
      player = newTeams[i].players.find(p => p.id === playerId);
    }
    if (newTeams[i].id === toTeamId) {
      toTeamIndex = i;
    }
  }

  if (!player || fromTeamIndex === -1 || toTeamIndex === -1) {
    return state;
  }

  // 从源队伍移除球员
  newTeams[fromTeamIndex].players = newTeams[fromTeamIndex].players.filter(
    p => p.id !== playerId
  );
  newTeams[fromTeamIndex].totalSkill = newTeams[fromTeamIndex].players.reduce(
    (sum, p) => sum + p.skills.overall,
    0
  );

  // 添加到目标队伍
  newTeams[toTeamIndex].players.push(player);
  newTeams[toTeamIndex].totalSkill = newTeams[toTeamIndex].players.reduce(
    (sum, p) => sum + p.skills.overall,
    0
  );

  const balance = calculateBalance(newTeams);

  return {
    teams: newTeams,
    selectedPlayers: state.selectedPlayers,
    balance,
    history: [...state.history, historyEntry]
  };
}

/**
 * 撤销上一步操作
 */
export function undoLastMove(state: DragDropState): DragDropState {
  // 如果没有历史记录，返回原状态
  if (state.history.length === 0) {
    return state;
  }

  // 获取最后一条历史记录
  const lastEntry = state.history[state.history.length - 1];

  // 反向移动（从 toTeamId 移回 fromTeamId）
  const newTeams = state.teams.map(team => ({
    ...team,
    players: [...team.players],
    totalSkill: team.totalSkill
  }));

  // 找到球员
  let player: Player | undefined;
  let fromTeamIndex = -1;
  let toTeamIndex = -1;

  for (let i = 0; i < newTeams.length; i++) {
    if (newTeams[i].id === lastEntry.toTeamId) {
      fromTeamIndex = i;
      player = newTeams[i].players.find(p => p.id === lastEntry.playerId);
    }
    if (newTeams[i].id === lastEntry.fromTeamId) {
      toTeamIndex = i;
    }
  }

  if (!player || fromTeamIndex === -1 || toTeamIndex === -1) {
    return state;
  }

  // 从当前队伍移除球员
  newTeams[fromTeamIndex].players = newTeams[fromTeamIndex].players.filter(
    p => p.id !== lastEntry.playerId
  );
  newTeams[fromTeamIndex].totalSkill = newTeams[fromTeamIndex].players.reduce(
    (sum, p) => sum + p.skills.overall,
    0
  );

  // 添加回原队伍
  newTeams[toTeamIndex].players.push(player);
  newTeams[toTeamIndex].totalSkill = newTeams[toTeamIndex].players.reduce(
    (sum, p) => sum + p.skills.overall,
    0
  );

  const balance = calculateBalance(newTeams);

  return {
    teams: newTeams,
    selectedPlayers: state.selectedPlayers,
    balance,
    history: state.history.slice(0, -1)
  };
}

/**
 * 验证移动是否合法
 */
export function validateMove(
  state: DragDropState,
  playerId: string,
  toTeamId: string
): { valid: boolean; reason?: string } {
  // 检查球员是否存在
  let playerExists = false;
  let currentTeamId: string | undefined;

  for (const team of state.teams) {
    if (team.players.some(p => p.id === playerId)) {
      playerExists = true;
      currentTeamId = team.id;
      break;
    }
  }

  if (!playerExists) {
    return { valid: false, reason: '球员不存在' };
  }

  // 检查是否移动到当前队伍
  if (currentTeamId === toTeamId) {
    return { valid: false, reason: '球员已在该队伍中' };
  }

  // 检查目标队伍是否存在
  const targetTeamExists = state.teams.some(team => team.id === toTeamId);
  if (!targetTeamExists) {
    return { valid: false, reason: '目标队伍不存在' };
  }

  return { valid: true };
}

/**
 * 获取移动后的平衡度预览
 */
export function getBalanceAfterMove(
  state: DragDropState,
  playerId: string,
  toTeamId: string
): number {
  // 找到球员当前所在队伍
  let fromTeamId: string | undefined;

  for (const team of state.teams) {
    if (team.players.some(p => p.id === playerId)) {
      fromTeamId = team.id;
      break;
    }
  }

  // 如果找不到球员或已经在目标队伍，返回当前平衡度
  if (!fromTeamId || fromTeamId === toTeamId) {
    return state.balance;
  }

  // 模拟移动并计算平衡度
  const newState = handlePlayerMove(state, playerId, toTeamId);
  return newState.balance;
}
