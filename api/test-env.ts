import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 检查环境变量
  const geminiKey = process.env.GEMINI_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envVars: {
      GEMINI_API_KEY: geminiKey ? `exists (${geminiKey.length} chars)` : 'NOT SET',
      BRAVE_SEARCH_API_KEY: braveKey ? `exists (${braveKey.length} chars)` : 'NOT SET',
      VITE_SUPABASE_URL: supabaseUrl || 'NOT SET',
    },
    nodeVersion: process.version,
    platform: process.platform,
  };

  // 测试 GoogleGenerativeAI 初始化
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      return res.status(200).json({
        ...diagnostics,
        geminiTest: 'SUCCESS - Initialization OK',
        modelType: typeof model,
      });
    } catch (error) {
      return res.status(200).json({
        ...diagnostics,
        geminiTest: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  return res.status(200).json({
    ...diagnostics,
    geminiTest: 'SKIPPED - No API Key',
  });
}
