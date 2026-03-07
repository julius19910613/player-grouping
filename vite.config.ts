import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_BASE_URL 环境变量优先，否则根据部署平台使用默认值
  // - GitHub Pages: 需要设置 VITE_BASE_URL=/player-grouping/
  // - Vercel: 自动使用根路径 /
  // - 本地开发: 使用根路径 /
  const baseUrl = process.env.VITE_BASE_URL ||
                 (process.env.CF_PAGES ? '/' : // Cloudflare Pages
                  process.env.VERCEL ? '/' : // Vercel
                  mode === 'production' ? '/player-grouping/' : '/') // 默认 GitHub Pages

  return {
    plugins: [react(), tailwindcss()],
    base: baseUrl,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
