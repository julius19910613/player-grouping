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

// SQL Agent (for natural language to SQL queries)
import {
  SQLQueryAgent,
  getOrCreateSQLAgent,
  type QueryResult,
} from '../src/lib/sql-agent/sql-query-agent.js';

// ============================================================================
// Configuration
// ============================================================================

// Vercel Function timeout configuration (10s max for Hobby Plan)
export const config = {
  runtime: 'edge',
  regions: ['hnd1'], // Tokyo region, close to Supabase
  maxDuration: 10,
};

// ============================================================================
// Database Intent Detection
// ============================================================================

/**
 * Database query intent detection
 *
 * Determines if a user message requires a database query based on keywords.
 *
 * @param message - User message
 * @returns true if database query is needed, false otherwise
 */
function detectDBIntent(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const keywords = [
    '球员',
    '水平',
    '能力',
    '位置',
    '技能',
    '最厉害',
    '最强',
    '排名',
    '比较',
    '统计',
    '得分',
    '防守',
    '传球',
    '投篮',
    '篮板',
    '骚当',
    '谁',
    '多少',
    '几个',
    '查询',
    '显示',
    '列出',
    '最高',
    '最低',
    '平均',
    'total',
    'count',
    'overall',
  ];

  return keywords.some((kw) => message.includes(kw));
}

/**
 * Check if database features are enabled
 *
 * @returns true if SQL Agent should be used
 */
function isDBEnabled(): boolean {
  // Check if DB password is configured
  const hasPassword = !!process.env.SUPABASE_DB_PASSWORD;

  // Check if DB feature is explicitly disabled
  const isDisabled = process.env.ENABLE_SQL_AGENT === 'false';

  return hasPassword && !isDisabled;
}

// ============================================================================
// Global State (Vercel warm-reuse pattern)
// ============================================================================

