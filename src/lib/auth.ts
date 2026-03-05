/**
 * Supabase 匿名认证模块
 * @module lib/auth
 * 
 * 职责：
 * - 实现匿名认证流程（getOrCreateAnonymousUser）
 * - 处理在线/离线模式切换
 * - 缓存 user_id 到 LocalStorage
 * - 提供认证状态监听
 */

import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

/**
 * 认证结果
 */
export interface AuthResult {
  user: User | null;
  error: AuthError | null;
  isOffline: boolean;
}

/**
 * 认证错误类
 */
export class AuthError extends Error {
  code: string;
  recoverable: boolean;

  constructor(message: string, code: string, recoverable: boolean) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

/**
 * LocalStorage 键名
 */
const STORAGE_KEYS = {
  USER_ID: 'anonymous_user_id',
  SESSION: 'supabase_session',
} as const;

/**
 * 获取或创建匿名用户
 * 
 * 完整流程：
 * 1. 检查 LocalStorage 缓存
 * 2. 检查网络连接
 * 3. 在线模式：创建/恢复 Supabase 匿名用户
 * 4. 离线模式：生成临时 UUID
 * 
 * @returns 认证结果
 */
export async function getOrCreateAnonymousUser(): Promise<AuthResult> {
  // 1. 检查是否已有匿名用户（LocalStorage 缓存）
  const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  const storedSession = localStorage.getItem(STORAGE_KEYS.SESSION);

  if (storedUserId && storedSession) {
    try {
      // 尝试恢复会话
      const { data: { session }, error: _error } = await supabase!.auth.getSession();

      if (session?.user && session.user.id === storedUserId) {
        console.log('✅ 认证成功：恢复已有会话', session.user.id);
        return { user: session.user, error: null, isOffline: false };
      }
    } catch (e) {
      console.warn('⚠️ 会话恢复失败，将创建新会话:', e);
    }
  }

  // 2. 检查网络连接
  if (!navigator.onLine) {
    // 离线模式：生成临时 user_id（使用 UUID v4）
    const tempUserId = generateTempUserId();

    console.log('📴 离线模式：使用临时 user_id', tempUserId);

    return {
      user: {
        id: tempUserId,
        isAnonymous: true,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any,
      error: null,
      isOffline: true,
    };
  }

  // 3. 检查 Supabase 是否可用
  if (!supabase) {
    console.warn('⚠️ Supabase 不可用，使用临时 user_id');
    const tempUserId = generateTempUserId();

    return {
      user: {
        id: tempUserId,
        isAnonymous: true,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any,
      error: null,
      isOffline: true,
    };
  }

  // 4. 在线模式：创建/恢复匿名用户
  try {
    // 先尝试恢复会话（如果有）
    const { data: { session: existingSession } } = await supabase.auth.getSession();

    if (existingSession?.user) {
      // 缓存到 LocalStorage
      cacheUserId(existingSession.user.id);
      console.log('✅ 认证成功：使用已有会话', existingSession.user.id);
      return { user: existingSession.user, error: null, isOffline: false };
    }

    // 创建新的匿名用户
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      throw new AuthError(
        `匿名认证失败: ${error.message}`,
        error.status?.toString() || 'UNKNOWN',
        true // 可恢复（可重试）
      );
    }

    const user = data.user;
    if (!user) {
      throw new AuthError(
        '创建匿名用户失败：未返回用户信息',
        'NO_USER',
        true
      );
    }

    // 缓存到 LocalStorage
    cacheUserId(user.id);

    console.log('✅ 认证成功：创建新匿名用户', user.id);

    return { user, error: null, isOffline: false };

  } catch (error) {
    if (error instanceof AuthError) {
      console.error('❌ 认证失败:', error.message);
      return { user: null, error, isOffline: false };
    }

    // 网络错误等其他错误
    const authError = new AuthError(
      `认证过程出错: ${(error as Error).message}`,
      'NETWORK_ERROR',
      true
    );

    console.error('❌ 认证过程出错:', authError.message);

    return { user: null, error: authError, isOffline: true };
  }
}

/**
 * 获取当前用户 ID
 * 
 * 优先级：
 * 1. Supabase 当前会话
 * 2. LocalStorage 缓存
 * 3. 返回 null
 * 
 * @returns 用户 ID 或 null
 */
export async function getCurrentUserId(): Promise<string | null> {
  // 1. 从 Supabase 获取
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
    } catch (e) {
      console.warn('⚠️ 获取 Supabase 会话失败:', e);
    }
  }

  // 2. 从 LocalStorage 获取
  const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (storedUserId) {
    return storedUserId;
  }

  // 3. 未认证
  return null;
}

/**
 * 缓存 user_id 到 LocalStorage
 */
function cacheUserId(userId: string): void {
  localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ userId, timestamp: Date.now() }));
}

/**
 * 生成临时 user_id（离线模式）
 */
function generateTempUserId(): string {
  // 使用 crypto.randomUUID() 或降级方案
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // 降级：使用时间戳 + 随机数
  return 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 监听认证状态变化
 * 
 * 用法：
 * ```typescript
 * const { data: listener } = onAuthStateChange((user) => {
 *   console.log('当前用户:', user?.id);
 * });
 * 
 * // 清理
 * listener?.subscription.unsubscribe();
 * ```
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!supabase) {
    console.warn('⚠️ Supabase 不可用，无法监听认证状态变化');
    return { data: null };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 认证状态变化:', event, session?.user?.id);

    if (session?.user) {
      cacheUserId(session.user.id);
    }

    callback(session?.user || null);
  });
}

/**
 * 登出（删除匿名用户）
 * 
 * 注意：匿名用户登出后数据将丢失
 * 仅用于测试或清除用户数据
 */
export async function signOut(): Promise<void> {
  if (!supabase) {
    console.warn('⚠️ Supabase 不可用');
    return;
  }

  try {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    console.log('✅ 已登出');
  } catch (error) {
    console.error('❌ 登出失败:', error);
    throw error;
  }
}

/**
 * 检查是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId !== null;
}
