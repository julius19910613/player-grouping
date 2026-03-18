/**
 * Supabase Query Builder
 *
 * This module provides a type-safe query builder for Supabase that:
 * 1. Uses structured parameters instead of raw SQL
 * 2. Validates table and column names against schema
 * 3. Constructs queries programmatically with proper Supabase JS syntax
 *
 * This eliminates SQL generation errors by building queries through code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Database schema definition
 */
export const DATABASE_SCHEMA = {
  players: {
    columns: [
      'id',
      'name',
      'position',
      'created_at',
      'updated_at',
    ],
    relations: {
      player_skills: {
        table: 'player_skills',
        foreignKey: 'player_id',
        columns: [
          'player_id',
          'two_point_shot',
          'three_point_shot',
          'free_throw',
          'passing',
          'ball_control',
          'court_vision',
          'perimeter_defense',
          'interior_defense',
          'steals',
          'blocks',
          'offensive_rebound',
          'defensive_rebound',
          'speed',
          'strength',
          'stamina',
          'vertical',
          'basketball_iq',
          'teamwork',
          'clutch',
          'overall',
          'updated_at',
        ],
      },
    },
  },
  player_skills: {
    columns: [
      'player_id',
      'two_point_shot',
      'three_point_shot',
      'free_throw',
      'passing',
      'ball_control',
      'court_vision',
      'perimeter_defense',
      'interior_defense',
      'steals',
      'blocks',
      'offensive_rebound',
      'defensive_rebound',
      'speed',
      'strength',
      'stamina',
      'vertical',
      'basketball_iq',
      'teamwork',
      'clutch',
      'overall',
      'updated_at',
    ],
  },
  matches: {
    columns: [
      'id',
      'date',
      'venue',
      'mode',
      'teams',
      'result',
      'notes',
      'created_at',
      'updated_at',
    ],
  },
  player_match_stats: {
    columns: [
      'id',
      'match_id',
      'player_id',
      'points',
      'rebounds',
      'assists',
      'steals',
      'blocks',
      'turnovers',
      'fouls',
      'minutes_played',
      'field_goals_made',
      'field_goals_attempted',
      'three_pointers_made',
      'three_pointers_attempted',
      'free_throws_made',
      'free_throws_attempted',
      'plus_minus',
      'efficiency_rating',
      'created_at',
      'updated_at',
    ],
  },
  grouping_history: {
    columns: [
      'id',
      'mode',
      'team_count',
      'player_count',
      'balance_score',
      'data',
      'note',
      'created_at',
      'updated_at',
    ],
  },
} as const;

/**
 * Allowed operators for filters
 */
export type FilterOperator =
  | 'eq' // equals
  | 'neq' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'like' // LIKE (case-sensitive)
  | 'ilike' // ILIKE (case-insensitive)
  | 'in' // IN (array of values)
  | 'is'; // IS (null check)

/**
 * Single filter condition
 */
export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Join definition for player_skills table
 */
export interface JoinSpec {
  table: 'player_skills';
  select: string;
}

/**
 * Query parameters from AI (Phase 2 output)
 */
export interface QueryParams {
  table: keyof typeof DATABASE_SCHEMA;
  select: string; // Main table columns (e.g., "id,name,position")
  joins?: JoinSpec[];
  filters?: FilterCondition[];
  orFilters?: FilterCondition[]; // OR conditions
  orderBy?: {
    column: string; // Can be "column" or "player_skills.column"
    ascending: boolean;
  };
  limit?: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Query Builder class
 */
export class QueryBuilder {
  private supabase: SupabaseClient;
  private errors: ValidationError[] = [];

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Validate table name
   */
  private validateTable(table: string): boolean {
    if (!(table in DATABASE_SCHEMA)) {
      this.errors.push({
        field: 'table',
        message: `Table "${table}" is not allowed. Allowed tables: ${Object.keys(DATABASE_SCHEMA).join(', ')}`,
      });
      return false;
    }
    return true;
  }

  /**
   * Validate column exists in table
   */
  private validateColumn(table: string, column: string): boolean {
    const tableSchema = DATABASE_SCHEMA[table as keyof typeof DATABASE_SCHEMA];
    if (!tableSchema) return false;

    if (!tableSchema.columns.includes(column as never)) {
      this.errors.push({
        field: 'select',
        message: `Column "${column}" does not exist in table "${table}". Available: ${tableSchema.columns.join(', ')}`,
      });
      return false;
    }
    return true;
  }

