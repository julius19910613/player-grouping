/**
 * 比赛数据导入服务
 * @module services/match-import
 * 
 * 职责：
 * - 导入比赛记录数据
 * - 导入球员比赛统计数据
 * - 支持从旧系统（Excel/JSON）导入
 * - 数据验证和转换
 */

import { MatchRepository } from '../repositories/match.repository';
import { PlayerMatchStatsRepository } from '../repositories/player-match-stats.repository';
import type { CreateMatchDTO, MatchMode, MatchWinner } from '../types/match';
import type { CreatePlayerMatchStatsDTO } from '../types/match';

/**
 * 旧系统比赛数据格式
 */
export interface LegacyMatchData {
  // 比赛基本信息
  date: string;              // 日期 YYYY-MM-DD
  venue?: string;            // 场地
  mode?: string;             // 模式 (5v5, 3v3)
  
  // 比赛结果
  teamAScore: number;
  teamBScore: number;
  winner?: string;           // 'A', 'B', 'draw'
  
  // 队伍配置
  teamA: LegacyTeamData;
  teamB: LegacyTeamData;
  
  // 备注
  note?: string;
}

/**
 * 旧系统队伍数据
 */
export interface LegacyTeamData {
  players: LegacyPlayerMatchData[];
}

/**
 * 旧系统球员比赛数据
 */
export interface LegacyPlayerMatchData {
  playerId: string;          // 球员 ID
  name?: string;             // 球员名称（用于验证）
  team: 'A' | 'B';           // 队伍
  
  // 基础统计
  points?: number;           // 得分
  rebounds?: number;         // 篮板
  assists?: number;          // 助攻
  steals?: number;           // 抢断
  blocks?: number;           // 盖帽
  turnovers?: number;        // 失误
  fouls?: number;            // 犯规
  minutes?: number;          // 上场时间
  
  // 投篮数据
  fgMade?: number;           // 投篮命中
  fgAttempted?: number;      // 投篮出手
  threeMade?: number;        // 三分命中
  threeAttempted?: number;   // 三分出手
  ftMade?: number;           // 罚球命中
  ftAttempted?: number;      // 罚球出手
  
  // 高级数据
  plusMinus?: number;        // 正负值
  note?: string;             // 备注
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  matchesImported: number;
  statsImported: number;
  errors: string[];
  warnings: string[];
}

/**
 * 导入选项
 */
export interface ImportOptions {
  validatePlayerIds?: boolean;    // 验证球员 ID 是否存在
  skipInvalidRecords?: boolean;   // 跳过无效记录
  calculateEfficiency?: boolean;  // 自动计算效率值
  dryRun?: boolean;               // 试运行（不实际导入）
}

/**
 * 比赛数据导入服务
 */
