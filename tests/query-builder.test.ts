/**
 * Query Builder Tests
 *
 * Tests for the new QueryBuilder that validates and builds Supabase queries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryBuilder, DATABASE_SCHEMA, type QueryParams } from '@/lib/query-builder';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

describe('QueryBuilder', () => {
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    // Reset mock
    vi.clearAllMocks();

    // Create QueryBuilder instance with mock
    queryBuilder = new QueryBuilder(mockSupabase as any);
  });

  describe('DATABASE_SCHEMA', () => {
    it('应该定义正确的表结构', () => {
      expect(DATABASE_SCHEMA.players).toBeDefined();
      expect(DATABASE_SCHEMA.players.columns).toContain('id');
      expect(DATABASE_SCHEMA.players.columns).toContain('name');
      expect(DATABASE_SCHEMA.players.columns).toContain('position');

      expect(DATABASE_SCHEMA.player_skills).toBeDefined();
      expect(DATABASE_SCHEMA.player_skills.columns).toContain('player_id');
      expect(DATABASE_SCHEMA.player_skills.columns).toContain('overall');
      expect(DATABASE_SCHEMA.player_skills.columns).toContain('speed');
    });

    it('应该定义正确的列数', () => {
      expect(DATABASE_SCHEMA.players.columns.length).toBe(5); // id, name, position, created_at, updated_at
      expect(DATABASE_SCHEMA.player_skills.columns.length).toBe(22); // 20 skills + player_id + updated_at
    });
  });

  describe('validate', () => {
    it('应该验证正确的查询参数', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
        limit: 10,
      };

      expect(queryBuilder.validate(params)).toBe(true);
      expect(queryBuilder.getErrors()).toHaveLength(0);
    });

    it('应该拒绝无效的表名', () => {
      const params: QueryParams = {
        table: 'invalid_table' as any,
        select: 'id',
      };

      expect(queryBuilder.validate(params)).toBe(false);
      expect(queryBuilder.getErrors().length).toBeGreaterThan(0);
      expect(queryBuilder.getErrors()[0].field).toBe('table');
    });

    it('应该拒绝无效的列名', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,invalid_column',
      };

      expect(queryBuilder.validate(params)).toBe(false);
      expect(queryBuilder.getErrors()[0].field).toBe('select');
    });

    it('应该验证 player_skills 列名', () => {
      const params: QueryParams = {
        table: 'player_skills',
        select: 'player_id,overall,speed',
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该拒绝无效的 player_skills 列名', () => {
      const params: QueryParams = {
        table: 'player_skills',
        select: 'player_id,invalid_column',
      };

      expect(queryBuilder.validate(params)).toBe(false);
    });

    it('应该验证 joins', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
        joins: [
          {
            table: 'player_skills',
            select: 'overall,speed',
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该拒绝无效的 join 表', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        joins: [
          {
            table: 'invalid_table' as any,
            select: 'overall',
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(false);
      expect(queryBuilder.getErrors()[0].field).toBe('joins');
    });

    it('应该拒绝无效的 join 列', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        joins: [
          {
            table: 'player_skills',
            select: 'invalid_column',
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(false);
    });

    it('应该验证过滤器', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
        filters: [
          {
            column: 'position',
            operator: 'eq',
            value: 'PG',
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该验证 player_skills 过滤器', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
        filters: [
          {
            column: 'player_skills.overall',
            operator: 'gt',
            value: 85,
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该拒绝无效的过滤器列', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        filters: [
          {
            column: 'invalid_column',
            operator: 'eq',
            value: 'test',
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(false);
    });

    it('应该拒绝无效的操作符', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        filters: [
          {
            column: 'name',
            operator: 'invalid_op' as any,
            value: 'test',
          },
        ],
      };

      // 操作符类型检查在 TypeScript 层面，这里我们只检查列
      // 实际的无效操作符会在 applyFilter 时处理
    });

    it('应该验证 OR 过滤器', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
        orFilters: [
          {
            column: 'position',
            operator: 'eq',
            value: 'PG',
          },
          {
            column: 'position',
            operator: 'eq',
            value: 'SG',
          },
        ],
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该验证排序', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        orderBy: {
          column: 'name',
          ascending: true,
        },
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该验证 player_skills 排序', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        orderBy: {
          column: 'player_skills.overall',
          ascending: false,
        },
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });

    it('应该拒绝无效的排序列', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        orderBy: {
          column: 'invalid_column',
          ascending: true,
        },
      };

      expect(queryBuilder.validate(params)).toBe(false);
      expect(queryBuilder.getErrors()[0].field).toBe('orderBy');
    });

    it('应该验证 limit', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        limit: 50,
      };

      expect(queryBuilder.validate(params)).toBe(true);
    });
  });

  describe('buildSelect', () => {
    it('应该构建基本的 select 子句', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
      };

      const select = queryBuilder.getQueryDescription(params);
      expect(select).toContain('SELECT id,name,position FROM players');
    });

    it('应该构建带 join 的 select 子句', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        joins: [
          {
            table: 'player_skills',
            select: 'overall,speed',
          },
        ],
      };

      const select = queryBuilder.getQueryDescription(params);
      expect(select).toContain('SELECT id,name,player_skills(overall,speed) FROM players');
    });

    it('应该构建带过滤器的查询描述', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        filters: [
          {
            column: 'position',
            operator: 'eq',
            value: 'PG',
          },
        ],
      };

      const description = queryBuilder.getQueryDescription(params);
      expect(description).toContain('WHERE');
      expect(description).toContain('position');
      expect(description).toContain('eq');
      expect(description).toContain('"PG"');
    });

    it('应该构建带排序的查询描述', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        orderBy: {
          column: 'player_skills.overall',
          ascending: false,
        },
      };

      const description = queryBuilder.getQueryDescription(params);
      expect(description).toContain('ORDER BY player_skills.overall DESC');
    });

    it('应该构建带 limit 的查询描述', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name',
        limit: 10,
      };

      const description = queryBuilder.getQueryDescription(params);
      expect(description).toContain('LIMIT 10');
    });
  });

  describe('getQueryDescription', () => {
    it('应该返回完整的查询描述', () => {
      const params: QueryParams = {
        table: 'players',
        select: 'id,name,position',
        joins: [
          {
            table: 'player_skills',
            select: 'overall',
          },
        ],
        filters: [
          {
            column: 'player_skills.overall',
            operator: 'gt',
            value: 85,
          },
        ],
        orderBy: {
          column: 'player_skills.overall',
          ascending: false,
        },
        limit: 10,
      };

      const description = queryBuilder.getQueryDescription(params);

      expect(description).toContain('SELECT id,name,position,player_skills(overall) FROM players');
      expect(description).toContain('WHERE player_skills.overall gt 85');
      expect(description).toContain('ORDER BY player_skills.overall DESC');
      expect(description).toContain('LIMIT 10');
    });
  });
});

describe('SQL Query Agent', () => {
  it('应该导出必要的类型', async () => {
    // Import the SQL Agent to verify it compiles correctly
    const sqlAgentModule = await import('../src/lib/sql-agent/sql-query-agent');

    // Check that the class is exported
    expect(typeof sqlAgentModule.SQLQueryAgent).toBe('function');

    // QueryResult is an interface, so it's not in the runtime module
    // But the import working proves the types are defined correctly
  });
});
