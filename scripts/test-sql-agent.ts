import 'dotenv/config';
import { SQLQueryAgent } from '../src/lib/sql-agent/sql-query-agent.js';

async function testSQLAgent() {
  console.log('--- SQL Agent Test (Supabase JS client) ---\n');

  const agent = new SQLQueryAgent();

  try {
    // Test 1: Initialize
    console.log('Test 1: Initializing agent...');
    await agent.initialize();
    console.log('SUCCESS! Agent initialized.\n');

    // Test 2: Count players
    console.log('Test 2: Querying "有多少个球员"...');
    const result1 = await agent.query('有多少个球员');
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log();

    // Test 3: List players by position
    console.log('Test 3: Querying "所有中锋球员"...');
    const result2 = await agent.query('所有中锋球员');
    console.log('Result:', JSON.stringify(result2, null, 2));
    console.log();

    // Test 4: Player skills
    console.log('Test 4: Querying "球员整体评分排名"...');
    const result3 = await agent.query('球员整体评分排名');
    console.log('Result:', JSON.stringify(result3, null, 2));

    // Cleanup
    await agent.cleanup();
    console.log('\n--- All tests passed! ---');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testSQLAgent();