let sqlAgent: SQLQueryAgent | null = null;

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

  // If MCP Manager is not ready, go directly to fallback
  if (!mcpManager || !mcpManagerReady) {
    logger.warn(`MCP Manager not ready, using fallback for: ${toolName}`);
    return await executeToolFallback(toolName, args, logger);
  }

  try {
    const result = await mcpManager.callTool(toolName, args);
    const sanitized = sanitizeMCPResult(result);

    logger.info(`Tool execution successful: ${toolName}`);
    return formatMCPResultForGemini(sanitized);
  } catch (error) {
    const wrapped = wrapMCPError(error);
    logger.error(`Tool execution failed: ${toolName}`, wrapped);

    // Always fall back to direct Supabase queries on any error
    logger.warn(`Triggering fallback for: ${toolName}`);
    return await executeToolFallback(toolName, args, logger);
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
  logger.info(`Executing tool via fallback: ${toolName}`, { args });

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

    // Map tool names to handlers (supports both MCP tool names and legacy names)
    switch (toolName) {
      // MCP tool: execute_sql - execute a raw SQL query via Supabase RPC
      case 'execute_sql': {
        const sql = (args.query || args.sql) as string;
        if (!sql) {
          return { success: false, error: 'Missing query parameter' };
        }
        logger.info(`Fallback execute_sql: ${sql}`);
        const { data, error } = await supabase.rpc('execute_sql', { query: sql }).maybeSingle();
        if (error) {
          // rpc might not exist, try direct query for simple selects
          logger.warn('execute_sql RPC failed, trying direct query', { error: error.message });
          return await handleDirectQuery(supabase, sql, logger);
        }
        return { success: true, data };
      }

      // MCP tool: list_tables - list database tables
      case 'list_tables': {
        const { data, error } = await supabase
          .from('information_schema.tables' as any)
          .select('table_name')
          .eq('table_schema', 'public');
        if (error) {
          // Fallback: return known table names
          return {
            success: true,
            data: {
              tables: ['players', 'player_skills', 'matches', 'player_match_stats', 'grouping_history'],
            },
          };
        }
        return { success: true, data: { tables: data.map((t: any) => t.table_name) } };
      }

      // Legacy MCP tool names
      case 'supabase-player-grouping.query_players':
      case 'search_players':
        return await handleQueryPlayers(supabase, args, logger);

      case 'supabase-player-grouping.query_matches':
      case 'get_match_summary':
        return await handleQueryMatches(supabase, args, logger);

      case 'supabase-player-grouping.query_stats':
        return await handleQueryStats(supabase, args, logger);

      default:
        logger.warn(`Unknown tool in fallback: ${toolName}`);
        return {
          success: false,
          error: `未知的工具: ${toolName}`,
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
// Direct SQL Query Handler (for fallback when RPC not available)
// ============================================================================

/**
 * Handle direct SQL queries via Supabase client
 *
 * Parses simple SELECT queries and executes via Supabase client API.
 * Used as last-resort fallback when MCP and execute_sql RPC are unavailable.
 */
async function handleDirectQuery(
  supabase: any,
  sql: string,
  logger: ReturnType<typeof createLogger>
): Promise<any> {
  logger.info(`handleDirectQuery: ${sql}`);

  try {
    // Handle COUNT queries
    const countMatch = sql.match(/SELECT\s+COUNT\(\*\)(?:\s+AS\s+\w+)?\s+FROM\s+(\w+)/i);
    if (countMatch) {
      const tableName = countMatch[1];
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: [{ count }] };
    }

    // Handle simple SELECT queries with optional WHERE, ORDER BY, LIMIT
    // This regex captures: columns, table, whereClause, orderBy, limit
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

    if (selectMatch) {
      const [, columns, tableName, whereClause, orderBy, limitStr] = selectMatch;
      const selectColumns = columns.trim() === '*' ? '*' : columns.trim();
      let query = supabase.from(tableName).select(selectColumns);

      // Parse and apply WHERE clause
      if (whereClause) {
        const filters = parseWhereClause(whereClause, logger);
        for (const filter of filters) {
          if (filter.operator === 'ilike') {
            query = query.ilike(filter.column, filter.value);
          } else if (filter.operator === 'like') {
            query = query.like(filter.column, filter.value);
          } else if (filter.operator === 'eq') {
            query = query.eq(filter.column, filter.value);
          } else if (filter.operator === 'neq') {
            query = query.neq(filter.column, filter.value);
          } else if (filter.operator === 'gt') {
            query = query.gt(filter.column, filter.value);
          } else if (filter.operator === 'gte') {
            query = query.gte(filter.column, filter.value);
          } else if (filter.operator === 'lt') {
            query = query.lt(filter.column, filter.value);
          } else if (filter.operator === 'lte') {
            query = query.lte(filter.column, filter.value);
          }
        }
      }

      // Apply ORDER BY
      if (orderBy) {
        const orderParts = orderBy.trim().split(/\s+/);
        const orderColumn = orderParts[0];
        const ascending = orderParts[1]?.toUpperCase() !== 'DESC';
        query = query.order(orderColumn, { ascending });
      }

      // Apply LIMIT
      const limit = limitStr ? parseInt(limitStr, 10) : 100;
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data || [] };
    }

    // Handle JOIN queries for player with skills
    // Pattern: SELECT ... FROM players p LEFT JOIN player_skills ps ON p.id = ps.player_id WHERE ...
    const joinMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+players\s+(?:\w+\s+)?(?:LEFT\s+)?JOIN\s+player_skills\s+\w+\s+ON\s+[^W]+(?:WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

    if (joinMatch) {
      const [, , whereClause, orderBy, limitStr] = joinMatch;
      logger.info('Detected JOIN query, using Supabase relation');

      // Use Supabase's embedded select for joins
      let query = supabase
        .from('players')
        .select('*, player_skills(*)');

      // Parse and apply WHERE clause for players table
      if (whereClause) {
        const filters = parseWhereClause(whereClause, logger);
        for (const filter of filters) {
          if (filter.column.toLowerCase().includes('name')) {
            if (filter.operator === 'ilike' || filter.operator === 'like') {
              query = query.ilike('name', filter.value);
            } else if (filter.operator === 'eq') {
              query = query.eq('name', filter.value);
            }
          }
        }
      }

      const limit = limitStr ? parseInt(limitStr, 10) : 10;
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data || [] };
    }

    // If query can't be parsed, return an error with guidance
    return {
      success: false,
      error: `无法在降级模式下解析此 SQL 查询。请尝试更简单的查询。`,
    };
  } catch (error) {
    logger.error('handleDirectQuery failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Direct query failed',
    };
  }
}

/**
 * Parse SQL WHERE clause into filter objects
 *
 * Supports: ILIKE, LIKE, =, !=, >, >=, <, <=
 */
function parseWhereClause(
  whereClause: string,
  logger: ReturnType<typeof createLogger>
): Array<{ column: string; operator: string; value: any }> {
  const filters: Array<{ column: string; operator: string; value: any }> = [];

  // Split by AND (simple implementation, doesn't handle complex cases)
  const conditions = whereClause.split(/\s+AND\s+/i);

  for (const condition of conditions) {
    // Match: column ILIKE 'value' or column = 'value' etc.
    const match = condition.match(/(\w+(?:\.\w+)?)\s*(ILIKE|LIKE|=|!=|<>|>=|<=|>|<)\s*'([^']*)'/i);

    if (match) {
      const [, column, operator, value] = match;

      // Normalize column name (remove table prefix if present)
      const normalizedColumn = column.includes('.')
        ? column.split('.')[1]
        : column;

      // Normalize operator
      let normalizedOperator = operator.toLowerCase();
      if (normalizedOperator === '<>') normalizedOperator = 'neq';
      else if (normalizedOperator === '=') normalizedOperator = 'eq';
      else if (normalizedOperator === '!=') normalizedOperator = 'neq';
      else if (normalizedOperator === '>=') normalizedOperator = 'gte';
      else if (normalizedOperator === '<=') normalizedOperator = 'lte';
      else if (normalizedOperator === '>') normalizedOperator = 'gt';
      else if (normalizedOperator === '<') normalizedOperator = 'lt';

      filters.push({
        column: normalizedColumn,
        operator: normalizedOperator,
        value: value,
      });

      logger.info('Parsed filter', { column: normalizedColumn, operator: normalizedOperator, value });
    }
  }

  return filters;
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

  // Get the latest user message
  const lastMessage = messages[messages.length - 1];
  const userMessage = lastMessage?.content || '';

  // Check if database query is needed
  if (isDBEnabled() && detectDBIntent(userMessage)) {
    logger.info('Database query detected, using SQL Agent');

    try {
      // Initialize SQL Agent
      if (!sqlAgent) {
        sqlAgent = getOrCreateSQLAgent();
        await sqlAgent.initialize();
      }

      // Query the database
      const queryResult: QueryResult = await sqlAgent.query(userMessage);

      if (!queryResult.success) {
        logger.warn('SQL Agent query failed', { error: queryResult.error });

        // Fall back to normal chat flow if SQL Agent fails
        // (continue to the normal chat logic below)
      } else {
        logger.info('SQL Agent query successful', {
          rowCount: queryResult.rowCount,
          sql: queryResult.sql,
        });

        // Use Gemini to generate natural language response
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.1-flash-lite-preview',
        });

        const prompt = `
用户问：${userMessage}

数据库查询结果：
${JSON.stringify(queryResult.data, null, 2)}

请用自然、友好的语言回答用户的问题，基于查询结果给出详细说明。
如果数据为空，说明没有找到相关信息。
不要提及 SQL 或技术细节。
使用中文回复。
`;

        const geminiResult = await model.generateContent(prompt);
        const response = geminiResult.response.text();

        return res.status(200).json({
          success: true,
          message: response,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'sql-agent',
            sql: queryResult.sql, // Only for debugging
            rowCount: queryResult.rowCount,
          },
        });
      }
    } catch (dbError) {
      logger.error('SQL Agent error, falling back to normal chat', dbError);
      // Continue to normal chat flow
    }
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
      const mcpEnabled = process.env.ENABLE_MCP !== 'false';

      if (mcpEnabled) {
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
      } else {
        logger.info('MCP disabled via ENABLE_MCP=false, using fallback tools');
        tools = createFallbackTools();
      }
    }

    model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      systemInstruction: `你是篮球赛事智能助手，帮助用户管理篮球球员信息、查询比赛数据、分析比赛表现、进行球队分组。

可用的数据库工具：
1. list_tables - 列出数据库表
2. execute_sql - 执行 SQL 查询（这是最常用的查询工具），参数名为 query（不是 sql）

常用表名：
- players（球员信息表）
- player_skills（球员技能表）
- matches（比赛记录表）
- player_match_stats（比赛统计表）
- grouping_history（分组历史表）

调用示例（注意参数名是 query）：
1. 查询球员数量：execute_sql({ query: "SELECT COUNT(*) AS total FROM players" })
2. 查询前5个球员：execute_sql({ query: "SELECT id, name, position FROM players ORDER BY created_at DESC LIMIT 5" })
3. 查询球员详情：execute_sql({ query: "SELECT p.*, ps.* FROM players p LEFT JOIN player_skills ps ON p.id = ps.player_id WHERE p.name = '姓名'" })
4. 查询比赛：execute_sql({ query: "SELECT * FROM matches ORDER BY date DESC LIMIT 10" })
5. 查询统计：execute_sql({ query: "SELECT * FROM player_match_stats WHERE match_id = 'xxx'" })

重要规则：
- 你已经正确连接到数据库，可以直接执行查询，不要说没有权限或无法连接
- 对于"查询有多少条"这类问题，直接使用 execute_sql 执行 SELECT COUNT(*) FROM 表名
- 对于"列出前N个"这类问题，直接使用 execute_sql 执行 SELECT ... LIMIT N
- 不要在调用 list_tables 后停止，要继续调用 execute_sql 完成用户的查询
- 查询结果为空时，友好提示用户数据库中暂无数据
- 使用中文回复
- 这是一个篮球应用，不是足球或其他运动`,
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
