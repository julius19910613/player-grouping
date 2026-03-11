/**
 * Chat API Handler with MCP Integration
 *
 * This is the main API endpoint for the chat assistant.
 * It uses Supabase MCP Server for dynamic tool calling instead of
 * hardcoded function declarations.
 *
 * Security Features:
 * - RLS policies enforced on database (read-only for anonymous users)
 * - Input validation with Zod schemas
 * - Circuit breaker pattern for resilience
 * - Request timeout (9s) to stay within Vercel limits
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import type { FunctionDeclaration } from '@google/generative-ai';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// MCP Client Manager
import {
  getOrCreateMCPManager,
  MCPClientManager,
  CircuitBreakerState,
} from './lib/mcp-client.js';

// Validators
import {
  validateInput,
  safeValidateInput,
  PlayerQuerySchema,
  MatchQuerySchema,
  ListPlayersSchema,
  ComparePlayersSchema,
  MatchAnalysisSchema,
  GroupingSchema,
  formatZodError,
} from './lib/validators.js';

// Error handling
import {
  MCPError,
  MCPErrorType,
  wrapMCPError,
  isRecoverableError,
  shouldTriggerFallback,
} from './lib/errors.js';

// Tool mapper
import {
  mcpToolsToGeminiFunctions,
  createFallbackTools,
  sanitizeMCPResult,
  formatMCPResultForGemini,
  isWriteOperation,
} from './lib/tool-mapper.js';

// Tracing
import {
  getTraceId,
  createLogger,
  withTrace,
} from './lib/tracer.js';

// Legacy db-queries (for fallback)
import {
  getPlayerBasicInfo,
  getPlayerSkills,
  getPlayerRecentMatches,
  getPlayerAverageStats,
  getMatchHistory,
  analyzeMatchPerformance,
} from './lib/db-queries.js';

// ============================================================================
// Configuration
// ============================================================================

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

// ============================================================================
// Global State (Vercel warm-reuse pattern)
// ============================================================================

declare global {
  var __mcpManager: MCPClientManager | undefined;
  var __toolsCache: FunctionDeclaration[] | undefined;
  var __mcpManagerReady: boolean | undefined;
}

let mcpManager: MCPClientManager | null = null;
let toolsCache: FunctionDeclaration[] | null = null;
let mcpManagerReady: boolean = false;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize MCP Manager
 *
 * This function is called once per cold start and caches the connection
 * globally for warm reuse in Vercel serverless environment.
 */
async function initMCPManager(logger: ReturnType<typeof createLogger>): Promise<MCPClientManager> {
  // Reuse global instance if available and ready
  if (global.__mcpManagerReady && global.__mcpManager && global.__toolsCache) {
    logger.info('Reusing existing MCP manager from global cache');
    mcpManager = global.__mcpManager;
    toolsCache = global.__toolsCache;
    mcpManagerReady = true;
    return mcpManager;
  }

  logger.info('Initializing new MCP Manager');

  try {
    mcpManager = await getOrCreateMCPManager();

    // Get tools from MCP Server
    const mcpTools = await mcpManager.getTools();

    // Convert to Gemini format
    toolsCache = mcpToolsToGeminiFunctions(mcpTools);

    logger.info(`MCP Manager initialized with ${toolsCache.length} tools`, {
      tools: toolsCache.map((t) => t.name),
    });

    // Cache globally for warm reuse
    global.__mcpManager = mcpManager;
    global.__toolsCache = toolsCache;
    global.__mcpManagerReady = true;
    mcpManagerReady = true;

    return mcpManager;
  } catch (error) {
    logger.error('Failed to initialize MCP Manager', error);
    throw error;
  }
}

// ============================================================================
// Tool Execution with MCP
// ============================================================================

/**
 * Execute tool call via MCP
 *
 * This function handles tool execution with proper validation,
 * error handling, and fallback logic.
 */
