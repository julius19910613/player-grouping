/**
 * 将查询结果中的原始行转换为可用于雷达图展示的球员数据
 * 支持 Supabase 返回的多种结构：扁平、嵌套、snake_case / camelCase
 */

import { BasketballPosition, POSITION_DETAILS } from '@/types/basketball';
import type { BasketballSkills } from '@/types/basketball';

const SKILL_KEYS = [
  'twoPointShot', 'threePointShot', 'freeThrow', 'passing', 'ballControl',
  'courtVision', 'perimeterDefense', 'interiorDefense', 'steals', 'blocks',
  'offensiveRebound', 'defensiveRebound', 'speed', 'strength', 'stamina',
  'vertical', 'basketballIQ', 'teamwork', 'clutch', 'overall',
] as const;

const SNAKE_TO_CAMEL: Record<string, string> = {
  two_point_shot: 'twoPointShot',
  three_point_shot: 'threePointShot',
  free_throw: 'freeThrow',
  ball_control: 'ballControl',
  court_vision: 'courtVision',
  perimeter_defense: 'perimeterDefense',
  interior_defense: 'interiorDefense',
  offensive_rebound: 'offensiveRebound',
  defensive_rebound: 'defensiveRebound',
  basketball_iq: 'basketballIQ',
};

export interface NormalizedPlayerForChart {
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
}

function getSkillValue(obj: Record<string, unknown>, key: string): number | undefined {
  const camel = SNAKE_TO_CAMEL[key] ?? key;
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const val = obj[camel] ?? obj[key] ?? obj[snake];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseInt(val, 10);
  return undefined;
}

function extractSkills(raw: Record<string, unknown>): Partial<BasketballSkills> | null {
  // 可能是嵌套在 player_skills 中
  const skillsObj = (raw.player_skills as Record<string, unknown>) ?? raw;
  if (typeof skillsObj !== 'object' || skillsObj === null) return null;

  const obj = skillsObj as Record<string, unknown>;
  const skills: Partial<BasketballSkills> = {};
  let hasAny = false;

  for (const key of SKILL_KEYS) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    const val = getSkillValue(obj, key) ?? getSkillValue(obj, snakeKey);
    if (val !== undefined) {
      (skills as Record<string, number>)[key] = Math.min(99, Math.max(0, Math.round(val)));
      hasAny = true;
    }
  }

  return hasAny ? skills : null;
}

function extractNameAndPosition(raw: Record<string, unknown>): { name: string; position: BasketballPosition } | null {
  // 可能嵌套在 players 中
  const playersObj = raw.players as Record<string, unknown> | undefined;
  const base = (typeof playersObj === 'object' && playersObj !== null ? playersObj : raw) as Record<string, unknown>;

  const name = (base.name as string) ?? (base.player_name as string) ?? '';
  const pos = (base.position as string) ?? (base.player_position as string) ?? 'UTILITY';

  if (!name || typeof name !== 'string') return null;

  const validPositions: BasketballPosition[] = ['PG', 'SG', 'SF', 'PF', 'C', 'UTILITY'];
  const position = validPositions.includes(pos as BasketballPosition) ? (pos as BasketballPosition) : 'UTILITY';

  return { name, position };
}

/**
 * 将原始查询行转换为可用于雷达图的球员数据
 */
export function normalizePlayerForChart(row: unknown): NormalizedPlayerForChart | null {
  if (row === null || typeof row !== 'object') return null;
  const raw = row as Record<string, unknown>;

  const skillsPartial = extractSkills(raw);
  if (!skillsPartial) return null;

  const namePos = extractNameAndPosition(raw);
  if (!namePos) return null;

  // 补全缺失的技能为 50，计算 overall
  const defaultSkills = {
    twoPointShot: 50, threePointShot: 50, freeThrow: 50, passing: 50, ballControl: 50,
    courtVision: 50, perimeterDefense: 50, interiorDefense: 50, steals: 50, blocks: 50,
    offensiveRebound: 50, defensiveRebound: 50, speed: 50, strength: 50, stamina: 50,
    vertical: 50, basketballIQ: 50, teamwork: 50, clutch: 50, overall: 50,
  };

  const skills: BasketballSkills = { ...defaultSkills, ...skillsPartial };
  if (skills.overall === 50 && skillsPartial.overall === undefined) {
    // 简单平均作为 overall
    const keys = SKILL_KEYS.filter(k => k !== 'overall');
    const sum = keys.reduce((s, k) => s + (skills[k as keyof BasketballSkills] ?? 50), 0);
    skills.overall = Math.round(sum / keys.length);
  }

  return { name: namePos.name, position: namePos.position, skills };
}

/**
 * 检查数据是否包含球员技能（可展示雷达图）
 */
export function hasPlayerSkillData(data: unknown[]): boolean {
  return data.some(row => normalizePlayerForChart(row) !== null);
}
