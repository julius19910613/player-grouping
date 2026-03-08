/**
 * Tool Definitions for Gemini Function Calling
 * 
 * 定义 AI 可以调用的工具函数
 */

/**
 * Tool definitions for Gemini API
 * Note: Using any for parameters because Gemini's SchemaType is complex
 */
export const tools = [
  {
    name: "get_player_stats",
    description: "【优先使用】查询用户私有数据库中的球员信息。这是用户自己录入的球员（如朋友、队友等），包含技能等级、位置等详细数据。当用户询问某个球员时，应优先使用此工具查询，而不是联网搜索。",
    parameters: {
      type: "object" as const,
      properties: {
        player_name: {
          type: "string" as const,
          description: "球员姓名（支持模糊匹配）"
        },
        season: {
          type: "string" as const,
          description: "赛季（暂未使用，保留参数以兼容）"
        }
      },
      required: ["player_name"]
    }
  },
  {
    name: "search_web",
    description: "【降级使用】联网搜索公开的篮球信息，例如 NBA 球星、比赛新闻等。只有在私有数据库查询不到时才使用此工具。注意：此工具无法查询用户录入的球员数据。",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "搜索关键词，例如 'NBA 最新交易'、'湖人队 詹姆斯 数据'"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "calculate_grouping",
    description: "根据球员技能、位置或随机方式计算球员分组方案",
    parameters: {
      type: "object" as const,
      properties: {
        players: {
          type: "array" as const,
          items: {
            type: "string" as const
          },
          description: "球员姓名列表"
        },
        criteria: {
          type: "string" as const,
          enum: ["skill", "position", "random"],
          description: "分组标准：skill=按技能水平，position=按位置，random=随机分组"
        }
      },
      required: ["players"]
    }
  }
];

/**
 * Tool call result type
 */
export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Tool name type
 */
export type ToolName = 'get_player_stats' | 'search_web' | 'calculate_grouping';
