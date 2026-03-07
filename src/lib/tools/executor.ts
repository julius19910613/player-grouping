/**
 * Tool Executor
 * 
 * 执行 AI 调用的工具函数
 */

import { braveSearchClient } from '../brave-search';
import type { ToolCallResult, ToolName } from './index';

/**
 * 执行工具调用
 * @param toolName 工具名称
 * @param args 工具参数
 * @returns 工具执行结果
 */
export async function executeToolCall(
  toolName: ToolName,
  args: Record<string, any>
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case 'get_player_stats':
        return await getPlayerStats(args.player_name, args.season);
      
      case 'search_web':
        return await searchWeb(args.query);
      
      case 'calculate_grouping':
        return await calculateGrouping(args.players, args.criteria);
      
      default:
        return {
          success: false,
          error: `未知的工具: ${toolName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取球员统计数据
 * @param playerName 球员姓名
 * @param season 赛季（可选）
 * @returns 球员统计数据
 */
async function getPlayerStats(
  playerName: string,
  season?: string
): Promise<ToolCallResult> {
  // 模拟数据（实际应用中可以从 Supabase 读取）
  const mockStats: Record<string, any> = {
    '詹姆斯': {
      name: '勒布朗·詹姆斯',
      season: season || '2023-24',
      games: 71,
      pointsPerGame: 25.7,
      reboundsPerGame: 7.3,
      assistsPerGame: 8.3,
      team: '洛杉矶湖人',
      position: '小前锋',
    },
    '库里': {
      name: '斯蒂芬·库里',
      season: season || '2023-24',
      games: 74,
      pointsPerGame: 26.4,
      reboundsPerGame: 4.5,
      assistsPerGame: 5.1,
      team: '金州勇士',
      position: '控球后卫',
    },
  };

  // 简单匹配（实际应用中可以用模糊匹配）
  const stats = mockStats[playerName];

  if (!stats) {
    return {
      success: true,
      data: {
        message: `暂未找到球员 "${playerName}" 的统计数据`,
        suggestion: '可以尝试搜索最新信息',
      },
    };
  }

  return {
    success: true,
    data: stats,
  };
}

/**
 * 联网搜索
 * @param query 搜索关键词
 * @returns 搜索结果
 */
async function searchWeb(query: string): Promise<ToolCallResult> {
  try {
    if (!braveSearchClient.isAvailable()) {
      return {
        success: false,
        error: 'Brave Search API 未配置',
      };
    }

    const results = await braveSearchClient.searchAndFormat(query, 5);

    return {
      success: true,
      data: {
        query,
        results,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '搜索失败',
    };
  }
}

/**
 * 计算球员分组
 * @param players 球员列表
 * @param criteria 分组标准
 * @returns 分组结果
 */
async function calculateGrouping(
  players: string[],
  criteria: string = 'random'
): Promise<ToolCallResult> {
  if (!players || players.length < 2) {
    return {
      success: false,
      error: '至少需要 2 名球员才能分组',
    };
  }

  try {
    let groups: string[][];

    switch (criteria) {
      case 'random':
        groups = randomGrouping(players);
        break;
      
      case 'skill':
        // 简单实现：按索引分组（实际应用中可以根据技能评分）
        groups = skillBasedGrouping(players);
        break;
      
      case 'position':
        // 简单实现：按索引分组（实际应用中可以根据球员位置）
        groups = positionBasedGrouping(players);
        break;
      
      default:
        groups = randomGrouping(players);
    }

    return {
      success: true,
      data: {
        criteria,
        totalPlayers: players.length,
        groupCount: groups.length,
        groups: groups.map((group, index) => ({
          groupNumber: index + 1,
          players: group,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分组计算失败',
    };
  }
}

/**
 * 随机分组
 */
function randomGrouping(players: string[]): string[][] {
  // 随机打乱
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  
  // 计算每组人数（尽量平均）
  const groupSize = Math.ceil(shuffled.length / 2);
  
  // 分成 2 组
  return [
    shuffled.slice(0, groupSize),
    shuffled.slice(groupSize),
  ].filter(group => group.length > 0);
}

/**
 * 按技能分组（简单实现）
 */
function skillBasedGrouping(players: string[]): string[][] {
  // 简单实现：交替分配（实际应用中可以根据技能评分蛇形分配）
  const team1: string[] = [];
  const team2: string[] = [];
  
  players.forEach((player, index) => {
    if (index % 2 === 0) {
      team1.push(player);
    } else {
      team2.push(player);
    }
  });
  
  return [team1, team2].filter(team => team.length > 0);
}

/**
 * 按位置分组（简单实现）
 */
function positionBasedGrouping(players: string[]): string[][] {
  // 简单实现：均分（实际应用中可以根据球员位置平衡）
  const mid = Math.ceil(players.length / 2);
  
  return [
    players.slice(0, mid),
    players.slice(mid),
  ].filter(group => group.length > 0);
}
