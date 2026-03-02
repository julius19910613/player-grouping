import { useState, useCallback, useMemo } from 'react';
import { BasketballPosition, BasketballSkills, createDefaultBasketballSkills, calculateOverallSkill } from '../types/basketball';

// 球员接口
export interface Player {
  id: string;
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
  createdAt: Date;
  updatedAt: Date;
}

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
  error: string | null;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => ValidationResult;
  updatePlayer: (id: string, updates: Partial<Omit<Player, 'id' | 'createdAt'>>) => ValidationResult;
  deletePlayer: (id: string) => void;
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

export function usePlayerManager(initialPlayers: Player[] = []): UsePlayerManagerReturn {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 验证球员
  const validatePlayer = useCallback((player: { name: string; position: BasketballPosition; skills: BasketballSkills }) => {
    return validatePlayerData(player);
  }, []);

  // 添加球员
  const addPlayer = useCallback((playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): ValidationResult => {
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

      const newPlayer: Player = {
        ...playerData,
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        skills: { ...playerData.skills, overall: finalOverall },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setPlayers(prev => [...prev, newPlayer]);
      setIsLoading(false);
      return { isValid: true, errors: [] };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加球员失败';
      setError(errorMessage);
      setIsLoading(false);
      return { isValid: false, errors: [errorMessage] };
    }
  }, []);

  // 更新球员
  const updatePlayer = useCallback((
    id: string,
    updates: Partial<Omit<Player, 'id' | 'createdAt'>>
  ): ValidationResult => {
    setIsLoading(true);
    setError(null);

    try {
      const playerIndex = players.findIndex(p => p.id === id);
      if (playerIndex === -1) {
        const error = '找不到该球员';
        setError(error);
        setIsLoading(false);
        return { isValid: false, errors: [error] };
      }

      const currentPlayer = players[playerIndex];
      const updatedData = {
        name: updates.name ?? currentPlayer.name,
        position: updates.position ?? currentPlayer.position,
        skills: updates.skills ?? currentPlayer.skills
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

      const updatedPlayer: Player = {
        ...currentPlayer,
        ...updates,
        skills: { ...updatedData.skills, overall: finalOverall },
        updatedAt: new Date()
      };

      setPlayers(prev => prev.map(p => p.id === id ? updatedPlayer : p));
      setEditingPlayer(null);
      setIsLoading(false);
      return { isValid: true, errors: [] };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新球员失败';
      setError(errorMessage);
      setIsLoading(false);
      return { isValid: false, errors: [errorMessage] };
    }
  }, [players]);

  // 删除球员
  const deletePlayer = useCallback((id: string) => {
    setIsLoading(true);
    try {
      setPlayers(prev => prev.filter(p => p.id !== id));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除球员失败';
      setError(errorMessage);
    }
    setIsLoading(false);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 计算总能力
  const totalSkill = useMemo(() => {
    return players.reduce((sum, p) => sum + p.skills.overall, 0);
  }, [players]);

  return {
    players,
    editingPlayer,
    isLoading,
    error,
    addPlayer,
    updatePlayer,
    deletePlayer,
    setEditingPlayer,
    validatePlayer,
    clearError
  };
}
