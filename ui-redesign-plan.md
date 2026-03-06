# UI 改造计划 - Tailwind + shadcn/ui

## 目标
将现有的 CSS 样式改造为 Tailwind CSS + shadcn/ui 组件库

## 技术栈
- Tailwind CSS v4 (最新版)
- shadcn/ui (基于 Radix UI)
- 保持现有的 React + TypeScript + Vite

## Phase 1: 安装配置

### 1.1 安装 Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 1.2 配置 tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
    },
  },
  plugins: [],
}
```

### 1.3 配置 PostCSS (postcss.config.js)
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 1.4 更新 src/index.css (或创建 src/styles/globals.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 1.5 安装 shadcn/ui
```bash
npx shadcn@latest init
```
选择配置：
- Style: Default
- Base color: Violet (紫色主题)
- CSS variables: Yes

### 1.6 安装需要的 shadcn 组件
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add slider
npx shadcn@latest add badge
npx shadcn@latest add alert
npx shadcn@latest add skeleton
```

## Phase 2: 组件改造

### 2.1 App.tsx 改造
- 使用 Tailwind 类名替换现有 CSS
- 使用 shadcn Card、Button、Input、Select 组件
- 保持所有功能逻辑不变

### 2.2 设计规范
- **卡片**: 白色背景、圆角 xl、阴影 shadow-lg
- **按钮**: primary 用 violet-600，secondary 用 slate-200
- **表单**: 输入框用 border-slate-300，focus:ring-2 focus:ring-violet-500
- **布局**: max-w-7xl mx-auto px-4 py-8
- **响应式**: sm:, md:, lg: 断点

### 2.3 保留的设计元素
- 紫色渐变背景 (保留在根元素)
- 位置颜色标记 (保持原有逻辑)
- 球员卡片布局 (改用 Tailwind Grid)

## Phase 3: 验证

### 验证清单
- [ ] 所有页面正常渲染
- [ ] 添加球员功能正常
- [ ] 分组功能正常
- [ ] 导入/导出功能正常
- [ ] 响应式布局正常
- [ ] 无 console 错误

### DOM 验证方案 (供测试 subagent 使用)
```typescript
// 验证关键 DOM 元素存在
const header = document.querySelector('header')
const playerForm = document.querySelector('form')
const playerList = document.querySelector('[data-testid="player-list"]')

// 验证数据渲染
const playerCards = document.querySelectorAll('[data-testid="player-card"]')
expect(playerCards.length).toBeGreaterThan(0)

// 验证交互
const addButton = document.querySelector('button[type="submit"]')
fireEvent.click(addButton)
```

## 预期结果
- App.css 文件大幅简化（只保留必要样式）
- 所有组件使用 Tailwind 类名
- shadcn/ui 组件集成完成
- 功能完全保持不变