  /**
   * Validate joined table and columns
   */
  private validateJoin(join: JoinSpec): boolean {
    // Currently only players has a relation to player_skills
    if (join.table !== 'player_skills') {
      this.errors.push({
        field: 'joins',
        message: `Invalid join table "${join.table}". Only "player_skills" is supported for players table.`,
      });
      return false;
    }

    // Validate columns in player_skills
    const columns = join.select.split(',').map((c: string) => c.trim());
    for (const column of columns) {
      if (!DATABASE_SCHEMA.player_skills.columns.includes(column as never)) {
        this.errors.push({
          field: 'joins',
          message: `Column "${column}" does not exist in "player_skills". Available: ${DATABASE_SCHEMA.player_skills.columns.join(', ')}`,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Validate filter column
   */
  private validateFilterColumn(table: string, column: string): boolean {
    // Check if it's a joined table column (player_skills.column) first
    if (column.startsWith('player_skills.')) {
      const subColumn = column.replace('player_skills.', '');
      if (!DATABASE_SCHEMA.player_skills.columns.includes(subColumn as never)) {
        this.errors.push({
          field: 'filters',
          message: `Column "${subColumn}" does not exist in "player_skills". Available: ${DATABASE_SCHEMA.player_skills.columns.join(', ')}`,
        });
        return false;
      }
      return true;
    }

    // Check if it's a main table column
    if (this.validateColumn(table, column)) {
      return true;
    }

    return false;
  }

  /**
   * Validate filter operator and value
   */
  private validateFilterValue(operator: FilterOperator, value: unknown): boolean {
    if (operator === 'in') {
      if (!Array.isArray(value)) {
        this.errors.push({
          field: 'filters',
          message: `Value for "in" operator must be an array. Got: ${typeof value}`,
        });
        return false;
      }
    }

    if (operator === 'is') {
      if (value !== null && value !== 'null') {
        this.errors.push({
          field: 'filters',
          message: `Value for "is" operator must be null or "null". Got: ${JSON.stringify(value)}`,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Validate all query parameters
   */
  validate(params: QueryParams): params is QueryParams {
    this.errors = [];

    // Validate table
    if (!this.validateTable(params.table)) {
      return false;
    }

    // Validate select columns
    const columns = params.select.split(',').map(c => c.trim());
    for (const column of columns) {
      if (!this.validateColumn(params.table, column)) {
        return false;
      }
    }

    // Validate joins
    if (params.joins) {
      for (const join of params.joins) {
        if (!this.validateJoin(join)) {
          return false;
        }
      }
    }

    // Validate filters
    if (params.filters) {
      for (const filter of params.filters) {
        if (!this.validateFilterColumn(params.table, filter.column)) {
          return false;
        }
        if (!this.validateFilterValue(filter.operator, filter.value)) {
          return false;
        }
      }
    }

    // Validate OR filters
    if (params.orFilters) {
      for (const filter of params.orFilters) {
        if (!this.validateFilterColumn(params.table, filter.column)) {
          return false;
        }
        if (!this.validateFilterValue(filter.operator, filter.value)) {
          return false;
        }
      }
    }

    // Validate order by column
    if (params.orderBy) {
      const column = params.orderBy.column;
      if (column.includes('.')) {
        // Joined table column
        const [table, subColumn] = column.split('.');
        if (table !== 'player_skills') {
          this.errors.push({
            field: 'orderBy',
            message: `Cannot order by joined table "${table}". Only "player_skills" is supported.`,
          });
          return false;
        }
        if (!DATABASE_SCHEMA.player_skills.columns.includes(subColumn as never)) {
          this.errors.push({
            field: 'orderBy',
            message: `Column "${subColumn}" does not exist in "player_skills". Available: ${DATABASE_SCHEMA.player_skills.columns.join(', ')}`,
          });
          return false;
        }
      } else {
        // Main table column - validate directly without using validateColumn to set correct error field
        const tableSchema = DATABASE_SCHEMA[params.table as keyof typeof DATABASE_SCHEMA];
        if (!tableSchema?.columns.includes(column as never)) {
          this.errors.push({
            field: 'orderBy',
            message: `Column "${column}" does not exist in table "${params.table}". Available: ${tableSchema?.columns.join(', ') || 'unknown'}`,
          });
          return false;
        }
      }
    }

    return this.errors.length === 0;
  }

  /**
   * Get validation errors
   */
  getErrors(): ValidationError[] {
    return this.errors;
  }

  /**
   * Build the select clause with proper Supabase nested syntax
   */
  private buildSelect(params: QueryParams): string {
    let select = params.select;

    // Add joins using nested select syntax
    if (params.joins && params.joins.length > 0) {
      const joinParts = params.joins.map(join => `${join.table}(${join.select})`);
      select = `${select},${joinParts.join(',')}`;
    }

    return select;
  }

  /**
   * Build the query from parameters
   */
  async build(params: QueryParams) {
    // Validate first
    if (!this.validate(params)) {
      throw new Error(`Validation failed: ${this.errors.map(e => e.message).join('; ')}`);
    }

    const select = this.buildSelect(params);
    let query = this.supabase.from(params.table).select(select);

    // Apply filters
    if (params.filters) {
      for (const filter of params.filters) {
        query = this.applyFilter(query, filter);
      }
    }

    // Apply OR filters
    if (params.orFilters && params.orFilters.length > 0) {
      const orConditions = params.orFilters.map(filter => this.buildOrCondition(filter)).join(',');
      query = query.or(orConditions);
    }

    // Apply ordering
    if (params.orderBy) {
      query = query.order(params.orderBy.column, { ascending: params.orderBy.ascending });
    }

    // Apply limit
    const limit = Math.min(params.limit || 100, 100);
    query = query.limit(limit);

    return query;
  }

  /**
   * Apply a single filter to the query
   */
  private applyFilter(query: any, filter: FilterCondition): any {
    switch (filter.operator) {
      case 'eq':
        return query.eq(filter.column, filter.value);
      case 'neq':
        return query.neq(filter.column, filter.value);
      case 'gt':
        return query.gt(filter.column, filter.value);
      case 'gte':
        return query.gte(filter.column, filter.value);
      case 'lt':
        return query.lt(filter.column, filter.value);
      case 'lte':
        return query.lte(filter.column, filter.value);
      case 'like':
        return query.like(filter.column, String(filter.value));
      case 'ilike':
        return query.ilike(filter.column, String(filter.value));
      case 'in':
        return query.in(filter.column, filter.value as unknown[]);
      case 'is':
        return query.is(filter.column, filter.value as null);
    }
  }

  /**
   * Build PostgREST OR condition string
   */
  private buildOrCondition(filter: FilterCondition): string {
    if (filter.operator === 'in' && Array.isArray(filter.value)) {
      return `${filter.column}.in.(${filter.value.join(',')})`;
    }
    return `${filter.column}.${filter.operator}.${filter.value}`;
  }

  /**
   * Get query description for logging
   */
  getQueryDescription(params: QueryParams): string {
    const parts: string[] = [];

    parts.push(`SELECT ${this.buildSelect(params)} FROM ${params.table}`);

    if (params.filters && params.filters.length > 0) {
      const filterStr = params.filters
        .map(f => `${f.column} ${f.operator} ${JSON.stringify(f.value)}`)
        .join(' AND ');
      parts.push(`WHERE ${filterStr}`);
    }

    if (params.orFilters && params.orFilters.length > 0) {
      const orStr = params.orFilters
        .map(f => `${f.column} ${f.operator} ${JSON.stringify(f.value)}`)
        .join(' OR ');
      parts.push(`OR (${orStr})`);
    }

    if (params.orderBy) {
      parts.push(`ORDER BY ${params.orderBy.column} ${params.orderBy.ascending ? 'ASC' : 'DESC'}`);
    }

    if (params.limit) {
      parts.push(`LIMIT ${params.limit}`);
    }

    return parts.join(' ');
  }
}

/**
 * Export schema constants for AI prompt
 */
export const SCHEMA_FOR_PROMPT = `
Database Schema:
- players: ${DATABASE_SCHEMA.players.columns.join(', ')}
  - relations: player_skills (one-to-one via player_id)
- player_skills: ${DATABASE_SCHEMA.player_skills.columns.join(', ')}
- matches: ${DATABASE_SCHEMA.matches.columns.join(', ')}
- player_match_stats: ${DATABASE_SCHEMA.player_match_stats.columns.join(', ')}
- grouping_history: ${DATABASE_SCHEMA.grouping_history.columns.join(', ')}

Position values: PG, SG, SF, PF, C

Important:
- When joining player_skills to players, use nested select: "*, player_skills(overall, speed)"
- For filtering by player_skills columns, use dot notation: "player_skills.overall"
- For ordering by player_skills columns, use dot notation: "player_skills.speed"
`;
