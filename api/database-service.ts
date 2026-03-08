import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * 从 Supabase 查询球员数据
 */
export async function queryPlayersFromDatabase(playerName?: string) {
  try {
    let query = supabase
      .from('players')
      .select('*');

    // 如果提供了球员名称，进行模糊搜索
    if (playerName) {
      query = query.ilike('name', `%${playerName}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return {
        success: false,
        error: '数据库查询失败',
        details: error.message
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          message: playerName 
            ? `未找到球员 "${playerName}" 的数据`
            : '暂无球员数据',
          count: 0,
          players: []
        }
      };
    }

    return {
      success: true,
      data: {
        message: `找到 ${data.length} 名球员`,
        count: data.length,
        players: data
      }
    };
  } catch (error) {
    console.error('Query error:', error);
    return {
      success: false,
      error: '查询失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 从 Supabase 查询比赛数据
 */
export async function queryMatchesFromDatabase() {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase query error:', error);
      return {
        success: false,
        error: '比赛数据查询失败',
        details: error.message
      };
    }

    return {
      success: true,
      data: {
        message: `找到 ${data?.length || 0} 场比赛`,
        count: data?.length || 0,
        matches: data || []
      }
    };
  } catch (error) {
    console.error('Query error:', error);
    return {
      success: false,
      error: '查询失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
