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
    description: "获取球员统计数据，包括比赛场次、得分、篮板、助攻等信息",
    parameters: {
      type: "object" as const,
      properties: {
        player_name: {
          type: "string" as const,
          description: "球员姓名"
        },
        season: {
          type: "string" as const,
          description: "赛季，例如 2023-24"
        }
      },
      required: ["player_name"]
    }
  },
  {
    name: "search_web",
    description: "联网搜索最新的篮球相关信息，例如球员新闻、比赛结果、统计数据等",
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
