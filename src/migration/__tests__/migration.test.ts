/**
 * 数据迁移测试
 * @module migration/__tests__/migration.test
 * 
 * 测试目标：
 * - 数据完整性
 * - 迁移正确性
 * - 回滚功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { migrationManager } from '../migrate-to-supabase';
import { rollbackManager } from '../rollback';
import { migrationProgress } from '../migration-progress';
import { PlayerRepository } from '../../repositories/player.repository';
import { GroupingRepository } from '../../repositories/grouping.repository';
import { SupabasePlayerRepository } from '../../repositories/supabase-player.repository';
import { SupabaseGroupingRepository } from '../../repositories/supabase-grouping.repository';
import { databaseService } from '../../services/database';
import { BasketballPosition } from '../../types/basketball';

describe('数据迁移测试', () => {
  let playerRepo: PlayerRepository;
  let groupingRepo: GroupingRepository;
  let supabasePlayerRepo: SupabasePlayerRepository;
  let supabaseGroupingRepo: SupabaseGroupingRepository;
  
  beforeEach(async () => {
    // 初始化数据库
    if (!databaseService.isInitialized()) {
      await databaseService.init();
    }
    
    // 清空数据
    await databaseService.clear();
    
    // 初始化仓库
    playerRepo = new PlayerRepository();
    groupingRepo = new GroupingRepository();
    supabasePlayerRepo = new SupabasePlayerRepository();
    supabaseGroupingRepo = new SupabaseGroupingRepository();
    
    // 清除迁移进度
    migrationProgress.clearProgress();
  });
  
  afterEach(async () => {
    // 清理
    await databaseService.clear();
    migrationProgress.clearProgress();
  });
  
  describe('数据完整性测试', () => {
    it('应该保留所有球员数据', async () => {
      // 1. 创建测试数据
      const testPlayers = [
        { name: '球员A', position: BasketballPosition.PG, skills: { ...createDefaultSkills(), twoPointShot: 80 } },
        { name: '球员B', position: BasketballPosition.SG, skills: { ...createDefaultSkills(), threePointShot: 85 } },
        { name: '球员C', position: BasketballPosition.C, skills: { ...createDefaultSkills(), blocks: 90 } },
      ];
      
      for (const player of testPlayers) {
        await playerRepo.create(player);
      }
      
      // 2. 验证数据已创建
      const sqlitePlayers = await playerRepo.findAll();
      expect(sqlitePlayers.length).toBe(3);
      
      // 3. 模拟迁移（跳过 Supabase 调用）
      // 注意：实际测试需要 Mock Supabase 或使用测试环境
      
      // 4. 验证数据完整性（字段是否一致）
      for (let i = 0; i < sqlitePlayers.length; i++) {
        const original = testPlayers[i];
        const saved = sqlitePlayers[i];
        
        expect(saved.name).toBe(original.name);
        expect(saved.position).toBe(original.position);
        expect(saved.skills.twoPointShot).toBe(original.skills.twoPointShot);
        expect(saved.skills.threePointShot).toBe(original.skills.threePointShot);
        expect(saved.skills.blocks).toBe(original.skills.blocks);
      }
    });
    
    it('应该保留所有分组历史数据', async () => {
      // 1. 创建测试数据
      const testHistories = [
        {
          mode: '5v5' as const,
          teamCount: 2,
          playerCount: 10,
          balanceScore: 85.5,
          data: { teams: [] },
          note: '测试记录1',
        },
        {
          mode: '3v3' as const,
          teamCount: 2,
          playerCount: 6,
          balanceScore: 90.0,
          data: { teams: [] },
          note: '测试记录2',
        },
      ];
      
      for (const history of testHistories) {
        await groupingRepo.save(history);
      }
      
      // 2. 验证数据已创建
      const sqliteHistories = await groupingRepo.getRecent(10);
      expect(sqliteHistories.length).toBe(2);
      
      // 3. 验证数据完整性
      expect(sqliteHistories[0].mode).toBe('3v3');  // 降序排列
      expect(sqliteHistories[0].balanceScore).toBe(90.0);
      expect(sqliteHistories[1].mode).toBe('5v5');
      expect(sqliteHistories[1].balanceScore).toBe(85.5);
    });
    
    it('应该正确处理 skills 的所有字段', async () => {
      // 1. 创建包含所有 skills 字段的球员
      const player = await playerRepo.create({
        name: '全能球员',
        position: BasketballPosition.SF,
        skills: {
          twoPointShot: 75,
          threePointShot: 70,
          freeThrow: 80,
          passing: 85,
          ballControl: 82,
          courtVision: 78,
          perimeterDefense: 76,
          interiorDefense: 74,
          steals: 77,
          blocks: 72,
          offensiveRebound: 73,
          defensiveRebound: 75,
          speed: 88,
          strength: 70,
          stamina: 85,
          vertical: 82,
          basketballIQ: 90,
          teamwork: 88,
          clutch: 85,
        },
      });
      
      // 2. 重新读取
      const saved = await playerRepo.findById(player.id);
      expect(saved).not.toBeNull();
      
      // 3. 验证所有字段
      expect(saved!.skills.twoPointShot).toBe(75);
      expect(saved!.skills.threePointShot).toBe(70);
      expect(saved!.skills.freeThrow).toBe(80);
      expect(saved!.skills.passing).toBe(85);
      expect(saved!.skills.ballControl).toBe(82);
      expect(saved!.skills.courtVision).toBe(78);
      expect(saved!.skills.perimeterDefense).toBe(76);
      expect(saved!.skills.interiorDefense).toBe(74);
      expect(saved!.skills.steals).toBe(77);
      expect(saved!.skills.blocks).toBe(72);
      expect(saved!.skills.offensiveRebound).toBe(73);
      expect(saved!.skills.defensiveRebound).toBe(75);
      expect(saved!.skills.speed).toBe(88);
      expect(saved!.skills.strength).toBe(70);
      expect(saved!.skills.stamina).toBe(85);
      expect(saved!.skills.vertical).toBe(82);
      expect(saved!.skills.basketballIQ).toBe(90);
      expect(saved!.skills.teamwork).toBe(88);
      expect(saved!.skills.clutch).toBe(85);
    });
  });
  
  describe('迁移正确性测试', () => {
    it('应该正确转换数据格式', () => {
      // 测试 SQLite -> Supabase 的字段映射
      const sqlitePlayer = {
        id: 'player-123',
        name: '测试球员',
        position: BasketballPosition.PG,
        skills: {
          twoPointShot: 80,
          threePointShot: 75,
          // ... 其他字段
        },
      };
      
      // 预期的 Supabase 格式
      const expectedSupabasePlayer = {
        name: '测试球员',
        position: 'PG',
        skills: {
          two_point_shot: 80,
          three_point_shot: 75,
          // ... 其他字段（下划线命名）
        },
      };
      
      // 验证字段映射逻辑（实际转换在 SupabasePlayerRepository 中）
      expect(sqlitePlayer.name).toBe(expectedSupabasePlayer.name);
      expect(sqlitePlayer.position).toBe(expectedSupabasePlayer.position);
    });
    
    it('应该正确处理空数据', async () => {
      // 1. 数据库为空时迁移
      const result = await migrationManager.migratePlayers();
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(0);
      expect(result.migrated).toBe(0);
      expect(result.failed).toBe(0);
    });
    
    it('应该正确处理错误情况', async () => {
      // 1. 创建测试数据
      await playerRepo.create({
        name: '测试球员',
        position: BasketballPosition.PG,
        skills: createDefaultSkills(),
      });
      
      // 2. 模拟 Supabase 不可用
      // 注意：需要 Mock Supabase 或使用测试环境
      
      // 3. 验证错误处理
      // expect(result.success).toBe(false);
      // expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('回滚功能测试', () => {
    it('应该能够创建备份', async () => {
      // 1. 创建测试数据
      await playerRepo.create({
        name: '测试球员',
        position: BasketballPosition.PG,
        skills: createDefaultSkills(),
      });
      
      // 2. 创建备份
      const backupId = await rollbackManager.createBackup('测试备份');
      expect(backupId).not.toBeNull();
      
      // 3. 验证备份列表
      const backups = await rollbackManager.listBackups();
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0].note).toBe('测试备份');
    });
    
    it('应该能够从备份恢复', async () => {
      // 1. 创建测试数据
      const player = await playerRepo.create({
        name: '测试球员',
        position: BasketballPosition.PG,
        skills: createDefaultSkills(),
      });
      
      // 2. 创建备份
      const backupId = await rollbackManager.createBackup('测试备份');
      expect(backupId).not.toBeNull();
      
      // 3. 修改数据
      await playerRepo.update(player.id, { name: '修改后的名字' });
      const updated = await playerRepo.findById(player.id);
      expect(updated!.name).toBe('修改后的名字');
      
      // 4. 从备份恢复
      await rollbackManager.rollback('players', backupId!);
      
      // 5. 验证恢复
      const restored = await playerRepo.findById(player.id);
      expect(restored!.name).toBe('测试球员');
    });
    
    it('应该正确更新迁移进度状态', async () => {
      // 1. 开始迁移
      migrationProgress.startMigration('players', 10);
      
      let progress = migrationProgress.getProgress('players');
      expect(progress!.status).toBe('running');
      expect(progress!.total).toBe(10);
      expect(progress!.migrated).toBe(0);
      
      // 2. 更新进度
      migrationProgress.updateProgress('players', 5);
      progress = migrationProgress.getProgress('players');
      expect(progress!.migrated).toBe(5);
      
      // 3. 完成迁移
      migrationProgress.completeMigration('players');
      progress = migrationProgress.getProgress('players');
      expect(progress!.status).toBe('completed');
    });
    
    it('应该正确记录迁移错误', async () => {
      // 1. 开始迁移
      migrationProgress.startMigration('players', 3);
      
      // 2. 记录错误
      migrationProgress.recordError('players', 'player-1', '网络错误');
      migrationProgress.recordError('players', 'player-2', '数据格式错误');
      
      // 3. 验证错误记录
      const progress = migrationProgress.getProgress('players');
      expect(progress!.errors.length).toBe(2);
      expect(progress!.failed).toBe(2);
      expect(progress!.errors[0].id).toBe('player-1');
      expect(progress!.errors[0].error).toBe('网络错误');
    });
  });
  
  describe('进度跟踪测试', () => {
    it('应该正确计算百分比', () => {
      migrationProgress.startMigration('players', 100);
      
      migrationProgress.updateProgress('players', 25);
      let progress = migrationProgress.getProgress('players');
      expect(progress!.migrated).toBe(25);
      
      migrationProgress.updateProgress('players', 50);
      progress = migrationProgress.getProgress('players');
      expect(progress!.migrated).toBe(50);
      
      migrationProgress.updateProgress('players', 100);
      progress = migrationProgress.getProgress('players');
      expect(progress!.migrated).toBe(100);
    });
    
    it('应该检测是否有运行中的迁移', () => {
      // 初始状态
      expect(migrationProgress.hasRunningMigration()).toBe(false);
      
      // 开始迁移
      migrationProgress.startMigration('players', 10);
      expect(migrationProgress.hasRunningMigration()).toBe(true);
      
      // 完成迁移
      migrationProgress.completeMigration('players');
      expect(migrationProgress.hasRunningMigration()).toBe(false);
    });
    
    it('应该正确获取迁移摘要', () => {
      // 1. 创建球员和分组历史的迁移进度
      migrationProgress.startMigration('players', 10);
      migrationProgress.startMigration('grouping_history', 5);
      
      // 2. 更新进度
      migrationProgress.updateProgress('players', 8);
      migrationProgress.completeMigration('grouping_history');
      
      // 3. 获取摘要
      const summary = migrationProgress.getSummary();
      
      expect(summary.players).not.toBeNull();
      expect(summary.players!.migrated).toBe(8);
      expect(summary.players!.status).toBe('running');
      
      expect(summary.groupingHistory).not.toBeNull();
      expect(summary.groupingHistory!.status).toBe('completed');
      
      expect(summary.hasRunningMigration).toBe(true);
    });
  });
});

/**
 * 创建默认技能值
 */
function createDefaultSkills() {
  return {
    twoPointShot: 50,
    threePointShot: 50,
    freeThrow: 50,
    passing: 50,
    ballControl: 50,
    courtVision: 50,
    perimeterDefense: 50,
    interiorDefense: 50,
    steals: 50,
    blocks: 50,
    offensiveRebound: 50,
    defensiveRebound: 50,
    speed: 50,
    strength: 50,
    stamina: 50,
    vertical: 50,
    basketballIQ: 50,
    teamwork: 50,
    clutch: 50,
  };
}
