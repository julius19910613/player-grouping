/**
 * Repository 测试文件
 * 用于验证 Repository 是否正常工作
 */

import { createPlayerRepository, createGroupingRepository, setRepositoryConfig } from '../index';

// 测试切换配置
console.log('=== 测试 Repository 工厂 ===');

// 测试默认配置（Hybrid）
const playerRepo = createPlayerRepository();
const groupingRepo = createGroupingRepository();

console.log('✅ 默认 Repository 创建成功');
console.log('Player Repository:', playerRepo.constructor.name);
console.log('Grouping Repository:', groupingRepo.constructor.name);

// 测试切换到 SQLite
setRepositoryConfig({ player: 'sqlite', grouping: 'sqlite' });
const sqlitePlayerRepo = createPlayerRepository();
const sqliteGroupingRepo = createGroupingRepository();

console.log('✅ SQLite Repository 创建成功');
console.log('SQLite Player Repository:', sqlitePlayerRepo.constructor.name);
console.log('SQLite Grouping Repository:', sqliteGroupingRepo.constructor.name);

// 测试切换到 Supabase（如果配置可用）
setRepositoryConfig({ player: 'supabase', grouping: 'supabase' });
const supabasePlayerRepo = createPlayerRepository();
const supabaseGroupingRepo = createGroupingRepository();

console.log('✅ Supabase Repository 创建成功');
console.log('Supabase Player Repository:', supabasePlayerRepo.constructor.name);
console.log('Supabase Grouping Repository:', supabaseGroupingRepo.constructor.name);

console.log('=== 所有测试通过 ===');
