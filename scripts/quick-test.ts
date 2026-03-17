import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function quickTest() {
  console.log('============================================================');
  console.log('Quick API Test');
  console.log('============================================================');

  // Check environment variables
  console.log('[Config] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('[Config] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');

  // Test 1: Google AI (simple)
  console.log('\n[TEST 1] Testing Google Generative AI...');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    const result = await model.generateContent('Hello, test!');
    console.log('[SUCCESS] Google AI works!');
    console.log('[Response]', result.response.text().substring(0, 100));
  } catch (error) {
    console.error('[FAILED] Google AI error:', error.message);
  }

  // Test 2: SQL Agent initialization
  console.log('\n[TEST 2] Testing SQL Agent initialization...');
  try {
    const { SQLQueryAgent } = await import('../src/lib/sql-agent/sql-query-agent');
    const sqlAgent = new SQLQueryAgent();
    await sqlAgent.initialize();
    console.log('[SUCCESS] SQL Agent initialized!');
  } catch (error) {
    console.error('[FAILED] SQL Agent error:', error.message);
  }

  // Test 3: API fetch
  console.log('\n[TEST 3] Testing API fetch...');
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'claude-code/0.1.0',
        'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      'Priority': 'high',
      'Accept-Language': 'zh-CN,zh;q=0.9,zh;q=0.8,en;q=0.7',
        'TE': 'trailers',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Sec-CH-UA", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode': "cors",
      'Sec-Fetch-Site': 'cross-site',
      'Priority': 'high',
      'Accept-Language': 'zh-CN,zh;q=0.9,zh;q=0.8,en;q=0.7',
      'TE': 'trailers',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Sec-CH-UA", "Sec-Fetch-Dest": "document", "FATAL-ERROR': 'Server error: 500'
      }
    });

    if (!response.ok) {
      console.error('[FAILED] API request failed:', response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log('[SUCCESS] API works!');
    console.log('[Response data]:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[FAILED] API fetch error:', error);
  }

  console.log('\n============================================================');
  console.log('Quick API Test Complete');
  console.log('============================================================');
}

quickTest().catch(error => {
  console.error('[FATAL] Test failed:', error);
  process.exit(1);
});
