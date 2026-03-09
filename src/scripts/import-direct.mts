/**
 * 使用 Management API 直接导入球员数据到 Supabase
 * 绕过 RLS 策略
 */

const PROJECT_REF = 'saeplsevqechdnlkwjyz';
// Please set SUPABASE_ACCESS_TOKEN in your environment variables
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

// 球员数据
const playersData = [
  { name: '抓奶🉑', position: 'SG', skills: { twoPointShot: 99, threePointShot: 99, freeThrow: 99, passing: 89, ballControl: 81, courtVision: 98, perimeterDefense: 81, interiorDefense: 90, steals: 99, blocks: 85, offensiveRebound: 94, defensiveRebound: 81, speed: 99, strength: 99, stamina: 89, vertical: 99, basketballIQ: 92, teamwork: 99, clutch: 99, overall: 95 } },
  { name: '无敌詹蜜文', position: 'PG', skills: { twoPointShot: 94, threePointShot: 99, freeThrow: 93, passing: 99, ballControl: 99, courtVision: 99, perimeterDefense: 76, interiorDefense: 83, steals: 94, blocks: 75, offensiveRebound: 85, defensiveRebound: 82, speed: 97, strength: 89, stamina: 91, vertical: 94, basketballIQ: 98, teamwork: 95, clutch: 94, overall: 87 } },
  { name: '大哥', position: 'C', skills: { twoPointShot: 91, threePointShot: 72, freeThrow: 85, passing: 78, ballControl: 75, courtVision: 79, perimeterDefense: 65, interiorDefense: 95, steals: 61, blocks: 98, offensiveRebound: 99, defensiveRebound: 98, speed: 76, strength: 99, stamina: 88, vertical: 96, basketballIQ: 89, teamwork: 87, clutch: 90, overall: 94 } },
  { name: '卢德华', position: 'C', skills: { twoPointShot: 88, threePointShot: 68, freeThrow: 81, passing: 75, ballControl: 72, courtVision: 76, perimeterDefense: 58, interiorDefense: 92, steals: 55, blocks: 95, offensiveRebound: 97, defensiveRebound: 95, speed: 72, strength: 98, stamina: 85, vertical: 92, basketballIQ: 85, teamwork: 83, clutch: 87, overall: 91 } },
  { name: '开当的凯', position: 'C', skills: { twoPointShot: 79, threePointShot: 62, freeThrow: 72, passing: 68, ballControl: 65, courtVision: 70, perimeterDefense: 55, interiorDefense: 82, steals: 52, blocks: 85, offensiveRebound: 90, defensiveRebound: 88, speed: 68, strength: 92, stamina: 78, vertical: 82, basketballIQ: 75, teamwork: 74, clutch: 76, overall: 76 } },
  { name: '拍手嘴硬高', position: 'PG', skills: { twoPointShot: 82, threePointShot: 86, freeThrow: 84, passing: 90, ballControl: 91, courtVision: 88, perimeterDefense: 75, interiorDefense: 70, steals: 82, blocks: 65, offensiveRebound: 68, defensiveRebound: 70, speed: 85, strength: 78, stamina: 82, vertical: 80, basketballIQ: 85, teamwork: 83, clutch: 82, overall: 75 } },
  { name: '午觉罗', position: 'SF', skills: { twoPointShot: 88, threePointShot: 82, freeThrow: 85, passing: 80, ballControl: 82, courtVision: 81, perimeterDefense: 80, interiorDefense: 78, steals: 79, blocks: 76, offensiveRebound: 75, defensiveRebound: 77, speed: 86, strength: 82, stamina: 84, vertical: 85, basketballIQ: 86, teamwork: 84, clutch: 88, overall: 83 } },
  { name: '大"白"肚', position: 'PG', skills: { twoPointShot: 85, threePointShot: 88, freeThrow: 86, passing: 88, ballControl: 89, courtVision: 87, perimeterDefense: 73, interiorDefense: 68, steals: 80, blocks: 62, offensiveRebound: 65, defensiveRebound: 68, speed: 82, strength: 76, stamina: 80, vertical: 78, basketballIQ: 83, teamwork: 81, clutch: 84, overall: 82 } },
  { name: '组委会一把手李', position: 'C', skills: { twoPointShot: 75, threePointShot: 58, freeThrow: 68, passing: 65, ballControl: 62, courtVision: 67, perimeterDefense: 52, interiorDefense: 78, steals: 48, blocks: 82, offensiveRebound: 85, defensiveRebound: 83, speed: 65, strength: 88, stamina: 72, vertical: 80, basketballIQ: 71, teamwork: 70, clutch: 72, overall: 71 } },
  { name: '骚当', position: 'SF', skills: { twoPointShot: 80, threePointShot: 76, freeThrow: 78, passing: 75, ballControl: 77, courtVision: 76, perimeterDefense: 74, interiorDefense: 72, steals: 73, blocks: 70, offensiveRebound: 72, defensiveRebound: 74, speed: 80, strength: 76, stamina: 78, vertical: 79, basketballIQ: 79, teamwork: 77, clutch: 80, overall: 74 } },
  { name: '贱桂', position: 'SF', skills: { twoPointShot: 79, threePointShot: 75, freeThrow: 77, passing: 74, ballControl: 76, courtVision: 75, perimeterDefense: 73, interiorDefense: 71, steals: 72, blocks: 69, offensiveRebound: 71, defensiveRebound: 73, speed: 79, strength: 75, stamina: 77, vertical: 78, basketballIQ: 78, teamwork: 76, clutch: 79, overall: 73 } },
  { name: '磕比', position: 'SG', skills: { twoPointShot: 82, threePointShot: 85, freeThrow: 83, passing: 76, ballControl: 78, courtVision: 77, perimeterDefense: 75, interiorDefense: 70, steals: 76, blocks: 68, offensiveRebound: 70, defensiveRebound: 72, speed: 82, strength: 80, stamina: 80, vertical: 81, basketballIQ: 80, teamwork: 78, clutch: 82, overall: 74 } },
  { name: 'AVGPT', position: 'PF', skills: { twoPointShot: 77, threePointShot: 70, freeThrow: 74, passing: 72, ballControl: 73, courtVision: 74, perimeterDefense: 70, interiorDefense: 76, steals: 68, blocks: 75, offensiveRebound: 80, defensiveRebound: 78, speed: 72, strength: 82, stamina: 76, vertical: 77, basketballIQ: 76, teamwork: 75, clutch: 77, overall: 69 } },
  { name: '太黑了隐藏了', position: 'SG', skills: { twoPointShot: 74, threePointShot: 78, freeThrow: 75, passing: 70, ballControl: 72, courtVision: 71, perimeterDefense: 69, interiorDefense: 65, steals: 70, blocks: 63, offensiveRebound: 66, defensiveRebound: 68, speed: 76, strength: 74, stamina: 74, vertical: 75, basketballIQ: 74, teamwork: 72, clutch: 76, overall: 65 } },
  { name: '钩子🐔', position: 'C', skills: { twoPointShot: 76, threePointShot: 60, freeThrow: 70, passing: 68, ballControl: 65, courtVision: 70, perimeterDefense: 58, interiorDefense: 80, steals: 55, blocks: 84, offensiveRebound: 86, defensiveRebound: 84, speed: 68, strength: 86, stamina: 74, vertical: 82, basketballIQ: 76, teamwork: 75, clutch: 78, overall: 73 } },
  { name: '正义皓', position: 'PF', skills: { twoPointShot: 70, threePointShot: 64, freeThrow: 68, passing: 65, ballControl: 67, courtVision: 66, perimeterDefense: 65, interiorDefense: 70, steals: 62, blocks: 69, offensiveRebound: 74, defensiveRebound: 72, speed: 68, strength: 76, stamina: 70, vertical: 71, basketballIQ: 70, teamwork: 68, clutch: 72, overall: 64 } },
  { name: '党企代表要生三胎', position: 'SF', skills: { twoPointShot: 68, threePointShot: 62, freeThrow: 66, passing: 63, ballControl: 65, courtVision: 64, perimeterDefense: 62, interiorDefense: 60, steals: 61, blocks: 58, offensiveRebound: 60, defensiveRebound: 62, speed: 66, strength: 64, stamina: 66, vertical: 65, basketballIQ: 67, teamwork: 65, clutch: 68, overall: 56 } },
  { name: '黑老王', position: 'SF', skills: { twoPointShot: 66, threePointShot: 60, freeThrow: 64, passing: 61, ballControl: 63, courtVision: 62, perimeterDefense: 60, interiorDefense: 58, steals: 59, blocks: 56, offensiveRebound: 58, defensiveRebound: 60, speed: 64, strength: 62, stamina: 64, vertical: 63, basketballIQ: 65, teamwork: 63, clutch: 66, overall: 57 } },
  { name: 'Dao小帅', position: 'SF', skills: { twoPointShot: 70, threePointShot: 66, freeThrow: 68, passing: 64, ballControl: 66, courtVision: 65, perimeterDefense: 63, interiorDefense: 61, steals: 62, blocks: 59, offensiveRebound: 62, defensiveRebound: 64, speed: 68, strength: 66, stamina: 68, vertical: 67, basketballIQ: 69, teamwork: 67, clutch: 70, overall: 61 } },
];

