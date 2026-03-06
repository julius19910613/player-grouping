/**
 * 比赛分析服务
 * @module services/match-analysis
 * 
 * 职责：
 * - 计算球员比赛表现评分
 * - 计算胜率、场均数据
 * - 效率值计算（PER, 效率评分）
 * - 比赛结果分析
 */

import { MatchRepository } from '../repositories/match.repository';
import { PlayerMatchStatsRepository } from '../repositories/player-match-stats.repository';
import type { MatchWinner } from '../types/match';
import type { PlayerMatchStats } from '../types/match';

/**
 * 球员比赛统计汇总
 */
export interface PlayerMatchSummary {
  playerId: string;
  
  // 比赛统计
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;           // 胜率 0-1
  
  // 得分统计
  totalPoints: number;
  avgPoints: number;
  maxPoints: number;
  minPoints: number;
  
  // 篮板统计
  totalRebounds: number;
  avgRebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  
  // 助攻统计
  totalAssists: number;
  avgAssists: number;
  
  // 防守统计
  totalSteals: number;
  avgSteals: number;
  totalBlocks: number;
  avgBlocks: number;
  
  // 其他统计
  totalTurnovers: number;
  avgTurnovers: number;
  totalFouls: number;
  avgFouls: number;
  totalMinutes: number;
  avgMinutes: number;
  
  // 投篮统计
  totalFGM: number;          // 投篮命中总数
  totalFGA: number;          // 投篮出手总数
  fgPercentage: number;      // 投篮命中率 0-1
  
  total3PM: number;          // 三分命中总数
  total3PA: number;          // 三分出手总数
  threePointPercentage: number; // 三分命中率 0-1
  
  totalFTM: number;          // 罚球命中总数
  totalFTA: number;          // 罚球出手总数
  ftPercentage: number;      // 罚球命中率 0-1
  
  // 高级统计
  totalPlusMinus: number;
  avgPlusMinus: number;
  totalEfficiency: number;
  avgEfficiency: number;
  
  // 真实命中率
  trueShootingPercentage: number;
  
  // 效率值 (Game Score)
  avgGameScore: number;
}

/**
 * 比赛分析结果
 */
export interface MatchAnalysisResult {
  matchId: string;
  matchDate: Date;
  mode: string;
  winner: MatchWinner | undefined;
  
  // 比赛概况
  teamAScore: number;
  teamBScore: number;
  scoreDifference: number;
  
  // 队伍统计
  teamAStats: TeamMatchStats;
  teamBStats: TeamMatchStats;
  
  // 最佳球员
  bestPlayer: {
    playerId: string;
    team: 'A' | 'B';
    efficiency: number;
    points: number;
  };
  
  // 比赛强度
  intensity: 'high' | 'medium' | 'low';
  
  // 比赛质量评分
  qualityScore: number;      // 0-100
}

/**
 * 队伍比赛统计
 */
export interface TeamMatchStats {
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  totalTurnovers: number;
  totalFouls: number;
  avgEfficiency: number;
  avgPlusMinus: number;
  fgPercentage: number;
  threePointPercentage: number;
  ftPercentage: number;
}

/**
 * 球员趋势分析
 */
export interface PlayerTrendAnalysis {
  playerId: string;
  
  // 近期表现趋势
  pointsTrend: 'improving' | 'declining' | 'stable';
  efficiencyTrend: 'improving' | 'declining' | 'stable';
  overallTrend: 'improving' | 'declining' | 'stable';
  
  // 最近 N 场平均
  recentAvgPoints: number;
  recentAvgRebounds: number;
  recentAvgAssists: number;
  recentAvgEfficiency: number;
  
  // 对比赛季平均
  pointsVsAverage: number;   // +/- 百分比
  efficiencyVsAverage: number;
  
  // 建议能力调整
  suggestedAdjustment: {
    skill: string;
    direction: 'increase' | 'decrease';
    amount: number;
    reason: string;
  }[];
}

/**
 * 比赛分析服务
 */
