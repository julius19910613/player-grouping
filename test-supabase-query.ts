/**
 * 测试 Supabase 查询
 * 验证 chat 服务返回的数据是否与数据库一致
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

async function testQuery() {
  console.log('🔍 测试 Supabase 查询...\n');

  // 1. 查询球员"骚当"的数据
  console.log('1. 查询球员"骚当"：');
  const { data: players, error: playerError } = await supabase
    .from('players')
    .select(`
      *,
      player_skills (*)
    `)
    .ilike('name', '%骚当%')
    .limit(1);

  if (playerError) {
    console.error('❌ 查询失败:', playerError);
    return;
  }

  if (!players || players.length === 0) {
    console.log('⚠️  未找到球员"骚当"');
    return;
  }

  const player = players[0];
  console.log('✅ 找到球员:');
  console.log(`   - 姓名: ${player.name}`);
  console.log(`   - 位置: ${player.position}`);
  console.log(`   - Overall: ${player.player_skills?.overall || 'N/A'}`);
  console.log(`   - 速度: ${player.player_skills?.speed || 'N/A'}`);
  console.log(`   - 两分球: ${player.player_skills?.two_point_shot || 'N/A'}`);

  // 2. 查询所有球员（验证数据量）
  console.log('\n2. 查询所有球员数量：');
  const { count, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 查询失败:', countError);
  } else {
    console.log(`✅ 球员总数: ${count}`);
  }

  // 3. 测试生产环境 chat API
  console.log('\n3. 测试生产环境 Chat API (https://player-grouping.vercel.app):');
  try {
    const response = await fetch('https://player-grouping.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '查询球员骚当的数据' }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('❌ 生产环境 Chat API 错误:', response.status, response.statusText);
      const text = await response.text();
      console.error('响应内容:', text);
    } else {
      const data = await response.json();
      console.log('✅ 生产环境 Chat API 响应:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n🔍 检查响应内容:');
      const messageContent = data.message || data.choices?.[0]?.message?.content || '';
      console.log(`   - 回复长度: ${messageContent.length}`);
      console.log(`   - 回复内容: ${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}`);
      console.log(`   - 是否包含"骚当": ${messageContent.includes('骚当')}`);
      console.log(`   - 是否包含"SF": ${messageContent.includes('SF')}`);
      console.log(`   - 是否包含"69": ${messageContent.includes('69')}`);
    }
  } catch (err) {
    console.error('❌ 生产环境请求失败:', err);
  }

  // 4. 数据对比
  console.log('\n4. 数据库数据摘要:');
  console.log(`   - 球员: ${player.name}`);
  console.log(`   - 位置: ${player.position}`);
  console.log(`   - Overall: ${player.player_skills?.overall}`);
  console.log(`   - 关键技能: 速度${player.player_skills?.speed}, 两分${player.player_skills?.two_point_shot}, 篮板${player.player_skills?.offensive_rebound}`);

  console.log('\n✅ 测试完成！');
  console.log('\n💡 本地 API 测试说明:');
  console.log('   - 本地需要运行 `vercel dev` 来支持 API 路由');
  console.log('   - 当前 `vercel dev` 可能未正确配置 API 代理');
  console.log('   - 建议直接使用生产环境测试 chat 功能');
}

testQuery().catch(console.error);
