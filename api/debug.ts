import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 检查环境变量是否配置（不暴露实际值）
  const envStatus = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
    VITE_ARK_API_KEY: !!process.env.VITE_ARK_API_KEY,
    VITE_ARK_BASE_URL: !!process.env.VITE_ARK_BASE_URL,
    VITE_ARK_MODEL: !!process.env.VITE_ARK_MODEL,
    NODE_ENV: process.env.NODE_ENV,
  };

  res.status(200).json({
    message: 'Environment Variables Status',
    status: envStatus,
    timestamp: new Date().toISOString()
  });
}
