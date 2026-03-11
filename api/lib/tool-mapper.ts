/**
 * Tool Mapper
 *
 * Converts MCP Tool format to Gemini FunctionDeclaration format.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FunctionDeclaration } from '@google/generative-ai';

/**
 * Convert MCP Tool to Gemini FunctionDeclaration
 *
 * @param tool - MCP Tool object
 * @returns Gemini FunctionDeclaration object
 */
export function mcpToolToGeminiFunction(tool: Tool): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema as any,
  };
}

/**
 * Convert array of MCP Tools to Gemini FunctionDeclarations
 *
 * @param tools - Array of MCP Tool objects
 * @returns Array of Gemini FunctionDeclaration objects
 */
export function mcpToolsToGeminiFunctions(tools: Tool[]): FunctionDeclaration[] {
  return tools.map(mcpToolToGeminiFunction);
}

/**
 * Create a fallback tool definition for legacy compatibility
 *
 * This is used when MCP Server is unavailable and we need to
 * provide basic query tools.
 */
export function createFallbackTools(): FunctionDeclaration[] {
  return [
    {
      name: 'search_players',
      description: '搜索球员信息（降级模式）- 在 MCP Server 不可用时使用',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词（球员姓名）',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_match_summary',
      description: '获取比赛摘要（降级模式）- 在 MCP Server 不可用时使用',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回的比赛数量',
          },
        },
      },
    },
  ];
}

/**
 * Map legacy tool names to MCP tool names
 *
 * Used for backward compatibility with existing function calls
 */
export const LEGACY_TOOL_MAPPING: Record<string, string | string[]> = {
  'get_player_stats': 'supabase-player-grouping.query_players',
  'list_all_players': 'supabase-player-grouping.query_players',
  'get_match_history': 'supabase-player-grouping.query_matches',
  'compare_players': ['supabase-player-grouping.query_players'], // Multiple calls needed
  'analyze_match_performance': 'supabase-player-grouping.query_stats',
};

/**
 * Convert legacy tool name to MCP tool name(s)
 *
 * @param legacyName - Legacy tool name
 * @returns MCP tool name or array of names
 */
export function legacyToMCPToolName(legacyName: string): string | string[] | null {
  return LEGACY_TOOL_MAPPING[legacyName] || null;
}

/**
 * Check if a tool is write operation (should be blocked)
 *
 * @param toolName - Tool name to check
 * @returns True if tool is a write operation
 */
export function isWriteOperation(toolName: string): boolean {
  const writeOperations = ['insert', 'update', 'delete', 'create', 'modify', 'remove'];
  const lowerName = toolName.toLowerCase();
  return writeOperations.some(op => lowerName.includes(op));
}

/**
 * Sanitize MCP tool result for safe response
 *
 * Filters out sensitive data and ensures consistent format
 *
 * @param result - Raw MCP tool result
 * @returns Sanitized result object
 */
export function sanitizeMCPResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'email',
    'phone',
    'auth_token',
    'api_key',
    'secret',
    'internal_notes',
  ];

  const sanitized = { ...result };

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      delete sanitized[key];
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMCPResult(value);
    }
  }

  return sanitized;
}

/**
 * Format MCP tool result for Gemini response
 *
 * @param toolResult - Raw MCP tool result
 * @returns Formatted result object
 */
export function formatMCPResultForGemini(toolResult: any): any {
  return {
    success: true,
    data: sanitizeMCPResult(toolResult),
  };
}
