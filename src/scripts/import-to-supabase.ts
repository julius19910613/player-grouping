/**
 * 直接导入球员数据到 Supabase
 * 使用 Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import playersData from '../data/players.json';

const SUPABASE_URL = 'https://saeplsevqechdnlkwjyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5w85rd1KeY453zx3oEKsng_-3OO0j-P';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function importPlayers() {
  console.log('🚀 开始导入球员数据到 Supabase...\n');
  console.log(`📊 总共 ${playersData.length} 名球员\n`);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const player of playersData) {
    try {
      // 1. 插入球员基础信息
      const { data: playerRecord, error: playerError } = await supabase
        .from('players')
        .insert({
          name: player.name,
          position: player.position,
        })
        .select()
        .single();

      if (playerError) {
        throw new Error(`插入球员失败: ${playerError.message}`);
      }

      const playerId = playerRecord.id;
      console.log(`✅ 球员创建成功: ${player.name} (${playerId})`);

      // 2. 插入球员能力值
      const { error: skillsError } = await supabase
        .from('player_skills')
        .insert({
          player_id: playerId,
          two_point_shot: player.skills.twoPointShot,
          three_point_shot: player.skills.threePointShot,
          free_throw: player.skills.freeThrow,
          passing: player.skills.passing,
          ball_control: player.skills.ballControl,
          court_vision: player.skills.courtVision,
          perimeter_defense: player.skills.perimeterDefense,
          interior_defense: player.skills.interiorDefense,
          steals: player.skills.steals,
          blocks: player.skills.blocks,
          offensive_rebound: player.skills.offensiveRebound,
          defensive_rebound: player.skills.defensiveRebound,
          speed: player.skills.speed,
          strength: player.skills.strength,
          stamina: player.skills.stamina,
          vertical: player.skills.vertical,
          basketball_iq: player.skills.basketballIQ,
          teamwork: player.skills.teamwork,
          clutch: player.skills.clutch,
        });

      if (skillsError) {
        // 回滚球员记录
        await supabase.from('players').delete().eq('id', playerId);
        throw new Error(`插入能力值失败: ${skillsError.message}`);
      }

      console.log(`   ✅ 能力值创建成功: Overall ${player.skills.overall}\n`);
      success++;
    } catch (error) {
      failed++;
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${player.name}: ${errMsg}`);
      console.error(`❌ 导入失败: ${player.name}`, errMsg, '\n');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 导入结果');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${success}`);
  console.log(`❌ 失败: ${failed}`);
  
  if (errors.length > 0) {
    console.log('\n错误详情:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  // 验证导入结果
  console.log('\n📊 验证导入结果...');
  
  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });
  
  const { count: skillsCount } = await supabase
    .from('player_skills')
    .select('*', { count: 'exact', head: true });

  console.log(`  球员表记录数: ${playerCount}`);
  console.log(`  能力值表记录数: ${skillsCount}`);

  return { success, failed, errors };
}

importPlayers()
  .then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