async function executeToolViaMCP(
  toolName: string,
  args: Record<string, unknown>,
  logger: ReturnType<typeof createLogger>
): Promise<any> {
  logger.info(`Executing tool via MCP: ${toolName}`, { args });

  // Security check: block write operations
  if (isWriteOperation(toolName)) {
    logger.warn(`Write operation blocked: ${toolName}`);
    return {
      success: false,
      error: 'Write operations are not allowed',
      message: '此操作不允许执行',
    };
  }

  try {
    if (!mcpManager || !mcpManagerReady) {
      throw new Error('MCP Manager not initialized');
    }

    const result = await mcpManager.callTool(toolName, args);
    const sanitized = sanitizeMCPResult(result);

    logger.info(`Tool execution successful: ${toolName}`);
    return formatMCPResultForGemini(sanitized);
  } catch (error) {
    const wrapped = wrapMCPError(error);
    logger.error(`Tool execution failed: ${toolName}`, wrapped);

    // Check if we should trigger fallback
    if (shouldTriggerFallback(error)) {
      logger.warn(`Triggering fallback for: ${toolName}`);
      return await executeToolFallback(toolName, args, logger);
    }

    return {
      success: false,
      error: wrapped.message,
      type: wrapped.type,
    };
  }
}

/**
 * Fallback tool execution using legacy Supabase client
 *
 * Used when MCP Server is unavailable or circuit breaker is open.
 */
async function executeToolFallback(
  toolName: string,
  args: Record<string, unknown>,
  logger: ReturnType<typeof createLogger>
): Promise<any> {
  logger.info(`Executing tool via fallback: ${toolName}`);

  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
        message: '数据库配置缺失',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map tool names to legacy handlers
    switch (toolName) {
      case 'supabase-player-grouping.query_players':
        return await handleQueryPlayers(supabase, args, logger);

      case 'supabase-player-grouping.query_matches':
        return await handleQueryMatches(supabase, args, logger);

      case 'supabase-player-grouping.query_stats':
        return await handleQueryStats(supabase, args, logger);

      default:
        return {
          success: false,
          error: `Unknown tool in fallback: ${toolName}`,
        };
    }
  } catch (error) {
    logger.error('Fallback execution failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fallback execution failed',
    };
  }
}

// ============================================================================
// Legacy Tool Handlers (for fallback)
// ============================================================================

async function handleQueryPlayers(
  supabase: any,
  args: Record<string, unknown>,
  logger: ReturnType<typeof createLogger>
): Promise<any> {
  // Validate input
  const validation = safeValidateInput(
    args.name ? PlayerQuerySchema : ListPlayersSchema,
    args
  );

  if (!validation.success) {
    return {
      success: false,
      error: formatZodError(validation.errors),
    };
  }

  const validated = validation.data as any;

  // Handle list all players
  if (!validated.player_name) {
    const limit = validated.limit || 100;
    const { data, error } = await supabase
      .from('players')
      .select('id, name, position, created_at')
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        players: data || [],
        count: data?.length || 0,
      },
    };
  }

  // Handle specific player query
  const basicInfo = await getPlayerBasicInfo(supabase, validated.player_name);

  if (!basicInfo || basicInfo.length === 0) {
    return {
      success: false,
      data: {
        message: `未找到球员 "${validated.player_name}"`,
        suggestion: '请确认球员姓名是否正确',
      },
    };
  }

  // Get detailed data for each matching player
  const playersWithData = await Promise.all(
    basicInfo.map(async (player: any) => {
      const skills = await getPlayerSkills(supabase, player.id);
      const recentMatches = await getPlayerRecentMatches(supabase, player.id, 5);
      const avgStats = await getPlayerAverageStats(supabase, player.id);

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        skills: skills || {},
        recent_matches: recentMatches || [],
        average_stats: avgStats,
        created_at: player.created_at,
      };
    })
  );

  return {
    success: true,
    data: {
      players: playersWithData,
      count: playersWithData.length,
    },
  };
}

async function handleQueryMatches(
  supabase: any,
  args: Record<string, unknown>,
  logger: ReturnType<typeof createLogger>
): Promise<any> {
  const validation = safeValidateInput(MatchQuerySchema, args);

  if (!validation.success) {
    return {
      success: false,
      error: formatZodError(validation.errors),
    };
  }

  const validated = validation.data as any;

  const result = await getMatchHistory(supabase, validated);

  return {
    success: true,
    data: {
      matches: result,
      count: result.length,
    },
  };
}

