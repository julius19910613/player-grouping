/**
 * 球员数据转换脚本（预览版）
 * 将原始数据转换为项目格式
 */

// 原始数据
const rawData = [
  { name: '抓奶🉑', position: 'G', height: 183, weight: 77, stars: 5, age: 34 },
  { name: '无敌詹蜜文', position: 'G', height: 178, weight: 83, stars: 5, age: 34 },
  { name: '大哥', position: 'C', height: 187, weight: 82, stars: 5, age: 44 },
  { name: '卢德华', position: 'C', height: 183, weight: 95, stars: 5, age: 37 },
  { name: '开当的凯', position: 'C', height: 189, weight: 105, stars: 4, age: 38 },
  { name: '拍手嘴硬高', position: 'G', height: 178, weight: 80, stars: 4, age: 40 },
  { name: '午觉罗', position: 'F', height: null, weight: null, stars: 4, age: null },
  { name: '大"白"肚', position: 'G', height: 173, weight: 83, stars: 4, age: 37 },
  { name: '组委会一把手李', position: 'C', height: 196, weight: 95, stars: 3, age: 34 },
  { name: '骚当', position: 'F', height: 183, weight: 78, stars: 3, age: 40 },
  { name: '贱桂', position: 'F', height: 180, weight: 77, stars: 3, age: 45 },
  { name: '磕比', position: 'G', height: 183, weight: 90, stars: 3, age: 41 },
  { name: 'AVGPT', position: 'F', height: 188, weight: 95, stars: 3, age: 40 },
  { name: '太黑了隐藏了', position: 'G', height: null, weight: null, stars: 3, age: null },
  { name: '钩子🐔', position: 'C', height: null, weight: null, stars: 3, age: null },
  { name: '正义皓', position: 'F', height: 182, weight: 93, stars: 2, age: 37 },
  { name: '党企代表要生三胎', position: 'F', height: 184, weight: 77, stars: 2, age: 44 },
  { name: '黑老王', position: 'F', height: 180, weight: 82, stars: 2, age: 46 },
  { name: 'Dao小帅', position: 'F', height: null, weight: null, stars: 2, age: null },
];

// 位置平均身高体重（用于填充缺失值）
const positionDefaults: Record<string, { height: number; weight: number }> = {
  G: { height: 178, weight: 80 },
  C: { height: 185, weight: 90 },
  F: { height: 183, weight: 82 },
};

// 星级到 overall 范围映射
const starToOverall: Record<number, { min: number; max: number }> = {
  5: { min: 85, max: 95 },
  4: { min: 75, max: 84 },
  3: { min: 65, max: 74 },
  2: { min: 55, max: 64 },
  1: { min: 45, max: 54 },
};

// 位置映射规则
function mapPosition(rawPos: string, height: number | null, weight: number | null): string {
  if (!height || !weight) {
    return 'UTILITY';
  }

  switch (rawPos) {
    case 'G':
      return height < 180 ? 'PG' : 'SG';
    case 'C':
      return 'C';
    case 'F':
      return weight < 85 ? 'SF' : 'PF';
    default:
      return 'UTILITY';
  }
}

// 生成随机身高（按位置）
function randomHeight(position: string): number {
  const base = positionDefaults[position]?.height || 180;
  const variance = Math.floor(Math.random() * 10) - 5;
  return base + variance;
}

// 生成随机体重（按位置）
function randomWeight(position: string): number {
  const base = positionDefaults[position]?.weight || 80;
  const variance = Math.floor(Math.random() * 10) - 5;
  return base + variance;
}

