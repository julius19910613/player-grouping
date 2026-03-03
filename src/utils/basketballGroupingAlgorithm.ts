import { BasketballPosition } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';

// Player 类型定义
export interface BasketballPlayer {
  id: string;
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
  createdAt?: Date;
  updatedAt?: Date;
}

// Team 类型定义
export interface BasketballTeam {
  id: string;
  name: string;
  players: BasketballPlayer[];
  totalSkill: number;
}

// 团队统计接口
export interface BasketballTeamStats {
  id: string;
  name: string;
  players: BasketballPlayer[];
  totalSkill: number;
  positionDistribution: Record<BasketballPosition, number>;
}

/**
 * 篮球分组算法类
 * 支持 5v5 和 3v3 分组模式
 */
export class BasketballGroupingAlgorithm {
  /**
   * 5v5 分组算法
   * 确保每个队伍有完整的位置配置（PG, SG, SF, PF, C）
   */
  static groupFor5v5(players: BasketballPlayer[]): BasketballTeam[] {
    const requiredPositions: BasketballPosition[] = [
      BasketballPosition.PG,
      BasketballPosition.SG,
      BasketballPosition.SF,
      BasketballPosition.PF,
      BasketballPosition.C
    ];

    const teamCount = Math.floor(players.length / 5);

    if (teamCount < 1) {
      return [{
        id: 'team-1',
        name: '团队 1',
        players: [...players],
        totalSkill: players.reduce((sum, p) => sum + p.skills.overall, 0)
      }];
    }

    // 1. 按位置分组
    const playersByPosition = this.groupByPosition(players);

    // 2. 每个位置内按能力排序
    requiredPositions.forEach(position => {
      if (playersByPosition[position]) {
        playersByPosition[position].sort((a, b) => b.skills.overall - a.skills.overall);
      }
    });

    // 3. 初始化团队
    const teams = this.initializeTeams(teamCount);

    // 4. 轮流分配每个位置的球员
    requiredPositions.forEach(position => {
      const positionPlayers = playersByPosition[position] || [];
      positionPlayers.forEach((player, index) => {
        const teamIndex = index % teamCount;
        teams[teamIndex].players.push(player);
        teams[teamIndex].totalSkill += player.skills.overall;
      });
    });

    // 5. 分配万金油球员
    const utilityPlayers = playersByPosition[BasketballPosition.UTILITY] || [];
    utilityPlayers.sort((a, b) => b.skills.overall - a.skills.overall);

    utilityPlayers.forEach((player) => {
      const targetTeamIndex = this.findBestTeamForPlayer(teams, player);
      teams[targetTeamIndex].players.push(player);
      teams[targetTeamIndex].totalSkill += player.skills.overall;
    });

    // 6. 平衡团队实力
    return this.balanceTeams(teams);
  }

  /**
   * 3v3 分组算法
   * 使用 后卫 + 前锋 + 内线 的配置
   */
  static groupFor3v3(players: BasketballPlayer[]): BasketballTeam[] {
    const teamCount = Math.floor(players.length / 3);

    if (teamCount < 1) {
      return [{
        id: 'team-1',
        name: '团队 1',
        players: [...players],
        totalSkill: players.reduce((sum, p) => sum + p.skills.overall, 0)
      }];
    }

    // 1. 按位置分组
    const playersByPosition = this.groupByPosition(players);

    // 2. 定义3v3位置组
    const guards = this.getGuards(playersByPosition);
    const forwards = this.getForwards(playersByPosition);
    const interiors = this.getInteriors(playersByPosition);

    // 3. 每组内按能力排序
    guards.sort((a, b) => b.skills.overall - a.skills.overall);
    forwards.sort((a, b) => b.skills.overall - a.skills.overall);
    interiors.sort((a, b) => b.skills.overall - a.skills.overall);

    // 4. 初始化团队
    const teams = this.initializeTeams(teamCount);

    // 5. 轮流分配
    [guards, forwards, interiors].forEach((positionPlayers) => {
      positionPlayers.forEach((player, index) => {
        const teamIndex = index % teamCount;
        teams[teamIndex].players.push(player);
        teams[teamIndex].totalSkill += player.skills.overall;
      });
    });

    // 6. 分配万金油球员
    const utilityPlayers = playersByPosition[BasketballPosition.UTILITY] || [];
    utilityPlayers.sort((a, b) => b.skills.overall - a.skills.overall);

    utilityPlayers.forEach((player) => {
      const targetTeamIndex = this.findBestTeamForPlayer(teams, player);
      teams[targetTeamIndex].players.push(player);
      teams[targetTeamIndex].totalSkill += player.skills.overall;
    });

    // 7. 平衡团队实力
    return this.balanceTeams(teams);
  }

  /**
   * 按位置分组
   */
  private static groupByPosition(players: BasketballPlayer[]): Record<BasketballPosition, BasketballPlayer[]> {
    const grouped: Record<BasketballPosition, BasketballPlayer[]> = {
      [BasketballPosition.PG]: [],
      [BasketballPosition.SG]: [],
      [BasketballPosition.SF]: [],
      [BasketballPosition.PF]: [],
      [BasketballPosition.C]: [],
      [BasketballPosition.UTILITY]: []
    };

    players.forEach(player => {
      if (grouped[player.position]) {
        grouped[player.position].push(player);
      }
    });

    return grouped;
  }