async function handleQueryStats(
  supabase: any,
  args: Record<string, unknown>,
  logger: ReturnType<typeof createLogger>
): Promise<any> {
  const validation = safeValidateInput(MatchAnalysisSchema, args);

  if (!validation.success) {
    return {
      success: false,
      error: formatZodError(validation.errors),
    };
  }

  const validated = validation.data as any;

  const analysis = await analyzeMatchPerformance(supabase, validated);

  return {
    success: true,
    data: analysis,
  };
}

// ============================================================================
// Message Conversion
// ============================================================================

/**
 * Convert messages from OpenAI format to Gemini format
 * Filters empty messages and merges consecutive same-role messages
 */
function convertToGeminiFormat(
  messages: Array<{ role: string; content: string }>
): Array<{ role: string; parts: Array<{ text: string }> }> {
  // Filter out empty content
  const filtered = messages.filter(
    (msg) => msg.content && msg.content.trim().length > 0
  );

  if (filtered.length === 0) {
    return [];
  }

  // Merge consecutive same-role messages
  const merged: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  filtered.forEach((msg) => {
    const role = msg.role === 'assistant' ? 'model' : 'user';

    if (merged.length > 0 && merged[merged.length - 1].role === role) {
      merged[merged.length - 1].parts[0].text += '\n' + msg.content;
    } else {
      merged.push({
        role,
        parts: [{ text: msg.content }],
      });
    }
  });

  return merged;
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const traceId = getTraceId(req.headers as Record<string, string | undefined>);
  const logger = createLogger(traceId);

  logger.info('Chat API request received', {
    method: req.method,
    contentType: req.headers['content-type'],
  });

  // CORS configuration
  const origin = req.headers.origin || '';
  const isVercelSubdomain = origin.endsWith('.vercel.app');
  const isLocalhost =
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');
  const isGithubPages = origin === 'https://julius19910613.github.io';

  if (isVercelSubdomain || isLocalhost || isGithubPages) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Trace-ID');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    logger.info('Preflight request handled');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({
      error: 'Method not allowed',
      message: '只支持 POST 请求',
    });
  }

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    'unknown') as string;
  const count = rateLimit.get(ip) || 0;

  if (count >= 10) {
    logger.warn('Rate limit exceeded', { ip });
    return res.status(429).json({
      error: 'Too many requests',
      message: '您的请求过于频繁，请 1 分钟后再试',
      retryAfter: 60,
    });
  }

  rateLimit.set(ip, count + 1);

  // Validate request body
  const { messages, enableFunctionCalling = true, stream = false } = req.body;

  if (!messages || !Array.isArray(messages)) {
    logger.warn('Invalid request body', { hasMessages: !!messages, isArray: Array.isArray(messages) });
    return res.status(400).json({
      error: 'Invalid request',
      message: '请求格式错误，需要提供 messages 数组',
    });
  }

  // Initialize Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not configured');
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务配置错误',
    });
  }

  logger.info('Initializing Gemini');

  let genAI: GoogleGenerativeAI;
  let model: any;

  try {
    genAI = new GoogleGenerativeAI(apiKey);

    // Get tools from MCP or use fallback
    let tools: FunctionDeclaration[] = [];
    let mcpManagerInstance: MCPClientManager | null = null;

    if (enableFunctionCalling) {
      try {
        mcpManagerInstance = await initMCPManager(logger);
        tools = toolsCache || [];

        // Log circuit breaker state
        const cbState = mcpManagerInstance.getCircuitBreakerState();
        if (cbState !== CircuitBreakerState.CLOSED) {
          logger.warn('Circuit breaker state', { state: cbState });
        }
      } catch (mcpError) {
        logger.error('MCP Manager initialization failed, using fallback tools', mcpError);
        tools = createFallbackTools();
      }
    }

    model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      systemInstruction: `你是篮球赛事智能助手，专门帮助用户管理篮球球员信息、查询比赛历史、分析比赛表现、进行球队分组等。

主要功能：
- 篮球球员管理（位置：后卫 PG/SG、前锋 SF/PF、中锋 C）
- 比赛数据统计（得分、篮板、助攻、抢断、盖帽、效率值）
- 智能分组算法（按技能、位置、随机分组）
- 比赛表现分析
- 联网搜索篮球相关信息

请注意：
1. 这是篮球应用，不是足球或其他运动
2. 使用中文回复
3. 保持专业、友好的语气
4. 如果用户询问的球员在数据库中不存在，提示用户先录入
5. 优先使用工具查询数据库中的球员数据
6. 如果数据库中没有数据，再使用联网搜索`,
    });

    logger.info('Gemini model initialized', {
      toolCount: tools.length,
      functionCallingEnabled: enableFunctionCalling,
    });
  } catch (initError) {
    logger.error('Failed to initialize Gemini', initError);
    return res.status(500).json({
      error: 'Initialization failed',
      message: 'Gemini API 初始化失败',
      details: initError instanceof Error ? initError.message : 'Unknown error',
    });
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
  });

  try {
    const geminiMessages = convertToGeminiFormat(messages);
    logger.info('Messages converted', { count: geminiMessages.length });

    // Streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const writeChunk = (text: string) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      };

      try {
        const childLogger = logger.child('stream');

        let result = (await Promise.race([
          model.generateContentStream({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
          timeoutPromise,
        ])) as any;

        let hasFunctionCall = false;
        let functionCallArgs = null;
        let functionCallParts = null;

        for await (const chunk of result.stream) {
          const functionCalls = chunk.functionCalls();
          if (functionCalls && functionCalls.length > 0) {
            hasFunctionCall = true;
            functionCallArgs = functionCalls[0];
            functionCallParts = chunk.candidates?.[0]?.content?.parts;
            break;
          }
          const text = chunk.text();
          if (text) {
            writeChunk(text);
          }
        }

        if (hasFunctionCall && functionCallArgs && enableFunctionCalling) {
          childLogger.info('Function call during stream', {
            name: functionCallArgs.name,
          });

          const toolResult = await executeToolViaMCP(
            functionCallArgs.name,
            functionCallArgs.args,
            childLogger
          );

          const functionResponseMessage = {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: functionCallArgs.name,
                  response: toolResult,
                },
              },
            ],
          };

          const secondResult = (await Promise.race([
            model.generateContentStream({
              contents: [
                ...geminiMessages,
                {
                  role: 'model',
                  parts:
                    functionCallParts || [{ functionCall: functionCallArgs }],
                },
                functionResponseMessage as any,
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
              },
            }),
            timeoutPromise,
          ])) as any;

          for await (const chunk of secondResult.stream) {
            const text = chunk.text();
            if (text) writeChunk(text);
          }
        }

        res.write('data: [DONE]\n\n');
        childLogger.info('Stream completed');
        return res.end();
      } catch (error) {
        logger.error('Stream error', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        return res.end();
      }
    }

    // Non-streaming response
    let result = (await Promise.race([
      model.generateContent({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
      timeoutPromise,
    ])) as any;

    let response = result;

    // Handle Function Calling
    if (enableFunctionCalling) {
      const functionCall = response.response.functionCalls()?.[0];

      if (functionCall) {
        logger.info('Function call detected', { name: functionCall.name });

        // Execute tool via MCP
        const toolResult = await executeToolViaMCP(
          functionCall.name,
          functionCall.args,
          logger
        );

        // Send tool result back to AI
        const functionResponseMessage = {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: toolResult,
              },
            },
          ],
        };

        result = (await Promise.race([
          model.generateContent({
            contents: [
              ...geminiMessages,
              {
                role: 'model',
                parts:
                  response.response.candidates?.[0]?.content?.parts || [
                    { functionCall },
                  ],
              },
              functionResponseMessage as any,
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
          timeoutPromise,
        ])) as any;

        response = result;
      }
    }

    const text = response.response.text();

    const responseData: any = {
      success: true,
      message: text,
      timestamp: new Date().toISOString(),
    };

    logger.info('Response sent successfully');
    return res.status(200).json(responseData);
  } catch (error: unknown) {
    logger.error('Chat API error', error);

    // Handle timeout
    if (error instanceof Error && error.message === 'Timeout') {
      return res.status(408).json({
        error: 'Request timeout',
        message: '请求超时，请尝试简化问题或使用快捷命令',
        suggestion: '建议使用以下快捷命令：',
        fallbackActions: [
          '📊 查看所有球员',
          '🎯 快速分组',
          '📈 查看统计',
        ],
      });
    }

    // Handle API errors
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      (error as any).status === 429
    ) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'API 调用频率超限，请稍后重试',
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务暂时不可用，请稍后重试',
    });
  }
}
