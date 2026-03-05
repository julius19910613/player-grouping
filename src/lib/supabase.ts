/**
 * Supabase 客户端初始化
 *
 * 使用环境变量配置初始化 Supabase 客户端
 * 支持游客模式（匿名用户）
 * 
 * 配置说明：
 * - 在 .env.local 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
 * - 参考 .env.example 获取配置示例
 */

import { createClient } from '@supabase/supabase-js';

// Supabase 配置（从环境变量读取）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 验证配置
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ Supabase 配置缺失。请在 .env.local 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。\n' +
    '应用将降级使用 SQLite 本地存储。'
  );
}

// 创建 Supabase 客户端实例（如果配置可用）
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // 游客模式配置
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
  : null;

// 导出配置供其他模块使用
export const supabaseConfig = {
  url: SUPABASE_URL || '',
  anonKey: SUPABASE_ANON_KEY || '',
};

// 检查 Supabase 是否可用
export function isSupabaseAvailable(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export default supabase;
