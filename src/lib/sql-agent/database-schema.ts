/**
 * Database Schema Definition for SQL Query Agent
 *
 * This module provides the actual database schema with detailed
 * descriptions to help AI understand the data structure better.
 */

/**
 * Complete database schema for all tables
 */
export const DATABASE_SCHEMA = {
  players: {
    tableName: 'players',
    primaryKey: 'id',
    columns: {
      id: {
        name: 'id',
        type: 'UUID',
        description: '球员唯一标识符',
        nullable: false,
      },
      user_id: {
        name: 'user_id',
        type: 'UUID',
        description: '所属用户ID (关联auth.users表)',
        nullable: true,
        foreignKey: { table: 'auth.users', column: 'id', onDelete: 'CASCADE' },
      },
      name: {
        name: 'name',
        type: 'TEXT',
        description: '球员姓名',
        nullable: false,
      },
      position: {
        name: 'position',
        type: 'TEXT',
        description: '球员位置：PG/SG/SF/PF/C/UTILITY',
        nullable: false,
        enum: ['PG', 'SG', 'SF', 'PF', 'C', 'UTILITY'],
        enumLabels: {
          PG: '控卫',
          SG: '得分后卫',
          SF: '小前锋',
          PF: '大前锋',
          C: '中锋',
          UTILITY: '全能位',
        },
      },
      created_at: {
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        description: '创建时间',
        nullable: false,
      },
      updated_at: {
        name: 'updated_at',
        type: 'TIMESTAMPTZ',
        description: '最后更新时间',
        nullable: false,
      },
    },
  },

  player_skills: {
    tableName: 'player_skills',
    primaryKey: 'player_id',
    foreignKey: {
      column: 'player_id',
      references: { table: 'players', column: 'id' },
    },
    columns: {
      player_id: {
        name: 'player_id',
        type: 'UUID',
        description: '球员ID，外键关联players.id',
        nullable: false,
      },
      // 投篮能力 (4项)
      two_point_shot: {
        name: 'two_point_shot',
        type: 'INTEGER',
        description: '二分球投篮能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      three_point_shot: {
        name: 'three_point_shot',
        type: 'INTEGER',
        description: '三分球投篮能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      free_throw: {
        name: 'free_throw',
        type: 'INTEGER',
        description: '罚球能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      // 组织能力 (3项)
      passing: {
        name: 'passing',
        type: 'INTEGER',
        description: '传球能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      ball_control: {
        name: 'ball_control',
        type: 'INTEGER',
        description: '控球能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      court_vision: {
        name: 'court_vision',
        type: 'INTEGER',
        description: '球场视野 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      // 防守能力 (4项)
      perimeter_defense: {
        name: 'perimeter_defense',
        type: 'INTEGER',
        description: '外线防守能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      interior_defense: {
        name: 'interior_defense',
        type: 'INTEGER',
        description: '内线防守能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      steals: {
        name: 'steals',
        type: 'INTEGER',
        description: '抢断能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      blocks: {
        name: 'blocks',
        type: 'INTEGER',
        description: '盖帽能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      // 篮板能力 (2项)
      offensive_rebound: {
        name: 'offensive_rebound',
        type: 'INTEGER',
        description: '进攻篮板能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      defensive_rebound: {
        name: 'defensive_rebound',
        type: 'INTEGER',
        description: '防守篮板能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      // 身体素质 (4项)
      speed: {
        name: 'speed',
        type: 'INTEGER',
        description: '速度能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      strength: {
        name: 'strength',
        type: 'INTEGER',
        description: '力量能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      stamina: {
        name: 'stamina',
        type: 'INTEGER',
        description: '体能/耐力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      vertical: {
        name: 'vertical',
        type: 'INTEGER',
        description: '弹跳能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      // 篮球智商 (3项)
      basketball_iq: {
        name: 'basketball_iq',
        type: 'INTEGER',
        description: '篮球智商 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      teamwork: {
        name: 'teamwork',
        type: 'INTEGER',
        description: '团队配合能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      clutch: {
        name: 'clutch',
        type: 'INTEGER',
        description: '关键时刻能力 (1-99)',
        nullable: false,
        range: { min: 1, max: 99 },
      },
      // 综合评分 (自动计算)
      overall: {
        name: 'overall',
        type: 'INTEGER',
        description: '综合评分 (1-99)，由数据库触发器根据位置加权自动计算，无需手动指定',
        nullable: false,
        range: { min: 1, max: 99 },
        computed: true,
        calculationMethod: '根据球员位置加权计算不同能力的重要性',
      },
      updated_at: {
        name: 'updated_at',
        type: 'TIMESTAMPTZ',
        description: '最后更新时间',
        nullable: false,
      },
    },
  },

  matches: {
    tableName: 'matches',
    primaryKey: 'id',
    columns: {
      id: {
        name: 'id',
        type: 'UUID',
        description: '比赛唯一标识符',
        nullable: false,
      },
      user_id: {
        name: 'user_id',
        type: 'UUID',
        description: '所属用户ID',
        nullable: true,
      },
      match_date: {
        name: 'date',
        type: 'DATE',
        description: '比赛日期',
        nullable: false,
      },
      venue: {
        name: 'venue',
        type: 'TEXT',
        description: '比赛场地',
        nullable: true,
      },
      mode: {
        name: 'mode',
        type: 'TEXT',
        description: '比赛模式：5v5/3v3/custom',
        nullable: false,
        enum: ['5v5', '3v3', 'custom'],
      },
      teams: {
        name: 'teams',
        type: 'JSONB',
        description: '队伍配置（JSON格式）',
        nullable: false,
      },
      result: {
        name: 'result',
        type: 'JSONB',
        description: '比赛结果（JSON格式）',
        nullable: false,
      },
      notes: {
        name: 'notes',
        type: 'TEXT',
        description: '备注信息',
        nullable: true,
      },
      created_at: {
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        description: '创建时间',
        nullable: false,
      },
      updated_at: {
        name: 'updated_at',
        type: 'TIMESTAMPTZ',
        description: '最后更新时间',
        nullable: false,
      },
    },
  },

  player_match_stats: {
    tableName: 'player_match_stats',
    primaryKey: 'id',
    foreignKeys: [
      {
        column: 'match_id',
        references: { table: 'matches', column: 'id' },
      },
      {
        column: 'player_id',
        references: { table: 'players', column: 'id' },
      },
    ],
    columns: {
      id: {
        name: 'id',
        type: 'UUID',
        description: '统计记录唯一标识符',
        nullable: false,
      },
      match_id: {
        name: 'match_id',
        type: 'UUID',
        description: '比赛ID，外键关联matches.id',
        nullable: false,
      },
      player_id: {
        name: 'player_id',
        type: 'UUID',
        description: '球员ID，外键关联players.id',
        nullable: false,
      },
      team: {
        name: 'team',
        type: 'TEXT',
        description: '球员所在队伍：team_a/team_b',
        nullable: false,
        enum: ['team_a', 'team_b'],
        enumLabels: {
          team_a: 'A队',
          team_b: 'B队',
        },
      },
      // 基础统计
      points: {
        name: 'points',
        type: 'INTEGER',
        description: '得分',
        nullable: true,
      },
      rebounds: {
        name: 'rebounds',
        type: 'INTEGER',
        description: '篮板',
        nullable: true,
      },
      assists: {
        name: 'assists',
        type: 'INTEGER',
        description: '助攻',
        nullable: true,
      },
      steals: {
        name: 'steals',
        type: 'INTEGER',
        description: '抢断',
        nullable: true,
      },
      blocks: {
        name: 'blocks',
        type: 'INTEGER',
        description: '盖帽',
        nullable: true,
      },
      turnovers: {
        name: 'turnovers',
        type: 'INTEGER',
        description: '失误',
        nullable: true,
      },
      fouls: {
        name: 'fouls',
        type: 'INTEGER',
        description: '犯规',
        nullable: true,
      },
      minutes_played: {
        name: 'minutes_played',
        type: 'INTEGER',
        description: '上场时间（分钟）',
        nullable: true,
      },
      // 投篮数据
      field_goals_made: {
        name: 'field_goals_made',
        type: 'INTEGER',
        description: '投篮命中数',
        nullable: true,
      },
      field_goals_attempted: {
        name: 'field_goals_attempted',
        type: 'INTEGER',
        description: '投篮出手数',
        nullable: true,
      },
      three_pointers_made: {
        name: 'three_pointers_made',
        type: 'INTEGER',
        description: '三分命中数',
        nullable: true,
      },
      three_pointers_attempted: {
        name: 'three_pointers_attempted',
        type: 'INTEGER',
        description: '三分出手数',
        nullable: true,
      },
      free_throws_made: {
        name: 'free_throws_made',
        type: 'INTEGER',
        description: '罚球命中数',
        nullable: true,
      },
      free_throws_attempted: {
        name: 'free_throws_attempted',
        type: 'INTEGER',
        description: '罚球出手数',
        nullable: true,
      },
      // 高级数据
      plus_minus: {
        name: 'plus_minus',
        type: 'INTEGER',
        description: '正负值（+/-）',
        nullable: true,
      },
      efficiency_rating: {
        name: 'efficiency_rating',
        type: 'FLOAT',
        description: '效率评分',
        nullable: true,
      },
      created_at: {
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        description: '创建时间',
        nullable: false,
      },
      updated_at: {
        name: 'updated_at',
        type: 'TIMESTAMPTZ',
        description: '最后更新时间',
        nullable: false,
      },
    },
  },

  grouping_history: {
    tableName: 'grouping_history',
    primaryKey: 'id',
    columns: {
      id: {
        name: 'id',
        type: 'BIGINT',
        description: '分组历史记录ID（自增）',
        nullable: false,
      },
      user_id: {
        name: 'user_id',
        type: 'UUID',
        description: '所属用户ID',
        nullable: true,
      },
      created_at: {
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        description: '创建时间',
        nullable: false,
      },
      mode: {
        name: 'mode',
        type: 'TEXT',
        description: '分组模式：5v5/3v3/custom',
        nullable: false,
        enum: ['5v5', '3v3', 'custom'],
      },
      team_count: {
        name: 'team_count',
        type: 'INTEGER',
        description: '队伍数量',
        nullable: false,
      },
      player_count: {
        name: 'player_count',
        type: 'INTEGER',
        description: '球员数量',
        nullable: false,
      },
      balance_score: {
        name: 'balance_score',
        type: 'REAL',
        description: '平衡度评分（0-100）',
        nullable: true,
      },
      data: {
        name: 'data',
        type: 'JSONB',
        description: '分组详细数据（JSON格式）',
        nullable: false,
      },
      note: {
        name: 'note',
        type: 'TEXT',
        description: '备注信息',
        nullable: true,
      },
    },
  },
} as const;

/**
 * Get table information for a specific table name
 */
export function getTableSchema(tableName: string) {
  return DATABASE_SCHEMA[tableName as keyof typeof DATABASE_SCHEMA];
}

/**
 * Get all table names in the schema
 */
export function getAllTableNames(): string[] {
  return Object.keys(DATABASE_SCHEMA);
}

/**
 * Format schema as a string for prompt injection
 */
export function formatSchemaForPrompt(): string {
  const tableDescriptions = Object.entries(DATABASE_SCHEMA).map(([tableName, schema]) => {
    const columnsList = Object.entries(schema.columns)
      .map(([name, info]) => {
        let desc = `  - ${name} (${info.type})`;
        if (info.description) {
          desc += `: ${info.description}`;
        }
        if (info.enum) {
          desc += ` [${info.enum.join('|')}]`;
        }
        if (info.foreignKey) {
          desc += ` → ${info.foreignKey.table}.${info.foreignKey.column}`;
        }
        if (info.computed) {
          desc += ` (自动${info.calculationMethod || '计算'})`;
        }
        if (!info.nullable) {
          desc += ' 必填';
        }
        return desc;
      })
      .join('\n');

    return `## ${schema.tableName} (${schema.primaryKey}为主键)\n${columnsList}`;
  }).join('\n\n');

  return tableDescriptions;
}
