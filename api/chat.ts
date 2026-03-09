import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import {
  getPlayerBasicInfo,
  getPlayerSkills,
  getPlayerRecentMatches,
  getPlayerAverageStats,
  getMatchHistory,
  analyzeMatchPerformance
} from '../lib/db-queries';

// Tool definitions
const tools: FunctionDeclaration[] = [
  {
    name: "get_player_stats",
    description: "【优先使用】查询用户私有数据库中的球员信息。这是用户自己录入的球员（如朋友、队友等），包含技能等级、位置等详细数据。当用户询问某个球员时，应优先使用此工具查询。",
    parameters: {
      type: "object",
      properties: {
        player_name: {
          type: "string",
          description: "球员姓名（支持模糊匹配）"
        },
        season: {
          type: "string",
          description: "赛季（暂未使用，保留参数以兼容）"
        }
      },
      required: ["player_name"]
    }
  } as any,
  {
    name: "get_match_history",
    description: "查询比赛历史记录，支持按日期范围、球员筛选",
    parameters: {
      type: "object",
      properties: {
        player_name: {
          type: "string",
          description: "球员姓名（可选，筛选特定球员参与的比赛）"
        },
        date_from: {
          type: "string",
          description: "起始日期（YYYY-MM-DD，可选）"
        },
        date_to: {
          type: "string",
          description: "结束日期（YYYY-MM-DD，可选）"
        },
        limit: {
          type: "number",
          description: "返回数量（默认 10，最大 50）"
        }
      }
    }
  } as any,
  {
    name: "compare_players",
    description: "对比多名球员的能力和比赛数据",
    parameters: {
      type: "object",
      properties: {
        player_names: {
          type: "array",
          items: {
            type: "string"
          },
          description: "球员姓名列表（2-5 个）"
        },
        criteria: {
          type: "array",
          items: {
            type: "string"
          },
          description: "对比维度（默认 all）"
        }
      },
      required: ["player_names"]
    }
  } as any,
  {
    name: "analyze_match_performance",
    description: "分析单场比赛的整体表现或特定球员表现",
    parameters: {
      type: "object",
      properties: {
        match_id: {
          type: "string",
          description: "比赛ID（可选）"
        },
        match_date: {
          type: "string",
          description: "比赛日期（YYYY-MM-DD，可选）"
        },
        player_name: {
          type: "string",
          description: "球员姓名（可选，聚焦特定球员）"
        },
        analysis_type: {
          type: "string",
          description: "分析类型（默认 overview）"
        }
      }
    }
  } as any,
  {
    name: "calculate_grouping",
    description: "根据球员技能、位置或随机方式计算球员分组方案",
    parameters: {
      type: "object",
      properties: {
        players: {
          type: "array",
          items: {
            type: "string"
          },
          description: "球员姓名列表"
        },
        criteria: {
          type: "string",
          enum: ["skill", "position", "random"],
          description: "分组标准：skill=按技能水平，position=按位置，random=随机分组"
        }
      },
      required: ["players"]
    }
  } as any
];

// Vercel Function timeout configuration (10s max for Hobby Plan)
export const config = {
  maxDuration: 10,
};

// Rate limiting configuration
const rateLimit = new LRUCache<string, number>({
  max: 500, // Cache up to 500 IPs
  ttl: 60000, // 1 minute window
});

