/**
 * Supabase 客户端初始化
 *
 * 使用环境变量配置初始化 Supabase 客户端
 * 支持游客模式（匿名用户）
 *
 * 配置说明：
 * - 本地开发：在 .env.local 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
 * - Vercel 部署：在 Vercel 项目设置中添加环境变量
 * - GitHub Pages：在 GitHub Actions secrets 中配置
 *
 * 环境变量示例：
 * VITE_SUPABASE_URL=https://your-project.supabase.co
 * VITE_SUPABASE_ANON_KEY=eyJhbGc...
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 配置（从环境变量读取）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 验证配置
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ Supabase 配置缺失。请在对应平台的环境变量中设置：\n' +
    '- 本地开发：.env.local\n' +
    '- Vercel：项目设置 → Environment Variables\n' +
    '- GitHub Pages：Repository Settings → Secrets\n\n' +
    '应用将降级使用 SQLite 本地存储。'
  );
}

// 调试：在开发环境显示配置状态
if (import.meta.env.DEV) {
  console.log('🔍 Supabase 配置状态：', {
    urlConfigured: !!SUPABASE_URL,
    keyConfigured: !!SUPABASE_ANON_KEY,
    urlPrefix: SUPABASE_URL ? SUPABASE_URL.substring(0, 20) + '...' : '未配置',
  });
}

// 创建 Supabase 客户端实例（如果配置可用）
const _supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // 游客模式配置
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      // 全局错误处理
      global: {
        headers: {
          // 添加请求标识
          'X-Client-Info': 'player-grouping-v1',
        },
      },
    })
  : null;

// 导出为非空类型（调用者需确保 isSupabaseAvailable() 返回 true）
export const supabase = _supabase as SupabaseClient;

// 导出配置供其他模块使用
export const supabaseConfig = {
  url: SUPABASE_URL || '',
  anonKey: SUPABASE_ANON_KEY ? '***' + SUPABASE_ANON_KEY.slice(-4) : '', // 隐匿 API key
  isConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
};

// 检查 Supabase 是否可用
export function isSupabaseAvailable(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export default supabase;
