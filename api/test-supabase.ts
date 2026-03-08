import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryPlayersFromDatabase } from './database-service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
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