// Timeout configuration (9 seconds, leaving 1s for response)
const TIMEOUT_MS = 9000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://player-grouping.vercel.app', 'https://julius19910613.github.io']
    : ['http://localhost:5173', 'http://localhost:3000'];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: '只支持 POST 请求'
    });
  }

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
  const count = rateLimit.get(ip) || 0;
  
  if (count >= 10) {
    return res.status(429).json({
      error: 'Too many requests',
      message: '您的请求过于频繁，请 1 分钟后再试',
      retryAfter: 60
    });
  }
  
  rateLimit.set(ip, count + 1);

  // Validate request body
  const { messages, enableFunctionCalling = true } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: '请求格式错误，需要提供 messages 数组'
    });
  }

  // Initialize Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务配置错误'
    });
  }

  console.log('Initializing Gemini with API key length:', apiKey.length);
  
  let genAI;
  let model;
  
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('GoogleGenerativeAI instance created');
    
    model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      tools: enableFunctionCalling ? [{ functionDeclarations: tools }] : undefined,
    });
    console.log('Model initialized successfully');
  } catch (initError) {
    console.error('Failed to initialize Gemini:', initError);
    return res.status(500).json({
      error: 'Initialization failed',
      message: 'Gemini API 初始化失败',
      details: initError instanceof Error ? initError.message : 'Unknown error'
    });
  }

  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
  });

  try {
    // Convert messages to Gemini format
    const geminiMessages = convertToGeminiFormat(messages);

    // Initial request
    let result = await Promise.race([
      model.generateContent({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
      timeoutPromise
    ]);

    let response = result as Awaited<ReturnType<typeof model.generateContent>>;

    // Handle Function Calling
    if (enableFunctionCalling) {
      const functionCall = response.response.functionCalls()?.[0];

      if (functionCall) {
        console.log('Function call:', functionCall.name, functionCall.args);

        // Execute tool
        const toolResult = await executeToolCall(
          functionCall.name,
          functionCall.args as Record<string, any>
        );

        // Send tool result back to AI
        const functionResponseMessage = {
          role: 'function',
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: toolResult,
            },
          }],
        };

        result = await Promise.race([
          model.generateContent({
            contents: [
              ...geminiMessages,
              {
                role: 'model',
                parts: [{ functionCall }],
              },
              functionResponseMessage as any,
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
          timeoutPromise
        ]);

        response = result as Awaited<ReturnType<typeof model.generateContent>>;
      }
    }

    const text = response.response.text();

    const response_data: any = {
      success: true,
      message: text,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response_data);

  } catch (error: unknown) {
    console.error('Chat API error:', error);

    // Handle timeout
    if (error instanceof Error && error.message === 'Timeout') {
      return res.status(408).json({
        error: 'Request timeout',
        message: '请求超时，请尝试简化问题或使用快捷命令',
        suggestion: '建议使用以下快捷命令：',
        fallbackActions: [
          '📊 查看所有球员',
          '🎯 快速分组',
          '📈 查看统计'
        ]
      });
    }

    // Handle API errors
    if (error && typeof error === 'object' && 'status' in error && (error as any).status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'API 调用频率超限，请稍后重试'
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务暂时不可用，请稍后重试'
    });
  }
}

/**
 * Convert messages from OpenAI format to Gemini format
 */
function convertToGeminiFormat(messages: Array<{role: string; content: string}>): Array<{role: string; parts: Array<{text: string}>}> {
  return messages.map(msg => {
    if (msg.role === 'user') {
      return {
        role: 'user',
        parts: [{ text: msg.content }]
      };
    } else if (msg.role === 'assistant') {
      return {
        role: 'model',
        parts: [{ text: msg.content }]
      };
    } else if (msg.role === 'function') {
      // Function results
      return {
        role: 'function',
        parts: [{ text: JSON.stringify(msg.content) }]
      };
    }
    return {
      role: 'user',
      parts: [{ text: msg.content || '' }]
    };
  });
}

/**
 * Execute tool call on backend
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case 'get_player_stats':
      return await getPlayerStatsHandler(args.player_name, args.season);

    case 'get_match_history':
      return await getMatchHistoryHandler(args.player_name, args.date_from, args.date_to, args.limit);

    case 'compare_players':
      return await comparePlayersHandler(args.player_names, args.criteria);

    case 'analyze_match_performance':
      return await analyzeMatchPerformanceHandler(args.match_id, args.match_date, args.player_name, args.analysis_type);

    case 'calculate_grouping':
      return await calculateGrouping(args.players, args.criteria);

    default:
      return {
        success: false,
        error: `未知的工具: ${toolName}`,
      };
  }
}

/**
 * Get player stats from Supabase database (Optimized)
 */
async function getPlayerStatsHandler(playerName: string, season?: string): Promise<any> {
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
        message: '数据库配置缺失'
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. 查询球员基本信息
    const basicInfoList = await getPlayerBasicInfo(supabase, playerName);
    
    if (!basicInfoList || basicInfoList.length === 0) {
      return {
        success: false,
        data: {
          message: `未找到球员 "${playerName}"`,
          suggestion: '请确认球员姓名是否正确，或先录入球员数据'
        }
      };
    }
    
    // 2. 查询所有匹配球员的详细数据
    const playersWithData = await Promise.all(
      basicInfoList.map(async (player) => {
        // 查询技能数据
        const skills = await getPlayerSkills(supabase, player.id);
        
        // 查询最近 5 场比赛数据
        const recentMatches = await getPlayerRecentMatches(supabase, player.id, 5);
        
        // 查询平均统计数据
        const avgStats = await getPlayerAverageStats(supabase, player.id);
        
        return {
          name: player.name,
          position: player.position,
          skills: skills || {},
          recent_matches: recentMatches || [],
          average_stats: avgStats || {
            avgPoints: 0,
            avgRebounds: 0,
            avgAssists: 0,
            avgSteals: 0,
            avgBlocks: 0,
            avgEfficiency: 0,
            matchCount: 0
          },
          created_at: player.created_at
        };
      })
    );
    
    return {
      success: true,
      data: {
        message: `找到 ${playersWithData.length} 名匹配的球员`,
        count: playersWithData.length,
        players: playersWithData
      }
    };
  } catch (error) {
    console.error('getPlayerStats error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '查询球员数据时发生错误'
    };
  }
}

