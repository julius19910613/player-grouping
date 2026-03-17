import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function verifyAPIKey() {
  console.log('============================================================');
  console.log('GEMINI API Key Verification');
  console.log('============================================================');

  console.log('\n[Config] Environment Variables:');
  console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('  VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('  VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');

  console.log('\n[TEST 1] Testing Google Generative AI...');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    const result = await model.generateContent('Hello, test message');
    const responseText = result.response.text();

    console.log('[SUCCESS] Google AI API key is valid!');
    console.log('[Response]', responseText.substring(0, 100) + '...');
  } catch (error) {
    console.error('[FAILED] Google AI API error:', error);
  }

  console.log('\n[TEST 2] Testing SQL Agent initialization...');

  try {
    const { SQLQueryAgent } = await import('../src/lib/sql-agent/sql-query-agent');
    const sqlAgent = new SQLQueryAgent();
    await sqlAgent.initialize();
    console.log('[SUCCESS] SQL Agent initialized!');
  } catch (error) {
    console.error('[FAILED] SQL Agent initialization error:', error);
  }

  console.log('\n============================================================');
  console.log('Verification Complete');
  console.log('============================================================');
}

verifyAPIKey().catch(error => {
  console.error('[FATAL] Verification failed:', error);
  process.exit(1);
});
