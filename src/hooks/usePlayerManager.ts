/**
 * 球员管理 Hook
 * @module hooks/usePlayerManager
 * 
 * 职责：
 * - 球员数据的 CRUD 操作
 * - 数据持久化（SQLite）
 * - 自动迁移（LocalStorage -> SQLite）
 * - 错误处理
 */

import { useState, useCallback, useEffect } from 'react';
import { PlayerRepository } from '../repositories/player.repository';
import { databaseService } from '../services/database';
import { performMigration } from '../utils/migration';
import type { Player } from '../types/player';
import { BasketballPosition, calculateOverallSkill } from '../types/basketball';
import type { BasketballSkills } from '../types/basketball';

// 重新导出 Player 类型，保持向后兼容
export type { Player } from '../types/player';

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Hook 返回类型
export interface UsePlayerManagerReturn {
  players: Player[];
  editingPlayer: Player | null;
  isLoading: boolean;
  isMigrating: boolean;
  error: string | null;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ValidationResult>;
  updatePlayer: (id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>) => Promise<ValidationResult>;
  deletePlayer: (id: string) => Promise<void>;
  refreshPlayers: () => Promise<void>;
  setEditingPlayer: (player: Player | null) => void;
  validatePlayer: (player: { name: string; position: BasketballPosition; skills: BasketballSkills }) => ValidationResult;
  clearError: () => void;
}

// 验证球员数据
function validatePlayerData(data: { name: string; position: BasketballPosition; skills: BasketballSkills }): ValidationResult {
  const errors: string[] = [];

  // 验证名称
  if (!data.name || data.name.trim().length === 0) {
    errors.push('球员名称不能为空');
  }

  if (data.name && data.name.length > 50) {
    errors.push('球员名称不能超过50个字符');
  }

  // 验证位置
  const validPositions = ['PG', 'SG', 'SF', 'PF', 'C', 'UTILITY'];
  if (!validPositions.includes(data.position)) {
    errors.push('无效的位置类型');
  }

  // 验证能力值
  const skillKeys: (keyof Omit<BasketballSkills, 'overall'>)[] = [
    'twoPointShot', 'threePointShot', 'freeThrow',
    'passing', 'ballControl', 'courtVision',
    'perimeterDefense', 'interiorDefense', 'steals', 'blocks',
    'offensiveRebound', 'defensiveRebound',
    'speed', 'strength', 'stamina', 'vertical',
    'basketballIQ', 'teamwork', 'clutch'
  ];

  for (const key of skillKeys) {
    const value = data.skills[key];
    if (typeof value !== 'number' || value < 1 || value > 99) {
      errors.push(`${key} 必须是 1-99 之间的数字`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 球员管理 Hook
 */
export function usePlayerManager(): UsePlayerManagerReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = new PlayerRepository();

  // 初始化和迁移
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);

        // 1. 初始化数据库
        await databaseService.init();

        // 2. 执行迁移（如果需要）
        setIsMigrating(true);
        const migrationResult = await performMigration();
        
        if (migrationResult.success) {
          if (migrationResult.playersMigrated > 0) {
            console.log(`✅ 迁移完成: ${migrationResult.playersMigrated} 个球员`);
          }
        } else {
          console.error('❌ 迁移失败:', migrationResult.error);
          setError('数据迁移失败，请刷新页面重试');
          setIsMigrating(false);
          return;
        }
        setIsMigrating(false);

        // 3. 加载球员数据
        const data = await repository.findAll();
        setPlayers(data);
        setError(null);
        
        console.log(`✅ 加载完成: ${data.length} 个球员`);
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败');
        console.error('❌ 初始化失败:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // 验证球员
  const validatePlayer = useCallback((player: { name: string; position: BasketballPosition; skills: BasketballSkills }) => {
    return validatePlayerData(player);
  }, []);

  // 刷新球员列表
  const refreshPlayers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await repository.findAll();
      setPlayers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败');
      console.error('❌ 刷新失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 添加球员
  const addPlayer = useCallback(
    async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationResult> => {
      const validation = validatePlayerData(playerData);

      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return validation;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 重新计算 overall
        const { overall, ...skillsWithoutOverall } = playerData.skills;
        const finalOverall = calculateOverallSkill(
          skillsWithoutOverall as Omit<BasketballSkills, 'overall'>,
          playerData.position
        );

        // 创建球员
        await repository.create({
          ...playerData,
          skills: { ...playerData.skills, overall: finalOverall },
        });

        // 刷新列表
        await refreshPlayers();

        console.log(`✅ 球员已添加: ${playerData.name}`);
        return { isValid: true, errors: [] };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '添加球员失败';
        setError(errorMessage);
        console.error('❌ 添加球员失败:', err);
        return { isValid: false, errors: [errorMessage] };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshPlayers]
  );

  // 更新球员
  const updatePlayer = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Player, 'id' | 'createdAt'>>
    ): Promise<ValidationResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const currentPlayer = players.find((p) => p.id === id);
        if (!currentPlayer) {
          const error = '找不到该球员';
          setError(error);
          setIsLoading(false);
          return { isValid: false, errors: [error] };
        }

        const updatedData = {
          name: updates.name ?? currentPlayer.name,
          position: updates.position ?? currentPlayer.position,
          skills: updates.skills ?? currentPlayer.skills,
        };

        const validation = validatePlayerData(updatedData);
        if (!validation.isValid) {
          setError(validation.errors.join(', '));
          setIsLoading(false);
          return validation;
        }

        // 重新计算 overall
        const { overall, ...skillsWithoutOverall } = updatedData.skills;
        const finalOverall = calculateOverallSkill(
          skillsWithoutOverall as Omit<BasketballSkills, 'overall'>,
          updatedData.position
        );

        // 更新球员
        await repository.update(id, {
          ...updates,
          skills: updates.skills ? { ...updates.skills, overall: finalOverall } : undefined,
        });

        // 刷新列表
        await refreshPlayers();
        setEditingPlayer(null);

        console.log(`✅ 球员已更新: ${id}`);
        return { isValid: true, errors: [] };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '更新球员失败';
        setError(errorMessage);
        console.error('❌ 更新球员失败:', err);
        return { isValid: false, errors: [errorMessage] };
      } finally {
        setIsLoading(false);
      }
    },
    [players, refreshPlayers]
  );

  // 删除球员
  const deletePlayer = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await repository.delete(id);
        await refreshPlayers();
        console.log(`✅ 球员已删除: ${id}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '删除球员失败';
        setError(errorMessage);
        console.error('❌ 删除球员失败:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshPlayers]
  );

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    players,
    editingPlayer,
    isLoading,
    isMigrating,
    error,
    addPlayer,
    updatePlayer,
    deletePlayer,
    refreshPlayers,
    setEditingPlayer,
    validatePlayer,
    clearError,
  };
}
