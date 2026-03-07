import type { Player, Team, GroupingConfig } from '../types';
import { BasketballPosition } from '../types';

/**
 * 分组算法类
 */
export class GroupingAlgorithm {
  /**
   * 执行分组
   */
  static groupPlayers(players: Player[], config: GroupingConfig): Team[] {
    const { strategy, teamCount } = config;

    switch (strategy) {
      case 'balanced':
        return this.balancedGrouping(players, teamCount);
      case 'position-balanced':
        return this.positionBalancedGrouping(players, teamCount);
      case 'random':
        return this.randomGrouping(players, teamCount);
      default:
        return this.balancedGrouping(players, teamCount);
    }
  }

  /**
   * 能力平衡分组
   * 使用贪心算法确保每个团队的总能力值接近
   */
  private static balancedGrouping(players: Player[], teamCount: number): Team[] {
    // 按能力排序（从高到低）
    const sortedPlayers = [...players].sort(
      (a, b) => b.skills.overall - a.skills.overall
    );

    // 初始化团队
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `团队 ${i + 1}`,
      players: [],
      totalSkill: 0,
    }));

    // 贪心分配：每次将下一个球员分配给总能力最低的团队
    sortedPlayers.forEach((player) => {
      const weakestTeam = teams.reduce((min, team) =>
        team.totalSkill < min.totalSkill ? team : min
      );
      weakestTeam.players.push(player);
      weakestTeam.totalSkill += player.skills.overall;
    });

    return teams;
  }

  /**
   * 位置平衡分组
   * 确保每个团队有合适的位置分配
   */
  private static positionBalancedGrouping(players: Player[], teamCount: number): Team[] {
    const positions: BasketballPosition[] = [
      BasketballPosition.PG,
      BasketballPosition.SG,
      BasketballPosition.SF,
      BasketballPosition.PF,
      BasketballPosition.C,
      BasketballPosition.UTILITY
    ];
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `团队 ${i + 1}`,
      players: [],
      totalSkill: 0,
    }));

    // 按位置分组
    const playersByPosition: Record<BasketballPosition, Player[]> = {
      [BasketballPosition.PG]: [],
      [BasketballPosition.SG]: [],
      [BasketballPosition.SF]: [],
      [BasketballPosition.PF]: [],
      [BasketballPosition.C]: [],
      [BasketballPosition.UTILITY]: [],
    };

    players.forEach((player) => {
      playersByPosition[player.position].push(player);
    });

    // 对每个位置的球员按能力排序
    positions.forEach((position) => {
      playersByPosition[position].sort(
        (a, b) => b.skills.overall - a.skills.overall
      );
    });

    // 按位置轮流分配球员到团队
    positions.forEach((position) => {
      const positionPlayers = playersByPosition[position];
      positionPlayers.forEach((player, index) => {
        const teamIndex = index % teamCount;
        teams[teamIndex].players.push(player);
        teams[teamIndex].totalSkill += player.skills.overall;
      });
    });

    return teams;
  }

  /**
   * 随机分组
   */
  private static randomGrouping(players: Player[], teamCount: number): Team[] {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `团队 ${i + 1}`,
      players: [],
      totalSkill: 0,
    }));

    shuffled.forEach((player, index) => {
      const teamIndex = index % teamCount;
      teams[teamIndex].players.push(player);
      teams[teamIndex].totalSkill += player.skills.overall;
    });

    return teams;
  }

  /**
   * 计算团队平衡度（标准差）
   * 值越小表示越平衡
   */
  static calculateBalance(teams: Team[]): number {
    const skills = teams.map((team) => team.totalSkill);
    const avg = skills.reduce((sum, skill) => sum + skill, 0) / skills.length;
    const variance =
      skills.reduce((sum, skill) => sum + Math.pow(skill - avg, 2), 0) /
      skills.length;
    return Math.sqrt(variance);
  }
}

/**
 * 在队伍间移动球员
 */
export function movePlayerBetweenTeams(
  teams: Team[],
  playerId: string,
  fromTeamId: string,
  toTeamId: string
): Team[] {
  // 如果源队伍和目标队伍相同，直接返回
  if (fromTeamId === toTeamId) {
    return teams.map(team => ({ ...team, players: [...team.players] }));
  }

  // 找到球员和队伍
  let player: Player | undefined;
  let fromTeamIndex = -1;
  let toTeamIndex = -1;

  for (let i = 0; i < teams.length; i++) {
    if (teams[i].id === fromTeamId) {
      fromTeamIndex = i;
      player = teams[i].players.find(p => p.id === playerId);
    }
    if (teams[i].id === toTeamId) {
      toTeamIndex = i;
    }
  }

  // 如果找不到球员或队伍，返回原数组
  if (!player || fromTeamIndex === -1 || toTeamIndex === -1) {
    return teams.map(team => ({ ...team, players: [...team.players] }));
  }

  // 创建新的队伍数组
  const newTeams = teams.map(team => ({
    ...team,
    players: [...team.players],
    totalSkill: team.totalSkill
  }));

  // 从源队伍移除球员
  newTeams[fromTeamIndex].players = newTeams[fromTeamIndex].players.filter(
    p => p.id !== playerId
  );
  newTeams[fromTeamIndex].totalSkill = recalculateTeamSkill(newTeams[fromTeamIndex]);

  // 添加到目标队伍
  newTeams[toTeamIndex].players.push(player);
  newTeams[toTeamIndex].totalSkill = recalculateTeamSkill(newTeams[toTeamIndex]);

  return newTeams;
}

/**
 * 重新计算单个队伍的总能力
 */
export function recalculateTeamSkill(team: Team): number {
  return team.players.reduce((sum, player) => sum + player.skills.overall, 0);
}

/**
 * 计算所有队伍的平衡度（标准差）
 * 返回值越小越平衡
 */
export function calculateBalance(teams: Team[]): number {
  if (teams.length === 0) return 0;

  const skills = teams.map((team) => team.totalSkill);
  const avg = skills.reduce((sum, skill) => sum + skill, 0) / skills.length;

  if (avg === 0) return 0;

  const variance =
    skills.reduce((sum, skill) => sum + Math.pow(skill - avg, 2), 0) /
    skills.length;
  return Math.sqrt(variance);
}

/**
 * 预览移动后的平衡度（不实际移动）
 */
export function previewBalanceAfterMove(
  teams: Team[],
  playerId: string,
  toTeamId: string
): number {
  // 找到球员当前所在队伍
  let fromTeamId: string | undefined;

  for (const team of teams) {
    if (team.players.some(p => p.id === playerId)) {
      fromTeamId = team.id;
      break;
    }
  }

  // 如果找不到球员，返回当前平衡度
  if (!fromTeamId) {
    return calculateBalance(teams);
  }

  // 如果目标队伍就是当前队伍，返回当前平衡度
  if (fromTeamId === toTeamId) {
    return calculateBalance(teams);
  }

  // 模拟移动并计算平衡度
  const newTeams = movePlayerBetweenTeams(teams, playerId, fromTeamId, toTeamId);
  return calculateBalance(newTeams);
}