export class MatchImportService {
  private matchRepository: MatchRepository;
  private statsRepository: PlayerMatchStatsRepository;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.statsRepository = new PlayerMatchStatsRepository();
  }

  /**
   * 导入比赛数据（JSON 格式）
   */
  async importFromJSON(
    data: LegacyMatchData[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      matchesImported: 0,
      statsImported: 0,
      errors: [],
      warnings: [],
    };

    console.log(`🚀 开始导入比赛数据: ${data.length} 场比赛\n`);

    for (let i = 0; i < data.length; i++) {
      const matchData = data[i];
      
      try {
        console.log(`\n[${i + 1}/${data.length}] 处理比赛: ${matchData.date}`);

        // 1. 转换比赛数据
        const matchDTO = this.convertToMatchDTO(matchData);

        // 2. 验证数据
        const validation = this.validateMatchData(matchData);
        result.warnings.push(...validation.warnings);
        
        if (!validation.valid && !options.skipInvalidRecords) {
          throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
        }

        // 3. 创建比赛记录
        if (!options.dryRun) {
          const match = await this.matchRepository.create(matchDTO);
          console.log(`  ✅ 比赛已创建: ${match.id}`);

          // 4. 导入球员统计数据
          const allPlayers = [
            ...matchData.teamA.players.map(p => ({ ...p, team: 'A' as const })),
            ...matchData.teamB.players.map(p => ({ ...p, team: 'B' as const })),
          ];

          for (const playerData of allPlayers) {
            try {
              const statsDTO = this.convertToStatsDTO(match.id, playerData, options);
              
              if (!options.dryRun) {
                await this.statsRepository.create(statsDTO);
                result.statsImported++;
                console.log(`    ✅ 球员统计已导入: ${playerData.name || playerData.playerId}`);
              }
            } catch (error) {
              const errMsg = `球员 ${playerData.name || playerData.playerId} 统计导入失败: ${error}`;
              result.errors.push(errMsg);
              console.error(`    ❌ ${errMsg}`);
              
              if (!options.skipInvalidRecords) {
                throw error;
              }
            }
          }

          result.matchesImported++;
        } else {
          console.log(`  ℹ️  试运行模式：跳过实际导入`);
          result.matchesImported++;
          result.statsImported += matchData.teamA.players.length + matchData.teamB.players.length;
        }
      } catch (error) {
        const errMsg = `比赛 ${matchData.date} 导入失败: ${error}`;
        result.errors.push(errMsg);
        result.success = false;
        console.error(`  ❌ ${errMsg}`);
        
        if (!options.skipInvalidRecords) {
          break;
        }
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 导入结果`);
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ 比赛导入成功: ${result.matchesImported}`);
    console.log(`✅ 统计导入成功: ${result.statsImported}`);
    
    if (result.warnings.length > 0) {
      console.log(`\n⚠️  警告 (${result.warnings.length}):`);
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    if (result.errors.length > 0) {
      console.log(`\n❌ 错误 (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`  - ${e}`));
    }

    return result;
  }

  /**
   * 转换为 MatchDTO
   */
  private convertToMatchDTO(data: LegacyMatchData): CreateMatchDTO {
    const mode = this.parseMatchMode(data.mode);
    const winner = this.parseWinner(data.winner);

    return {
      matchDate: data.date,
      venue: data.venue,
      mode,
      teamAScore: data.teamAScore,
      teamBScore: data.teamBScore,
      winner,
      teamAPlayers: data.teamA.players.map(p => p.playerId),
      teamBPlayers: data.teamB.players.map(p => p.playerId),
      note: data.note,
    };
  }

  /**
   * 转换为 PlayerMatchStatsDTO
   */
  private convertToStatsDTO(
    matchId: string,
    data: LegacyPlayerMatchData,
    options: ImportOptions
  ): CreatePlayerMatchStatsDTO {
    const dto: CreatePlayerMatchStatsDTO = {
      matchId,
      playerId: data.playerId,
      team: data.team === 'A' ? 'team_a' : 'team_b',
      points: data.points || 0,
      rebounds: data.rebounds || 0,
      assists: data.assists || 0,
      steals: data.steals || 0,
      blocks: data.blocks || 0,
      turnovers: data.turnovers || 0,
      fouls: data.fouls || 0,
      minutesPlayed: data.minutes || 0,
      fieldGoalsMade: data.fgMade || 0,
      fieldGoalsAttempted: data.fgAttempted || 0,
      threePointersMade: data.threeMade || 0,
      threePointersAttempted: data.threeAttempted || 0,
      freeThrowsMade: data.ftMade || 0,
      freeThrowsAttempted: data.ftAttempted || 0,
      plusMinus: data.plusMinus || 0,
      note: data.note,
    };

    // 自动计算效率值
    if (options.calculateEfficiency !== false) {
      dto.efficiencyRating = this.calculateEfficiency(dto);
    }

    return dto;
  }

  /**
   * 计算效率值
   * 公式: (得分 + 篮板 + 助攻 + 抢断 + 盖帽) - (出手 - 命中) - (罚球出手 - 罚球命中) - 失误
   */
  private calculateEfficiency(stats: CreatePlayerMatchStatsDTO): number {
    const positive = 
      (stats.points || 0) +
      (stats.rebounds || 0) +
      (stats.assists || 0) +
      (stats.steals || 0) +
      (stats.blocks || 0);
    
    const missedFG = (stats.fieldGoalsAttempted || 0) - (stats.fieldGoalsMade || 0);
    const missedFT = (stats.freeThrowsAttempted || 0) - (stats.freeThrowsMade || 0);
    const negative = missedFG + missedFT + (stats.turnovers || 0);
    
    return positive - negative;
  }

  /**
   * 解析比赛模式
   */
  private parseMatchMode(mode?: string): MatchMode {
    if (!mode) return '5v5';
    
    const normalized = mode.toLowerCase().replace(/[-_\s]/g, '');
    
    if (normalized.includes('3v3') || normalized.includes('33')) return '3v3';
    if (normalized.includes('5v5') || normalized.includes('55')) return '5v5';
    
    return 'custom';
  }

  /**
   * 解析获胜方
   */
  private parseWinner(winner?: string): MatchWinner | undefined {
    if (!winner) return undefined;
    
    const normalized = winner.toLowerCase();
    
    if (normalized === 'a' || normalized === 'team_a') return 'team_a';
    if (normalized === 'b' || normalized === 'team_b') return 'team_b';
    if (normalized === 'draw' || normalized === 'tie') return 'draw';
    
    return undefined;
  }

  /**
   * 验证比赛数据
   */
  private validateMatchData(data: LegacyMatchData): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证日期
    if (!data.date) {
      errors.push('缺少比赛日期');
    } else if (!/^\d{4}-\d{2}-\d{2}/.test(data.date)) {
      warnings.push(`日期格式可能不正确: ${data.date}`);
    }

    // 验证比分
    if (data.teamAScore < 0 || data.teamBScore < 0) {
      errors.push('比分不能为负数');
    }

    // 验证球员数量
    const teamACount = data.teamA.players.length;
    const teamBCount = data.teamB.players.length;
    
    if (teamACount === 0 || teamBCount === 0) {
      errors.push('队伍球员数量不能为空');
    } else if (teamACount !== teamBCount) {
      warnings.push(`两队球员数量不一致: A队 ${teamACount} 人, B队 ${teamBCount} 人`);
    }

    // 验证球员 ID
    const allPlayers = [...data.teamA.players, ...data.teamB.players];
    const missingIds = allPlayers.filter(p => !p.playerId);
    if (missingIds.length > 0) {
      errors.push(`${missingIds.length} 名球员缺少 ID`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 导出示例数据（用于测试）
   */
  static getSampleData(): LegacyMatchData[] {
    return [
      {
        date: '2026-03-01',
        venue: '东单篮球馆',
        mode: '5v5',
        teamAScore: 78,
        teamBScore: 72,
        winner: 'A',
        teamA: {
          players: [
            {
              playerId: 'player-1',
              name: '张三',
              team: 'A',
              points: 18,
              rebounds: 5,
              assists: 8,
              steals: 3,
              blocks: 1,
              turnovers: 2,
              fouls: 3,
              minutes: 40,
              fgMade: 7,
              fgAttempted: 15,
              threeMade: 2,
              threeAttempted: 5,
              ftMade: 2,
              ftAttempted: 2,
              plusMinus: 12,
            },
          ],
        },
        teamB: {
          players: [
            {
              playerId: 'player-2',
              name: '李四',
              team: 'B',
              points: 22,
              rebounds: 8,
              assists: 4,
              steals: 2,
              blocks: 2,
              turnovers: 3,
              fouls: 2,
              minutes: 38,
              fgMade: 9,
              fgAttempted: 18,
              threeMade: 1,
              threeAttempted: 4,
              ftMade: 3,
              ftAttempted: 4,
              plusMinus: -8,
            },
          ],
        },
        note: '激烈的比赛',
      },
    ];
  }
}

// 导出单例实例
export const matchImportService = new MatchImportService();
