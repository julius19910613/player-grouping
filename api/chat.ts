import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';

// Tool definitions
const tools: FunctionDeclaration[] = [
  {
    name: "get_player_stats",
    description: "查询私有数据库中的球员信息（用户录入的球员，不包含公开球员数据）。可以查询球员的技能等级、位置、所属球队等信息",
    parameters: {
      type: "object",
      properties: {
        player_name: {
          type: "string",
          description: "球员姓名（支持模糊搜索）"
        },
        season: {
          type: "string",
          description: "赛季（可选），例如 2023-24"
        }
      },
      required: ["player_name"]
    } as any
  },
  {
    name: "search_web",
    description: "联网搜索最新的篮球相关信息，例如球员新闻、比赛结果、统计数据等",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词，例如 'NBA 最新交易'、'湖人队 詹姆斯 数据'"
        }
      },
      required: ["query"]
    } as any
  },
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
    } as any
  }
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

  // Track search results for UI display
  let searchResultsForUI: any = null;

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

        // Track search results for UI
        if (functionCall.name === 'search_web' && toolResult.success && toolResult.data) {
          searchResultsForUI = {
            query: toolResult.data.query,
            results: toolResult.data.results || [],
          };
        }

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

    // Include search results if available
    if (searchResultsForUI) {
      response_data.searchResults = searchResultsForUI;
    }

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
}

/**
 * Get player stats from Supabase database
 */
async function getPlayerStats(playerName: string, season?: string): Promise<any> {
  // Import database service
  const { queryPlayersFromDatabase } = await import('./database-service');
  
  // Query from Supabase
  const result = await queryPlayersFromDatabase(playerName);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error || '查询失败',
      message: '无法获取球员数据，请稍后重试'
    };
  }

  const { data } = result;
  
  if (data.count === 0) {
    return {
      success: true,
      data: {
        message: data.message,
        suggestion: '请确认球员姓名是否正确，或先录入球员数据',
        availableCommands: ['/players - 查看所有球员', '/help - 查看帮助']
      }
    };
  }

  // 返回匹配的球员数据
  return {
    success: true,
    data: {
      message: data.message,
      count: data.count,
      players: data.players.map((player: any) => ({
        name: player.name,
        skill_level: player.skill_level,
        position: player.position,
        team: player.team,
        notes: player.notes,
        created_at: player.created_at
      }))
    }
  };
}

/**
 * Search web (requires backend API key)
 */
async function searchWeb(query: string): Promise<any> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'Brave Search API 未配置',
    };
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`搜索失败: ${response.status}`);
    }

    const data = await response.json();
    const results = data.web?.results || [];

    if (results.length === 0) {
      return {
        success: true,
        data: {
          query,
          results: [],
          formattedText: '未找到相关结果',
        },
      };
    }

    // Return structured results for frontend display
    const structuredResults = results.map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description,
    }));

    // Also format as text for AI context
    const formattedResults = results
      .map((result: any, index: number) =>
        `${index + 1}. ${result.title}\n   ${result.description}\n   链接: ${result.url}`
      )
      .join('\n\n');

    return {
      success: true,
      data: {
        query,
        results: structuredResults,
        formattedText: formattedResults,
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
