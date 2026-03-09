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
    description: "【优先使用】查询用户私有数据库中的球员信息。这是用户自己录入的球员（如朋友、队友等），包含技能等级、位置等详细数据。当用户询问某个球员时，应优先使用此工具查询。",
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
    name: "get_match_history",
    description: "查询比赛历史记录，支持按日期范围、球员筛选",
    parameters: {
      type: "object" as const,
      properties: {
        player_name: {
          type: "string" as const,
          description: "球员姓名（可选，筛选特定球员参与的比赛）"
        },
        date_from: {
          type: "string" as const,
          description: "起始日期（YYYY-MM-DD，可选）"
        },
        date_to: {
          type: "string" as const,
          description: "结束日期（YYYY-MM-DD，可选）"
        },
        limit: {
          type: "number" as const,
          description: "返回数量（默认 10，最大 50）"
        }
      }
    }
  },
  {
    name: "compare_players",
    description: "对比多名球员的能力和比赛数据",
    parameters: {
      type: "object" as const,
      properties: {
        player_names: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "球员姓名列表（2-5 个）"
        },
        criteria: {
          type: "array" as const,
          items: { 
            type: "string" as const,
            enum: ["skills", "stats", "all"]
          },
          description: "对比维度（默认 all）"
        }
      },
      required: ["player_names"]
    }
  },
  {
    name: "analyze_match_performance",
    description: "分析单场比赛的整体表现或特定球员表现",
    parameters: {
      type: "object" as const,
      properties: {
        match_id: {
          type: "string" as const,
          description: "比赛ID（可选）"
        },
        match_date: {
          type: "string" as const,
          description: "比赛日期（YYYY-MM-DD，可选）"
        },
        player_name: {
          type: "string" as const,
          description: "球员姓名（可选，聚焦特定球员）"
        },
        analysis_type: {
          type: "string" as const,
          enum: ["overview", "individual", "team_comparison"],
          description: "分析类型（默认 overview）"
        }
      }
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
export type ToolName = 'get_player_stats' | 'get_match_history' | 'compare_players' | 'analyze_match_performance' | 'calculate_grouping';
