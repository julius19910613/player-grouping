/**
 * 验证游客模式是否可以获取球员数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://saeplsevqechdnlkwjyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5w85rd1KeY453zx3oEKsng_-3OO0j-P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

async function testGuestAccess() {
  console.log('🔍 测试游客模式访问...\n');

  // 模拟游客查询（不登录，直接使用 anon key）
  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      name,
      position,
      player_skills (
        overall
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 查询失败:', error.message);
    console.error('详细信息:', error);
    process.exit(1);
  }

  console.log(`✅ 查询成功！获取到 ${data?.length || 0} 名球员\n`);

  if (data && data.length > 0) {
    console.log('前 5 名球员:');
    data.slice(0, 5).forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (${player.position}) - OVR: ${player.player_skills?.overall || 'N/A'}`);
    });
    console.log('\n✅ 验证通过：游客可以正常访问球员数据');
    process.exit(0);
  } else {
    console.error('❌ 验证失败：游客无法访问球员数据');
    process.exit(1);
  }
}

testGuestAccess();
