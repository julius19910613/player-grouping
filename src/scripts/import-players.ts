/**
 * 球员数据导入脚本
 * 将原始数据转换为项目格式并导入数据库
 */

import { createPlayerRepository } from '../repositories';
import type { Player as _Player, BasketballPosition, BasketballSkills } from '../types';

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
function mapPosition(rawPos: string, height: number | null, weight: number | null): BasketballPosition {
  // 缺失数据 → UTILITY
  if (!height || !weight) {
    return 'UTILITY';
  }

  switch (rawPos) {
    case 'G':
      // 身高 < 180 → PG，否则 SG
      return height < 180 ? 'PG' : 'SG';
    case 'C':
      return 'C';
    case 'F':
      // 体重 < 85 → SF，否则 PF
      return weight < 85 ? 'SF' : 'PF';
    default:
      return 'UTILITY';
  }
}

// 生成随机身高（按位置）
function randomHeight(position: string): number {
  const base = positionDefaults[position]?.height || 180;
  const variance = Math.floor(Math.random() * 10) - 5; // ±5cm
  return base + variance;
}

// 生成随机体重（按位置）
function randomWeight(position: string): number {
  const base = positionDefaults[position]?.weight || 80;
  const variance = Math.floor(Math.random() * 10) - 5; // ±5kg
  return base + variance;
}

// 生成随机能力值（基于 overall 和位置）
function generateSkills(position: BasketballPosition, overall: number): BasketballSkills {
  // 位置权重配置
  const weights: Record<BasketballPosition, Record<string, number>> = {
    PG: { passing: 1.5, ballControl: 1.4, courtVision: 1.3, threePoint: 1.2, speed: 1.2, steals: 1.1, iq: 1.2 },
    SG: { threePoint: 1.5, twoPoint: 1.3, freeThrow: 1.2, speed: 1.2, vertical: 1.1, clutch: 1.3 },
    SF: { twoPoint: 1.2, threePoint: 1.1, speed: 1.1, strength: 1.1, vertical: 1.1, defense: 1.1 },
    PF: { rebound: 1.5, blocks: 1.3, strength: 1.4, interior: 1.3, twoPoint: 1.1 },
    C: { rebound: 1.6, blocks: 1.5, strength: 1.5, interior: 1.4, vertical: 1.2 },
    UTILITY: {}, // 均衡
  };

  const posWeights = weights[position] || {};

  // 生成 19 项能力值
  const randomSkill = (base: number, weight: number = 1): number => {
    const variance = 15;
    const weighted = base * weight;
    const value = weighted + (Math.random() * variance * 2 - variance);
    return Math.max(1, Math.min(99, Math.round(value)));
  };

  const skills: any = {
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

  return skills as BasketballSkills;
}

// 转换数据
function transformData(raw: typeof rawData[0]): {
  name: string;
  position: BasketballPosition;
  height: number;
  weight: number;
  age: number | null;
  skills: BasketballSkills;
} {
  // 填充缺失的身高体重
  const height = raw.height ?? randomHeight(raw.position);
  const weight = raw.weight ?? randomWeight(raw.position);

  // 映射位置
  const position = mapPosition(raw.position, height, weight);

  // 根据星级计算 overall
  const range = starToOverall[raw.stars] || starToOverall[3];
  const overall = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

  // 生成能力值
  const skills = generateSkills(position, overall);

  return {
    name: raw.name,
    position,
    height,
    weight,
    age: raw.age,
    skills,
  };
}

// 导入球员
export async function importPlayers(): Promise<{ success: number; failed: number; errors: string[] }> {
  const repo = createPlayerRepository('hybrid'); // 使用 Hybrid 模式
  const results = { success: 0, failed: 0, errors: [] as string[] };

  console.log('🚀 开始导入球员数据...\n');

  for (const raw of rawData) {
    try {
      const playerData = transformData(raw);

      console.log(`导入: ${playerData.name} (${playerData.position}) - Overall: ${playerData.skills.overall}`);

      await repo.create({
        name: playerData.name,
        position: playerData.position,
        skills: playerData.skills,
      });

      results.success++;
    } catch (error) {
      console.error(`❌ 导入失败: ${raw.name}`, error);
      results.failed++;
      results.errors.push(`${raw.name}: ${error}`);
    }
  }

  console.log(`\n✅ 导入完成！成功: ${results.success}, 失败: ${results.failed}`);

  return results;
}

// 导出转换后的数据（用于预览）
export function previewData(): Array<{ name: string; position: string; overall: number; height: number; weight: number }> {
  return rawData.map(raw => {
    const transformed = transformData(raw);
    return {
      name: transformed.name,
      position: transformed.position,
      overall: transformed.skills.overall,
      height: transformed.height,
      weight: transformed.weight,
    };
  });
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📊 数据预览:\n');
  console.table(previewData());

  console.log('\n开始导入...');
  importPlayers().catch(console.error);
}