  /**
   * 初始化团队
   */
  private static initializeTeams(teamCount: number): BasketballTeam[] {
    return Array.from({ length: teamCount }, (_, index) => ({
      id: `team-${index + 1}`,
      name: `团队 ${index + 1}`,
      players: [],
      totalSkill: 0
    }));
  }

  /**
   * 获取后卫（PG + SG）
   */
  private static getGuards(playersByPosition: Record<BasketballPosition, BasketballPlayer[]>): BasketballPlayer[] {
    return [
      ...(playersByPosition[BasketballPosition.PG] || []),
      ...(playersByPosition[BasketballPosition.SG] || [])
    ];
  }

  /**
   * 获取前锋（SF + PF）
   */
  private static getForwards(playersByPosition: Record<BasketballPosition, BasketballPlayer[]>): BasketballPlayer[] {
    return [
      ...(playersByPosition[BasketballPosition.SF] || []),
      ...(playersByPosition[BasketballPosition.PF] || [])
    ];
  }

  /**
   * 获取内线（C）
   */
  private static getInteriors(playersByPosition: Record<BasketballPosition, BasketballPlayer[]>): BasketballPlayer[] {
    return playersByPosition[BasketballPosition.C] || [];
  }

  /**
   * 为球员找到最佳团队（选择总能力最接近平均的团队）
   */
  private static findBestTeamForPlayer(teams: BasketballTeam[], player: BasketballPlayer): number {
    let minDifference = Infinity;
    let bestTeamIndex = 0;

    const currentAverage = teams.reduce((sum, t) => sum + t.totalSkill, 0) / teams.length;

    teams.forEach((team, index) => {
      const newTotal = team.totalSkill + player.skills.overall;
      const difference = Math.abs(newTotal - currentAverage);

      if (difference < minDifference) {
        minDifference = difference;
        bestTeamIndex = index;
      }
    });

    return bestTeamIndex;
  }

  /**
   * 平衡团队实力
   * 通过交换球员使各队总能力更接近
   */
  private static balanceTeams(teams: BasketballTeam[]): BasketballTeam[] {
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      const sortedTeams = [...teams].sort((a, b) => a.totalSkill - b.totalSkill);
      const weakestTeam = sortedTeams[0];
      const strongestTeam = sortedTeams[sortedTeams.length - 1];

      // 如果差距小于10分，认为已经足够平衡
      if (weakestTeam.totalSkill + 10 >= strongestTeam.totalSkill) {
        break;
      }

      // 找到最佳交换球员
      const bestPlayerToMove = this.findBestPlayerToTransfer(weakestTeam, strongestTeam);

      if (bestPlayerToMove) {
        const playerIndex = strongestTeam.players.findIndex(p => p.id === bestPlayerToMove.id);
        if (playerIndex !== -1) {
          const [player] = strongestTeam.players.splice(playerIndex, 1);
          strongestTeam.totalSkill -= player.skills.overall;

          weakestTeam.players.push(player);
          weakestTeam.totalSkill += player.skills.overall;
        }
      }
    }

    return teams;
  }

  /**
   * 找到最佳交换球员
   */
  private static findBestPlayerToTransfer(
    fromTeam: BasketballTeam,
    toTeam: BasketballTeam
  ): BasketballPlayer | null {
    if (toTeam.players.length === 0) return null;

    let bestPlayer: BasketballPlayer | null = null;
    let bestScore = Infinity;

    toTeam.players.forEach(player => {
      const newFromTotal = fromTeam.totalSkill + player.skills.overall;
      const newToTotal = toTeam.totalSkill - player.skills.overall;
      const balanceDifference = Math.abs(newFromTotal - newToTotal);

      if (balanceDifference < bestScore) {
        bestScore = balanceDifference;
        bestPlayer = player;
      }
    });

    return bestPlayer;
  }

  /**
   * 计算平衡分数（标准差）
   * 数值越小表示团队越平衡
   */
  static calculateBalanceScore(teams: BasketballTeam[]): number {
    if (teams.length === 0) return 0;

    const skills = teams.map(team => team.totalSkill);
    const avg = skills.reduce((sum, skill) => sum + skill, 0) / skills.length;
    const variance = skills.reduce((sum, skill) => sum + Math.pow(skill - avg, 2), 0) / skills.length;

    return Math.sqrt(variance);
  }

  /**
   * 获取团队统计信息
   */
  static getTeamStats(teams: BasketballTeam[]): BasketballTeamStats[] {
    return teams.map(team => {
      const positionDistribution: Record<BasketballPosition, number> = {
        [BasketballPosition.PG]: 0,
        [BasketballPosition.SG]: 0,
        [BasketballPosition.SF]: 0,
        [BasketballPosition.PF]: 0,
        [BasketballPosition.C]: 0,
        [BasketballPosition.UTILITY]: 0
      };

      team.players.forEach(player => {
        positionDistribution[player.position]++;
      });

      return {
        id: team.id,
        name: team.name,
        players: team.players,
        totalSkill: team.totalSkill,
        positionDistribution
      };
    });
  }
}