/**
 * Get match history from database
 */
async function getMatchHistoryHandler(playerName?: string, dateFrom?: string, dateTo?: string, limit?: number): Promise<any> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
        message: '数据库配置缺失'
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const result = await getMatchHistory(supabase, {
      player_name: playerName,
      date_from: dateFrom,
      date_to: dateTo,
      limit: limit || 10
    });
    
    return {
      success: true,
      data: {
        count: result.length,
        matches: result
      }
    };
  } catch (error) {
    console.error('getMatchHistory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '查询比赛历史时发生错误'
    };
  }
}

/**
 * Compare multiple players
 */
async function comparePlayersHandler(playerNames: string[], criteria?: string[]): Promise<any> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
        message: '数据库配置缺失'
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. 查询所有球员的基本信息和技能
    const players = await Promise.all(
      playerNames.map(async (name) => {
        const basicInfoList = await getPlayerBasicInfo(supabase, name);
        if (!basicInfoList || basicInfoList.length === 0) {
          return null;
        }
        
        const basicInfo = basicInfoList[0];
        const skills = await getPlayerSkills(supabase, basicInfo.id);
        const avgStats = await getPlayerAverageStats(supabase, basicInfo.id);
        
        return {
          ...basicInfo,
          skills: skills || {},
          avg_stats: avgStats || {
            avgPoints: 0,
            avgRebounds: 0,
            avgAssists: 0,
            avgSteals: 0,
            avgBlocks: 0,
            avgEfficiency: 0,
            matchCount: 0
          }
        };
      })
    );
    
    // 过滤掉未找到的球员
    const validPlayers = players.filter(p => p !== null);
    
    if (validPlayers.length === 0) {
      return {
        success: false,
        error: '未找到任何球员',
        message: '请确认球员姓名是否正确'
      };
    }
    
    // 2. 对比分析
    const comparison: any = {};
    
    if (validPlayers.length > 1) {
      // 最佳投手（overall 技能最高）
      comparison.best_overall = validPlayers.reduce((a: any, b: any) => 
        (a.skills?.overall || 0) > (b.skills?.overall || 0) ? a : b
      ).name;
      
      // 场均得分最高
      comparison.best_scorer = validPlayers.reduce((a: any, b: any) => 
        (a.avg_stats?.avgPoints || 0) > (b.avg_stats?.avgPoints || 0) ? a : b
      ).name;
      
      // 场均篮板最高
      comparison.best_rebounder = validPlayers.reduce((a: any, b: any) => 
        (a.avg_stats?.avgRebounds || 0) > (b.avg_stats?.avgRebounds || 0) ? a : b
      ).name;
    }
    
    return {
      success: true,
      data: {
        players: validPlayers,
        comparison
      }
    };
  } catch (error) {
    console.error('comparePlayers error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '对比球员数据时发生错误'
    };
  }
}

/**
 * Analyze match performance
 */
async function analyzeMatchPerformanceHandler(matchId?: string, matchDate?: string, playerName?: string, analysisType?: string): Promise<any> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
        message: '数据库配置缺失'
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const analysis = await analyzeMatchPerformance(supabase, {
      match_id: matchId,
      match_date: matchDate,
      player_name: playerName,
      analysis_type: (analysisType === 'individual' || analysisType === 'team_comparison') 
        ? (analysisType === 'individual' ? 'player_specific' : 'overall')
        : 'overall'
    });
    
    return {
      success: true,
      data: analysis
    };
  } catch (error) {
    console.error('analyzeMatchPerformance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '分析比赛表现时发生错误'
    };
  }
}

/**
 * Calculate player grouping
 */
async function calculateGrouping(players: string[], criteria: string = 'random'): Promise<any> {
  if (!players || players.length < 2) {
    return {
      success: false,
      error: '至少需要 2 名球员才能分组',
    };
  }

  let groups: string[][];

  switch (criteria) {
    case 'random':
      groups = randomGrouping(players);
      break;
    
    case 'skill':
      groups = skillBasedGrouping(players);
      break;
    
    case 'position':
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
}

/**
 * Random grouping
 */
function randomGrouping(players: string[]): string[][] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const groupSize = Math.ceil(shuffled.length / 2);
  
  return [
    shuffled.slice(0, groupSize),
    shuffled.slice(groupSize),
  ].filter(group => group.length > 0);
}

/**
 * Skill-based grouping (simplified)
 */
function skillBasedGrouping(players: string[]): string[][] {
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
 * Position-based grouping (simplified)
 */
function positionBasedGrouping(players: string[]): string[][] {
  const mid = Math.ceil(players.length / 2);
  
  return [
    players.slice(0, mid),
    players.slice(mid),
  ].filter(group => group.length > 0);
}