// 生成随机能力值（基于 overall 和位置）
function generateSkills(position: string, overall: number): any {
  const weights: Record<string, Record<string, number>> = {
    PG: { passing: 1.5, ballControl: 1.4, courtVision: 1.3, threePoint: 1.2, speed: 1.2, steals: 1.1, iq: 1.2 },
    SG: { threePoint: 1.5, twoPoint: 1.3, freeThrow: 1.2, speed: 1.2, vertical: 1.1, clutch: 1.3 },
    SF: { twoPoint: 1.2, threePoint: 1.1, speed: 1.1, strength: 1.1, vertical: 1.1, defense: 1.1 },
    PF: { rebound: 1.5, blocks: 1.3, strength: 1.4, interior: 1.3, twoPoint: 1.1 },
    C: { rebound: 1.6, blocks: 1.5, strength: 1.5, interior: 1.4, vertical: 1.2 },
    UTILITY: {},
  };

  const posWeights = weights[position] || {};

  const randomSkill = (base: number, weight: number = 1): number => {
    const variance = 15;
    const weighted = base * weight;
    const value = weighted + (Math.random() * variance * 2 - variance);
    return Math.max(1, Math.min(99, Math.round(value)));
  };

  return {
    twoPointShot: randomSkill(overall, posWeights.twoPoint || 1),
    threePointShot: randomSkill(overall, posWeights.threePoint || 1),
    freeThrow: randomSkill(overall, posWeights.freeThrow || 1),
    passing: randomSkill(overall, posWeights.passing || 1),
    ballControl: randomSkill(overall, posWeights.ballControl || 1),
    courtVision: randomSkill(overall, posWeights.courtVision || 1),
    perimeterDefense: randomSkill(overall, posWeights.defense || 1),
    interiorDefense: randomSkill(overall, posWeights.interior || 1),
    steals: randomSkill(overall, posWeights.steals || 1),
    blocks: randomSkill(overall, posWeights.blocks || 1),
    offensiveRebound: randomSkill(overall, posWeights.rebound || 1),
    defensiveRebound: randomSkill(overall, posWeights.rebound || 1),
    speed: randomSkill(overall, posWeights.speed || 1),
    strength: randomSkill(overall, posWeights.strength || 1),
    stamina: randomSkill(overall, 1),
    vertical: randomSkill(overall, posWeights.vertical || 1),
    basketballIQ: randomSkill(overall, posWeights.iq || 1),
    teamwork: randomSkill(overall, 1),
    clutch: randomSkill(overall, posWeights.clutch || 1),
    overall,
  };
}

// 转换数据
function transformData(raw: typeof rawData[0]): any {
  const height = raw.height ?? randomHeight(raw.position);
  const weight = raw.weight ?? randomWeight(raw.position);
  const position = mapPosition(raw.position, height, weight);

  const range = starToOverall[raw.stars] || starToOverall[3];
  const overall = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

  const skills = generateSkills(position, overall);

  return {
    name: raw.name,
    position,
    height,
    weight,
    age: raw.age,
    stars: raw.stars,
    overall,
    skills,
  };
}

// 主函数
async function main() {
  console.log('📊 球员数据预览:\n');

  const results = rawData.map(raw => {
    const transformed = transformData(raw);
    return {
      姓名: transformed.name,
      位置: transformed.position,
      身高: transformed.height,
      体重: transformed.weight,
      星: transformed.stars,
      Overall: transformed.overall,
    };
  });

  console.table(results);

  // 统计
  const positions: Record<string, number> = {};
  results.forEach(r => {
    positions[r.位置] = (positions[r.位置] || 0) + 1;
  });

  console.log('\n📊 位置分布:');
  Object.entries(positions).forEach(([pos, count]) => {
    console.log(`  ${pos}: ${count}人`);
  });

  // 导出 JSON
  console.log('\n📁 导出数据到: src/data/players.json');
  const { writeFileSync, mkdirSync, existsSync } = await import('fs');
  const { join } = await import('path');

  const exportData = rawData.map(raw => transformData(raw));

  // 确保目录存在
  const dataDir = join(process.cwd(), 'src/data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  writeFileSync(
    join(dataDir, 'players.json'),
    JSON.stringify(exportData, null, 2)
  );

  console.log('✅ 导出完成！');
}

main();