async function executeSQL(query: string): Promise<any> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }

  return response.json();
}

async function importPlayers() {
  console.log('🚀 开始导入球员数据到 Supabase...\n');
  console.log(`📊 总共 ${playersData.length} 名球员\n`);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const player of playersData) {
    try {
      // 生成 UUID
      const uuidResult = await executeSQL('SELECT gen_random_uuid() as id');
      const playerId = uuidResult[0].id;

      // 插入球员
      const insertPlayerSQL = `
        INSERT INTO players (id, name, position)
        VALUES ('${playerId}', '${player.name.replace(/'/g, "''")}', '${player.position}')
      `;
      await executeSQL(insertPlayerSQL);
      console.log(`✅ 球员创建成功: ${player.name} (${playerId})`);

      // 插入能力值
      const s = player.skills;
      const insertSkillsSQL = `
        INSERT INTO player_skills (
          player_id, two_point_shot, three_point_shot, free_throw,
          passing, ball_control, court_vision,
          perimeter_defense, interior_defense, steals, blocks,
          offensive_rebound, defensive_rebound,
          speed, strength, stamina, vertical,
          basketball_iq, teamwork, clutch
        ) VALUES (
          '${playerId}',
          ${s.twoPointShot}, ${s.threePointShot}, ${s.freeThrow},
          ${s.passing}, ${s.ballControl}, ${s.courtVision},
          ${s.perimeterDefense}, ${s.interiorDefense}, ${s.steals}, ${s.blocks},
          ${s.offensiveRebound}, ${s.defensiveRebound},
          ${s.speed}, ${s.strength}, ${s.stamina}, ${s.vertical},
          ${s.basketballIQ}, ${s.teamwork}, ${s.clutch}
        )
      `;
      await executeSQL(insertSkillsSQL);
      console.log(`   ✅ 能力值创建成功: Overall ${s.overall}\n`);

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

  // 验证
  console.log('\n📊 验证导入结果...');
  const playerCount = await executeSQL('SELECT COUNT(*) as count FROM players');
  const skillsCount = await executeSQL('SELECT COUNT(*) as count FROM player_skills');
  console.log(`  球员表记录数: ${playerCount[0].count}`);
  console.log(`  能力值表记录数: ${skillsCount[0].count}`);

  return { success, failed, errors };
}

importPlayers()
  .then(result => {
    console.log('\n✅ 导入完成！');
    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
