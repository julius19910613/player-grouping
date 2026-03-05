/**
 * 认证流程使用示例
 * @module examples/auth-usage
 * 
 * 本文件展示如何在应用中使用匿名认证
 */

import { getOrCreateAnonymousUser, getCurrentUserId, onAuthStateChange } from '../lib/auth';

/**
 * 示例 1: 应用启动时初始化认证
 */
export async function initApp() {
  console.log('🚀 应用启动，初始化认证...');

  const result = await getOrCreateAnonymousUser();

  if (result.error) {
    console.error('❌ 认证失败:', result.error.message);
    
    if (result.isOffline) {
      console.log('📴 使用离线模式');
    } else {
      // 可以重试或降级到本地模式
      console.log('💡 建议：检查网络连接后重试');
    }
  } else {
    console.log('✅ 认证成功:', {
      userId: result.user?.id,
      isAnonymous: result.user?.isAnonymous,
      isOffline: result.isOffline,
    });
  }

  return result;
}

/**
 * 示例 2: 在 React 组件中使用认证
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initAuth() {
      const result = await getOrCreateAnonymousUser();
      
      if (result.error) {
        setError(result.error);
      }
      
      setUser(result.user);
      setIsLoading(false);
    }

    initAuth();

    // 监听认证状态变化
    const { data: listener } = onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading, error };
}

/**
 * 示例 3: 在 Repository 操作前检查认证
 */
export async function createPlayerExample(playerData: any) {
  // 1. 获取当前用户 ID
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('请先完成认证');
  }

  console.log('📝 创建球员，用户 ID:', userId);

  // 2. 调用 Repository（会自动关联 user_id）
  // const player = await playerRepository.create(playerData);
  
  // 3. 返回结果
  // return player;
}

/**
 * 示例 4: 处理离线场景
 */
export async function handleOfflineScenario() {
  const result = await getOrCreateAnonymousUser();

  if (result.isOffline) {
    console.log('📴 当前为离线模式');
    console.log('💡 数据将保存在本地，网络恢复后会自动同步');
    
    // 可以显示离线提示给用户
    // showToast('当前为离线模式，数据将在网络恢复后同步');
  } else {
    console.log('🌐 在线模式，数据将实时同步到云端');
  }

  return result;
}

/**
 * 示例 5: 完整的应用初始化流程（App.tsx 中使用）
 */
export async function appInitialization() {
  try {
    // 1. 初始化认证
    const authResult = await getOrCreateAnonymousUser();

    if (authResult.error && !authResult.isOffline) {
      // 在线但认证失败 - 严重错误
      console.error('❌ 认证失败，无法启动应用:', authResult.error);
      throw authResult.error;
    }

    // 2. 根据认证状态初始化数据层
    if (authResult.isOffline) {
      console.log('📴 离线模式：使用 SQLite 本地存储');
      // 使用 HybridRepository（会自动降级到 SQLite）
    } else {
      console.log('🌐 在线模式：使用 Supabase + SQLite 混合存储');
      // 使用 HybridRepository（优先 Supabase）
    }

    // 3. 加载初始数据
    // const players = await playerRepository.findAll();
    // const history = await groupingRepository.getRecent(10);

    // 4. 返回初始化结果
    return {
      success: true,
      user: authResult.user,
      isOffline: authResult.isOffline,
    };

  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * 示例 6: 监听认证状态变化（用于实时更新 UI）
 */
export function setupAuthListener() {
  console.log('🔐 设置认证状态监听...');

  const { data: listener } = onAuthStateChange((user) => {
    if (user) {
      console.log('✅ 用户已认证:', user.id);
      // 更新 UI 状态
      // 可能需要重新加载数据
    } else {
      console.log('🔓 用户未认证');
      // 显示登录提示或重新初始化认证
    }
  });

  // 返回清理函数
  return () => {
    listener?.subscription.unsubscribe();
  };
}

/**
 * 示例 7: 处理认证错误（重试逻辑）
 */
export async function authenticateWithRetry(maxRetries: number = 3) {
  let lastError: AuthError | null = null;

  for (let i = 0; i < maxRetries; i++) {
    const result = await getOrCreateAnonymousUser();

    if (!result.error) {
      return result;
    }

    lastError = result.error;

    if (!result.error.recoverable) {
      console.error('❌ 不可恢复的错误，停止重试');
      break;
    }

    console.log(`⚠️ 认证失败，重试 ${i + 1}/${maxRetries}...`);
    
    // 指数退避
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }

  throw lastError;
}

/**
 * 示例 8: 在测试中模拟认证
 */
export function mockAuthForTesting(userId: string) {
  localStorage.setItem('anonymous_user_id', userId);
  localStorage.setItem('supabase_session', JSON.stringify({
    userId,
    timestamp: Date.now(),
  }));

  console.log('🧪 测试模式：模拟认证用户', userId);
}

/**
 * 示例 9: 清除认证（用于测试或登出）
 */
export function clearAuth() {
  localStorage.removeItem('anonymous_user_id');
  localStorage.removeItem('supabase_session');
  console.log('🧹 已清除认证信息');
}

// 注意：useState 和 useEffect 是 React hooks，仅作示例
// 实际使用时需要从 'react' 导入
import { useState, useEffect } from 'react';
import type { AuthError } from '../lib/auth';
