import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryPlayersFromDatabase } from './database-service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Check environment variables first
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
    }
    
    // Test query with a known player
    const result = await queryPlayersFromDatabase('骚当');
    
    return res.status(200).json({
      success: true,
      test: 'Supabase connection test',
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
