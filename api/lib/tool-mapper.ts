/**
 * Tool Mapper
 *
 * Converts MCP Tool format to Gemini FunctionDeclaration format.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FunctionDeclaration } from '@google/generative-ai';

/**
 * Remove MCP-specific JSON Schema fields that Gemini doesn't support
 *
 * @param schema - JSON Schema object
 * @returns Cleaned schema object
 */
function removeMcpSpecificFields(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  const result = { ...schema };

  // Remove fields that Gemini doesn't support
  const fieldsToRemove = ['$schema', '$id', '$comment', 'additionalProperties', 'allOf', 'anyOf', 'oneOf', 'not'];
  for (const field of fieldsToRemove) {
    delete result[field];
  }

  // Recursively clean nested objects
  if (result.properties && typeof result.properties === 'object') {
    result.properties = {};
    for (const [key, value] of Object.entries(schema.properties || {})) {
      result.properties[key] = removeMcpSpecificFields(value);
    }
  }

  if (result.items && typeof result.items === 'object') {
    result.items = removeMcpSpecificFields(result.items);
  }

  // Clean array items if they're an array of schemas
  if (Array.isArray(result.items)) {
    result.items = result.items.map((item: any) => removeMcpSpecificFields(item));
  }

  return result;
}

/**
 * Convert MCP Tool to Gemini FunctionDeclaration
 *
 * @param tool - MCP Tool object
 * @returns Gemini FunctionDeclaration object
 */
export function mcpToolToGeminiFunction(tool: Tool): FunctionDeclaration {
  // First remove MCP-specific fields
  const cleanedSchema = removeMcpSpecificFields(tool.inputSchema);

  return {
    name: tool.name,
    description: tool.description || '',
    parameters: cleanedSchema,
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
      name: 'execute_sql',
      description: '执行 SQL 查询（降级模式）- 在 MCP Server 不可用时使用直接数据库查询',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL 查询语句',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_tables',
      description: '列出数据库中所有表（降级模式）',
      parameters: {
        type: 'object',
        properties: {},
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
