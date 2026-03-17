/**
 * Test Supabase query syntax fixes
 *
 * This script tests the fixed SQL Agent with Supabase syntax
 * to verify that OR queries, joined column ordering, and filtering work correctly.
 */

import 'dotenv/config';
import { SQLQueryAgent } from '../src/lib/sql-agent/sql-query-agent';

async function testSupabaseSyntax() {
  console.log('============================================================');
  console.log('Supabase Query Syntax Testing');
  console.log('============================================================');

  const sqlAgent = new SQLQueryAgent();
  await sqlAgent.initialize();

  // Test 1: OR query with PostgREST syntax
  console.log('\n[TEST 1] OR Query - Search by names "张三" or "李四"');
  try {
    const result = await sqlAgent.query('搜索姓"张"或"李"的球员');
    console.log('✅ OR Query Result:', result.success);
    if (result.data) {
      console.log('  Data rows:', result.data.length);
      console.log('  Sample data:', result.data.slice(0, 2));
    }
  } catch (error) {
    console.error('❌ OR Query Error:', error.message);
  }

  // Test 2: Order by joined table column (dot notation)
  console.log('\n[TEST 2] Order by joined table column - Order by player_skills.overall');
  try {
    const result = await sqlAgent.query('综合评分最高的3个球员');
    console.log('✅ Order by joined column Result:', result.success);
    if (result.data) {
      console.log('  Data rows:', result.data.length);
      console.log('  Sample data:', result.data.slice(0, 2));
    }
  } catch (error) {
    console.error('❌ Order by joined column Error:', error.message);
  }

  // Test 3: IN operator with multiple values
  console.log('\n[TEST 3] IN operator - Players in positions PG or SG');
  try {
    const result = await sqlAgent.query('位置是PG或SG的球员');
    console.log('✅ IN Operator Result:', result.success);
    if (result.data) {
      console.log('  Data rows:', result.data.length);
      console.log('  Sample data:', result.data.slice(0, 2));
    }
  } catch (error) {
    console.error('❌ IN Operator Error:', error.message);
  }

  // Test 4: Filter by joined table column
  console.log('\n[TEST 4] Filter by joined table column - Players with overall > 80');
  try {
    const result = await sqlAgent.query('综合评分大于80的球员');
    console.log('✅ Filter by joined column Result:', result.success);
    if (result.data) {
      console.log('  Data rows:', result.data.length);
      console.log('  Sample data:', result.data.slice(0, 2));
    }
  } catch (error) {
    console.error('❌ Filter by joined column Error:', error.message);
  }

  // Test 5: Simple range query
  console.log('\n[TEST 5] Range query - Overall between 80 and 90');
  try {
    const result = await sqlAgent.query('综合评分在80-90之间的球员');
    console.log('✅ Range Query Result:', result.success);
    if (result.data) {
      console.log('  Data rows:', result.data.length);
      console.log('  Sample data:', result.data.slice(0, 2));
    }
  } catch (error) {
    console.error('❌ Range Query Error:', error.message);
  }

  console.log('\n============================================================');
  console.log('Testing Complete');
  console.log('============================================================');
}

// Run the tests
testSupabaseSyntax().catch(error => {
  console.error('[FATAL] Test failed:', error);
  process.exit(1);
});