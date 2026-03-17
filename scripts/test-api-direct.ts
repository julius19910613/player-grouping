/**
 * Direct API test script
 *
 * Test the chat API handler directly to diagnose issues
 *
 * IMPORTANT: This script loads environment variables from .env file
 */

import 'dotenv/config'; // Load environment variables from .env

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SQLQueryAgent } from '../src/lib/sql-agent/sql-query-agent';

async function testDirectly() {
  console.log('============================================================');
  console.log('Direct API Test');
  console.log('============================================================');

  // Check environment variables
  console.log('[Config] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'NOT SET');
  console.log(process.env.GEMINI_API_KEY)
  
  console.log('[Config] VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'NOT SET');
  console.log('[Config] VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'NOT SET');

  // Test 1: Google AI
  console.log('\n[TEST 1] Testing Google Generative AI...');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    const result = await model.generateContent('Hello');
    console.log('[SUCCESS] Google AI works!');
    console.log('[Response]', result.response.text().substring(0, 100));
  } catch (error) {
    console.error('[FAILED] Google AI error:', error);
  }

  // Test 2: SQL Agent Initialization
  console.log('\n[TEST 2] Testing SQL Agent initialization...');
  try {
    const sqlAgent = new SQLQueryAgent();
    await sqlAgent.initialize();
    console.log('[SUCCESS] SQL Agent initialized!');
  } catch (error) {
    console.error('[FAILED] SQL Agent initialization error:', error);
  }

  // Test 3: SQL Agent Query
  console.log('\n[TEST 3] Testing SQL Agent query...');
  try {
    const sqlAgent = new SQLQueryAgent();
    await sqlAgent.initialize();
    const result = await sqlAgent.query('谁是投篮最厉害的球员？');
    console.log('[SUCCESS] SQL Agent query works!');
    console.log('[Result]', JSON.stringify({
      success: result.success,
      rowCount: result.rowCount,
      hasData: result.data && result.data.length > 0
    }, null, 2));
  } catch (error) {
    console.error('[FAILED] SQL Agent query error:', error);
  }

  console.log('\n============================================================');
  console.log('Direct API Test Complete');
  console.log('============================================================');
}

testDirectly().catch(error => {
  console.error('[FATAL] Test failed:', error);
  process.exit(1);
});
