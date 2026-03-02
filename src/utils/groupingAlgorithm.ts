import type { Player, Team, GroupingConfig, PlayerPosition } from '../types/player';

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
    const positions: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `团队 ${i + 1}`,
      players: [],
      totalSkill: 0,
    }));

    // 按位置分组
    const playersByPosition: Record<PlayerPosition, Player[]> = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: [],
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