export class MatchAnalysisService {
  private matchRepository: MatchRepository;
  private statsRepository: PlayerMatchStatsRepository;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.statsRepository = new PlayerMatchStatsRepository();
  }

  /**
   * 获取球员比赛统计汇总
   */
  async getPlayerMatchSummary(playerId: string): Promise<PlayerMatchSummary> {
    // 获取所有比赛和统计
    const matches = await this.matchRepository.findByPlayerId(playerId);
    const allStats = await this.statsRepository.findByPlayerId(playerId);

    // 初始化汇总数据
    const summary: PlayerMatchSummary = {
      playerId,
      totalMatches: matches.length,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      totalPoints: 0,
      avgPoints: 0,
      maxPoints: 0,
      minPoints: Infinity,
      totalRebounds: 0,
      avgRebounds: 0,
      offensiveRebounds: 0,
      defensiveRebounds: 0,
      totalAssists: 0,
      avgAssists: 0,
      totalSteals: 0,
      avgSteals: 0,
      totalBlocks: 0,
      avgBlocks: 0,
      totalTurnovers: 0,
      avgTurnovers: 0,
      totalFouls: 0,
      avgFouls: 0,
      totalMinutes: 0,
      avgMinutes: 0,
      totalFGM: 0,
      totalFGA: 0,
      fgPercentage: 0,
      total3PM: 0,
      total3PA: 0,
      threePointPercentage: 0,
      totalFTM: 0,
      totalFTA: 0,
      ftPercentage: 0,
      totalPlusMinus: 0,
      avgPlusMinus: 0,
      totalEfficiency: 0,
      avgEfficiency: 0,
      trueShootingPercentage: 0,
      avgGameScore: 0,
    };

    if (matches.length === 0) {
      return summary;
    }

    // 计算胜负场
    for (const match of matches) {
      const playerStats = allStats.find(s => s.matchId === match.id);
      if (!playerStats) continue;

      const playerTeam = playerStats.team;
      const isWinner = 
        (playerTeam === 'team_a' && match.winner === 'team_a') ||
        (playerTeam === 'team_b' && match.winner === 'team_b');
      const isLoser = 
        (playerTeam === 'team_a' && match.winner === 'team_b') ||
        (playerTeam === 'team_b' && match.winner === 'team_a');

      if (isWinner) summary.wins++;
      else if (isLoser) summary.losses++;
      else if (match.winner === 'draw') summary.draws++;
    }

    summary.winRate = summary.wins / summary.totalMatches;

    // 计算统计数据
    for (const stats of allStats) {
      summary.totalPoints += stats.points;
      summary.maxPoints = Math.max(summary.maxPoints, stats.points);
      summary.minPoints = Math.min(summary.minPoints, stats.points);
      
      summary.totalRebounds += stats.rebounds;
      summary.totalAssists += stats.assists;
      summary.totalSteals += stats.steals;
      summary.totalBlocks += stats.blocks;
      summary.totalTurnovers += stats.turnovers;
      summary.totalFouls += stats.fouls;
      summary.totalMinutes += stats.minutesPlayed;
      
      summary.totalFGM += stats.fieldGoalsMade;
      summary.totalFGA += stats.fieldGoalsAttempted;
      summary.total3PM += stats.threePointersMade;
      summary.total3PA += stats.threePointersAttempted;
      summary.totalFTM += stats.freeThrowsMade;
      summary.totalFTA += stats.freeThrowsAttempted;
      
      summary.totalPlusMinus += stats.plusMinus;
      
      const efficiency = stats.efficiencyRating ?? this.calculateEfficiency(stats);
      summary.totalEfficiency += efficiency;
    }

    // 计算平均值
    const count = allStats.length || 1;
    summary.avgPoints = summary.totalPoints / count;
    summary.avgRebounds = summary.totalRebounds / count;
    summary.avgAssists = summary.totalAssists / count;
    summary.avgSteals = summary.totalSteals / count;
    summary.avgBlocks = summary.totalBlocks / count;
    summary.avgTurnovers = summary.totalTurnovers / count;
    summary.avgFouls = summary.totalFouls / count;
    summary.avgMinutes = summary.totalMinutes / count;
    summary.avgPlusMinus = summary.totalPlusMinus / count;
    summary.avgEfficiency = summary.totalEfficiency / count;

    // 计算投篮命中率
    summary.fgPercentage = summary.totalFGA > 0 ? summary.totalFGM / summary.totalFGA : 0;
    summary.threePointPercentage = summary.total3PA > 0 ? summary.total3PM / summary.total3PA : 0;
    summary.ftPercentage = summary.totalFTA > 0 ? summary.totalFTM / summary.totalFTA : 0;

    // 计算真实命中率
    // TS% = 得分 / (2 * (投篮出手 + 0.44 * 罚球出手))
    const tsDenominator = 2 * (summary.totalFGA + 0.44 * summary.totalFTA);
    summary.trueShootingPercentage = tsDenominator > 0 ? summary.totalPoints / tsDenominator : 0;

    // 计算 Game Score
    // Game Score = 得分 + 0.4*投篮命中 - 0.7*投篮出手 - 0.4*(罚球出手-罚球命中) + 0.7*进攻篮板 + 0.3*防守篮板 + 抢断 + 0.7*助攻 + 0.7*盖帽 - 0.4*犯规 - 失误
    const totalGameScore = allStats.reduce((sum, stats) => {
      const gameScore = 
        stats.points +
        0.4 * stats.fieldGoalsMade -
        0.7 * stats.fieldGoalsAttempted -
        0.4 * (stats.freeThrowsAttempted - stats.freeThrowsMade) +
        0.7 * stats.rebounds +
        stats.steals +
        0.7 * stats.assists +
        0.7 * stats.blocks -
        0.4 * stats.fouls -
        stats.turnovers;
      return sum + gameScore;
    }, 0);
    summary.avgGameScore = totalGameScore / count;

    return summary;
  }

  /**
   * 分析比赛
   */
  async analyzeMatch(matchId: string): Promise<MatchAnalysisResult> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error(`比赛不存在: ${matchId}`);
    }

    const stats = await this.statsRepository.findByMatchId(matchId);
    
    // 分组统计
    const teamAStats = stats.filter(s => s.team === 'team_a');
    const teamBStats = stats.filter(s => s.team === 'team_b');

    // 计算队伍统计
    const teamASummary = this.calculateTeamStats(teamAStats);
    const teamBSummary = this.calculateTeamStats(teamBStats);

    // 找出最佳球员
    let bestPlayer = {
      playerId: '',
      team: 'A' as 'A' | 'B',
      efficiency: -Infinity,
      points: 0,
    };

    for (const stat of stats) {
      const efficiency = stat.efficiencyRating ?? this.calculateEfficiency(stat);
      if (efficiency > bestPlayer.efficiency) {
        bestPlayer = {
          playerId: stat.playerId,
          team: stat.team === 'team_a' ? 'A' : 'B',
          efficiency,
          points: stat.points,
        };
      }
    }

    // 计算比赛强度
    const totalPoints = match.teamAScore + match.teamBScore;
    const scoreDiff = Math.abs(match.teamAScore - match.teamBScore);
    const avgEfficiency = (teamASummary.avgEfficiency + teamBSummary.avgEfficiency) / 2;
    
    let intensity: 'high' | 'medium' | 'low';
    if (totalPoints > 150 && avgEfficiency > 10 && scoreDiff < 10) {
      intensity = 'high';
    } else if (totalPoints < 100 || avgEfficiency < 5) {
      intensity = 'low';
    } else {
      intensity = 'medium';
    }

    // 计算比赛质量评分
    const qualityScore = this.calculateMatchQuality({
      scoreDifference: scoreDiff,
      avgEfficiency,
      totalTurnovers: teamASummary.totalTurnovers + teamBSummary.totalTurnovers,
      totalFouls: teamASummary.totalFouls + teamBSummary.totalFouls,
      fgPercentage: (teamASummary.fgPercentage + teamBSummary.fgPercentage) / 2,
    });

    return {
      matchId: match.id,
      matchDate: match.matchDate,
      mode: match.mode,
      winner: match.winner,
      teamAScore: match.teamAScore,
      teamBScore: match.teamBScore,
      scoreDifference: scoreDiff,
      teamAStats: teamASummary,
      teamBStats: teamBSummary,
      bestPlayer,
      intensity,
      qualityScore,
    };
  }

  /**
   * 分析球员趋势
   */
  async analyzePlayerTrend(
    playerId: string,
    recentGames: number = 5
  ): Promise<PlayerTrendAnalysis> {
    const matches = await this.matchRepository.findByPlayerId(playerId);
    const allStats = await this.statsRepository.findByPlayerId(playerId);

    // 按日期排序
    const sortedStats = allStats
      .map(stat => {
        const match = matches.find(m => m.id === stat.matchId);
        return { stat, matchDate: match?.matchDate || new Date() };
      })
      .sort((a, b) => b.matchDate.getTime() - a.matchDate.getTime());

    // 获取赛季总平均
    const seasonSummary = await this.getPlayerMatchSummary(playerId);

    // 获取最近 N 场数据
    const recentStats = sortedStats.slice(0, recentGames);

    if (recentStats.length === 0) {
      return {
        playerId,
        pointsTrend: 'stable',
        efficiencyTrend: 'stable',
        overallTrend: 'stable',
        recentAvgPoints: 0,
        recentAvgRebounds: 0,
        recentAvgAssists: 0,
        recentAvgEfficiency: 0,
        pointsVsAverage: 0,
        efficiencyVsAverage: 0,
        suggestedAdjustment: [],
      };
    }

    // 计算近期平均
    const recentAvgPoints = recentStats.reduce((sum, { stat }) => sum + stat.points, 0) / recentStats.length;
    const recentAvgRebounds = recentStats.reduce((sum, { stat }) => sum + stat.rebounds, 0) / recentStats.length;
    const recentAvgAssists = recentStats.reduce((sum, { stat }) => sum + stat.assists, 0) / recentStats.length;
    const recentAvgEfficiency = recentStats.reduce((sum, { stat }) => {
      const eff = stat.efficiencyRating ?? this.calculateEfficiency(stat);
      return sum + eff;
    }, 0) / recentStats.length;

    // 判断趋势
    const pointsTrend = this.determineTrend(recentAvgPoints, seasonSummary.avgPoints);
    const efficiencyTrend = this.determineTrend(recentAvgEfficiency, seasonSummary.avgEfficiency);
    
    let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (pointsTrend === 'improving' && efficiencyTrend === 'improving') {
      overallTrend = 'improving';
    } else if (pointsTrend === 'declining' && efficiencyTrend === 'declining') {
      overallTrend = 'declining';
    }

    // 计算对比平均值
    const pointsVsAverage = seasonSummary.avgPoints > 0 
      ? ((recentAvgPoints - seasonSummary.avgPoints) / seasonSummary.avgPoints) * 100 
      : 0;
    const efficiencyVsAverage = seasonSummary.avgEfficiency > 0
      ? ((recentAvgEfficiency - seasonSummary.avgEfficiency) / seasonSummary.avgEfficiency) * 100
      : 0;

    // 生成能力调整建议
    const suggestedAdjustment = this.generateAdjustmentSuggestions(
      recentAvgPoints,
      recentAvgEfficiency,
      recentAvgRebounds,
      recentAvgAssists,
      seasonSummary
    );

    return {
      playerId,
      pointsTrend,
      efficiencyTrend,
      overallTrend,
      recentAvgPoints,
      recentAvgRebounds,
      recentAvgAssists,
      recentAvgEfficiency,
      pointsVsAverage,
      efficiencyVsAverage,
      suggestedAdjustment,
    };
  }

  /**
   * 计算效率值
   */
  private calculateEfficiency(stats: PlayerMatchStats): number {
    const positive = 
      stats.points +
      stats.rebounds +
      stats.assists +
      stats.steals +
      stats.blocks;
    
    const missedFG = stats.fieldGoalsAttempted - stats.fieldGoalsMade;
    const missedFT = stats.freeThrowsAttempted - stats.freeThrowsMade;
    const negative = missedFG + missedFT + stats.turnovers;
    
    return positive - negative;
  }

  /**
   * 计算队伍统计
   */
  private calculateTeamStats(stats: PlayerMatchStats[]): TeamMatchStats {
    if (stats.length === 0) {
      return {
        totalPoints: 0,
        totalRebounds: 0,
        totalAssists: 0,
        totalSteals: 0,
        totalBlocks: 0,
        totalTurnovers: 0,
        totalFouls: 0,
        avgEfficiency: 0,
        avgPlusMinus: 0,
        fgPercentage: 0,
        threePointPercentage: 0,
        ftPercentage: 0,
      };
    }

    const totals = {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      plusMinus: 0,
      efficiency: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
    };

    for (const stat of stats) {
      totals.points += stat.points;
      totals.rebounds += stat.rebounds;
      totals.assists += stat.assists;
      totals.steals += stat.steals;
      totals.blocks += stat.blocks;
      totals.turnovers += stat.turnovers;
      totals.fouls += stat.fouls;
      totals.plusMinus += stat.plusMinus;
      totals.efficiency += stat.efficiencyRating ?? this.calculateEfficiency(stat);
      totals.fgm += stat.fieldGoalsMade;
      totals.fga += stat.fieldGoalsAttempted;
      totals.tpm += stat.threePointersMade;
      totals.tpa += stat.threePointersAttempted;
      totals.ftm += stat.freeThrowsMade;
      totals.fta += stat.freeThrowsAttempted;
    }

    const count = stats.length;

    return {
      totalPoints: totals.points,
      totalRebounds: totals.rebounds,
      totalAssists: totals.assists,
      totalSteals: totals.steals,
      totalBlocks: totals.blocks,
      totalTurnovers: totals.turnovers,
      totalFouls: totals.fouls,
      avgEfficiency: totals.efficiency / count,
      avgPlusMinus: totals.plusMinus / count,
      fgPercentage: totals.fga > 0 ? totals.fgm / totals.fga : 0,
      threePointPercentage: totals.tpa > 0 ? totals.tpm / totals.tpa : 0,
      ftPercentage: totals.fta > 0 ? totals.ftm / totals.fta : 0,
    };
  }

  /**
   * 计算比赛质量评分
   */
  private calculateMatchQuality(params: {
    scoreDifference: number;
    avgEfficiency: number;
    totalTurnovers: number;
    totalFouls: number;
    fgPercentage: number;
  }): number {
    let score = 100;

    // 比分差距扣分（差距越大，分数越低）
    if (params.scoreDifference > 20) score -= 30;
    else if (params.scoreDifference > 15) score -= 20;
    else if (params.scoreDifference > 10) score -= 10;
    else if (params.scoreDifference > 5) score -= 5;

    // 平均效率加分
    if (params.avgEfficiency > 15) score += 10;
    else if (params.avgEfficiency > 10) score += 5;
    else if (params.avgEfficiency < 5) score -= 10;

    // 失误扣分
    if (params.totalTurnovers > 30) score -= 15;
    else if (params.totalTurnovers > 20) score -= 10;
    else if (params.totalTurnovers > 15) score -= 5;

    // 犯规扣分
    if (params.totalFouls > 40) score -= 15;
    else if (params.totalFouls > 30) score -= 10;
    else if (params.totalFouls > 25) score -= 5;

    // 投篮命中率加分
    if (params.fgPercentage > 0.5) score += 10;
    else if (params.fgPercentage > 0.45) score += 5;
    else if (params.fgPercentage < 0.35) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 判断趋势
   */
  private determineTrend(
    recent: number,
    average: number,
    threshold: number = 0.1
  ): 'improving' | 'declining' | 'stable' {
    if (average === 0) return 'stable';
    
    const change = (recent - average) / average;
    
    if (change > threshold) return 'improving';
    if (change < -threshold) return 'declining';
    return 'stable';
  }

  /**
   * 生成能力调整建议
   */
  private generateAdjustmentSuggestions(
    recentPoints: number,
    _recentEfficiency: number,
    recentRebounds: number,
    recentAssists: number,
    seasonSummary: PlayerMatchSummary
  ): PlayerTrendAnalysis['suggestedAdjustment'] {
    const suggestions: PlayerTrendAnalysis['suggestedAdjustment'] = [];

    // 得分能力
    if (recentPoints > seasonSummary.avgPoints * 1.2) {
      suggestions.push({
        skill: 'twoPointShot',
        direction: 'increase',
        amount: 2,
        reason: `近期场均得分 ${recentPoints.toFixed(1)} 高于赛季平均 ${seasonSummary.avgPoints.toFixed(1)}`,
      });
    } else if (recentPoints < seasonSummary.avgPoints * 0.8) {
      suggestions.push({
        skill: 'twoPointShot',
        direction: 'decrease',
        amount: 2,
        reason: `近期场均得分 ${recentPoints.toFixed(1)} 低于赛季平均 ${seasonSummary.avgPoints.toFixed(1)}`,
      });
    }

    // 篮板能力
    if (recentRebounds > seasonSummary.avgRebounds * 1.2) {
      suggestions.push({
        skill: 'offensiveRebound',
        direction: 'increase',
        amount: 1,
        reason: `近期篮板表现出色`,
      });
    }

    // 助攻能力
    if (recentAssists > seasonSummary.avgAssists * 1.2) {
      suggestions.push({
        skill: 'passing',
        direction: 'increase',
        amount: 2,
        reason: `近期组织能力出色`,
      });
    }

    return suggestions;
  }
}

// 导出单例实例
export const matchAnalysisService = new MatchAnalysisService();
