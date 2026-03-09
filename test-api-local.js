/**
 * 本地 API 测试脚本
 * 直接测试 api/chat.ts 中的逻辑
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// 手动加载环境变量
const envContent = readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    process.env[key.trim()] = values.join('=').trim();
  }
});

async function testGetPlayerStats() {
  console.log('\n=== 测试 get_player_stats ===\n');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 配置缺失');
    return;
  }
  
  console.log('✅ Supabase 配置正常');
  console.log(`   URL: ${supabaseUrl}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 测试查询球员
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .ilike('name', '%骚当%')
    .limit(10);
  
  if (error) {
    console.error('❌ 查询失败:', error.message);
    return;
  }
  
  if (!players || players.length === 0) {
    console.error('❌ 未找到球员');
    return;
  }
  
  console.log(`✅ 找到 ${players.length} 名球员:`);
  players.forEach(p => {
    console.log(`   - ${p.name} (${p.position})`);
  });
  
  // 查询技能数据
  const { data: skills } = await supabase
    .from('player_skills')
    .select('*')
    .eq('player_id', players[0].id)
    .single();
  
  console.log('\n✅ 技能数据:', skills);
}

async function testGeminiAPI() {
  console.log('\n=== 测试 Gemini API ===\n');
  
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Gemini API Key 缺失');
    return;
  }
  
  console.log('✅ Gemini API Key 已配置');
  console.log(`   Key: ${apiKey.substring(0, 10)}...`);
  
  // 简单的 API 调用测试
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: '你好，请回复"测试成功"' }]
          }]
        })
      }
    );
    
    if (!response.ok) {
      console.error('❌ API 调用失败:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('✅ Gemini API 调用成功');
    console.log(`   回复: ${reply}`);
  } catch (error) {
    console.error('❌ API 调用异常:', error.message);
  }
}

async function main() {
  console.log('====================================');
  console.log('  本地 API 测试');
  console.log('====================================');
  
  await testGetPlayerStats();
  await testGeminiAPI();
  
  console.log('\n====================================');
  console.log('  测试完成');
  console.log('====================================\n');
}

main().catch(console.error);
