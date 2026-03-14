/**
 * 测试修复后的查询解析逻辑
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://saeplsevqechdnlkwjyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5w85rd1KeY453zx3oEKsng_-3OO0j-P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

/**
 * Parse SQL WHERE clause into filter objects
 */
function parseWhereClause(whereClause: string): Array<{ column: string; operator: string; value: any }> {
  const filters: Array<{ column: string; operator: string; value: any }> = [];

  // Split by AND (simple implementation)
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

      console.log(`  解析条件: ${normalizedColumn} ${normalizedOperator} ${value}`);
    }
  }

  return filters;
}

/**
 * Handle direct SQL queries via Supabase client (修复版)
 */
async function handleDirectQuery(sql: string): Promise<any> {
  console.log(`执行查询: ${sql}\n`);

  try {
    // Handle simple SELECT queries with optional WHERE, ORDER BY, LIMIT
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

    if (selectMatch) {
      const [, columns, tableName, whereClause, orderBy, limitStr] = selectMatch;
      const selectColumns = columns.trim() === '*' ? '*' : columns.trim();
      let query = supabase.from(tableName).select(selectColumns);

      // Parse and apply WHERE clause
      if (whereClause) {
        console.log('解析 WHERE 子句:', whereClause);
        const filters = parseWhereClause(whereClause);
        for (const filter of filters) {
          if (filter.operator === 'ilike') {
            query = query.ilike(filter.column, filter.value);
          } else if (filter.operator === 'like') {
            query = query.like(filter.column, filter.value);
          } else if (filter.operator === 'eq') {
            query = query.eq(filter.column, filter.value);
          }
        }
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
    const joinMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+players\s+(?:\w+\s+)?(?:LEFT\s+)?JOIN\s+player_skills\s+\w+\s+ON\s+[^W]+(?:WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

    if (joinMatch) {
      const [, , whereClause, orderBy, limitStr] = joinMatch;
      console.log('检测到 JOIN 查询，使用 Supabase 关系查询');

      // Use Supabase's embedded select for joins
      let query = supabase
        .from('players')
        .select('*, player_skills(*)');

      // Parse and apply WHERE clause for players table
      if (whereClause) {
        console.log('解析 WHERE 子句:', whereClause);
        const filters = parseWhereClause(whereClause);
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

    return { success: false, error: '无法解析查询' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '查询失败' };
  }
}

async function test() {
  console.log('🧪 测试修复后的查询逻辑\n');
  console.log('='.repeat(60));

  // Test 1: Simple query with ILIKE
  console.log('\n📋 测试 1: 简单查询 + ILIKE');
  const result1 = await handleDirectQuery(
    "SELECT * FROM players WHERE name ILIKE '%骚当%' LIMIT 5"
  );
  console.log('结果:', JSON.stringify(result1, null, 2));

  // Test 2: JOIN query
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 测试 2: JOIN 查询');
  const result2 = await handleDirectQuery(
    "SELECT p.*, ps.* FROM players p LEFT JOIN player_skills ps ON p.id = ps.player_id WHERE p.name ILIKE '%骚当%'"
  );
  console.log('结果:', JSON.stringify(result2, null, 2));

  // Test 3: List all players
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 测试 3: 列出所有球员');
  const result3 = await handleDirectQuery(
    "SELECT id, name, position FROM players ORDER BY created_at DESC LIMIT 5"
  );
  console.log('结果:', JSON.stringify(result3, null, 2));

  // Test 4: Count
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 测试 4: COUNT 查询');
  const result4 = await handleDirectQuery(
    "SELECT COUNT(*) AS total FROM players"
  );
  console.log('结果:', JSON.stringify(result4, null, 2));

  console.log('\n✅ 测试完成！');
}

test().catch(console.error);
