# 部署指南

> 更新时间: 2026-03-03
> 版本: 1.0.0

---

## 📋 部署前检查

### 1. 环境要求
- Node.js 16+
- npm 或 yarn
- Git

### 2. 依赖检查
```bash
# 确认 sql.js 和 idb 已安装
npm list sql.js idb

# 应该显示：
# sql.js@1.10.3
# idb@8.0.0
```

### 3. 构建测试
```bash
# 执行构建
npm run build

# 预览构建结果
npm run preview
```

---

## 🚀 部署步骤

本项目同时支持 **GitHub Pages** 和 **Vercel** 部署，通过环境变量自动配置 base 路径。

### 环境变量配置说明

| 平台 | VITE_BASE_URL | 访问地址 |
|------|----------------|----------|
| GitHub Pages | `/player-grouping/` | `https://julius19910613.github.io/player-grouping/` |
| Vercel | `/` | `https://your-project.vercel.app/` |
| 本地开发 | 不设置 | `http://localhost:5173/` |

### 自动检测机制

`vite.config.ts` 会按优先级自动设置 `base` 路径：

1. **VITE_BASE_URL** 环境变量（最高优先级）
2. **CF_PAGES** 环境变量（Cloudflare Pages）
3. **VERCEL** 环境变量（Vercel）
4. 生产模式默认：`/player-grouping/`（GitHub Pages 默认）
5. 其他情况：`/`（开发环境）

### 方法 1: 自动部署到 GitHub Pages（推荐）

项目已配置 GitHub Actions，推送到 `main` 分支会自动部署。

```bash
# 自动部署（推送代码即可）
git push origin main
```

**GitHub Actions 配置**：`.github/workflows/deploy.yml`
- 自动设置 `VITE_BASE_URL=/player-grouping/`
- 支持 Supabase 环境变量配置
- 自动构建和部署到 GitHub Pages

### 方法 2: Vercel 部署

**首次部署**：
1. 访问 [vercel.com](https://vercel.com)
2. 导入 GitHub 仓库
3. Vercel 会自动读取 `vercel.json` 配置
4. **关键步骤：配置环境变量**（见下方）
5. 构建和部署自动完成

**环境变量配置（必需）**：

在 Vercel 项目设置中添加环境变量：

1. 进入你的 Vercel 项目
2. 点击 **Settings** → **Environment Variables**
3. 添加以下变量：

| 环境变量 | 值 | 说明 |
|-----------|-----|------|
| `VITE_BASE_URL` | `/` | 部署基础路径 |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase 匿名密钥 |

**重要提示**：
- ⚠️ **环境变量名必须以 `VITE_` 开头**，否则 Vite 不会注入到客户端代码
- 🔑 Supabase 配置获取方式：
  1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
  2. 选择你的项目
  3. 进入 Settings → API
  4. 复制 **Project URL** 和 **anon public key**
- ✅ 添加环境变量后，需要**重新部署**项目才能生效
- 🔄 每次修改环境变量后，Vercel 会自动触发重新构建

### 方法 3: 手动部署到 GitHub Pages

```bash
# 1. 构建
npm run build

# 2. 部署到 GitHub Pages
npm run deploy

# 等待 1-2 分钟后访问
# https://julius19910613.github.io/player-grouping
```

### 方法 4: 手动部署到 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

---

## ✅ 部署后验证

### 1. 访问应用
- URL: https://julius19910613.github.io/player-grouping

### 2. 检查功能
- [ ] 应用可以正常加载
- [ ] 资源路径正确（无 404 错误）
- [ ] sql.js WASM 文件加载成功
- [ ] 可以添加球员
- [ ] 可以编辑球员
- [ ] 可以删除球员
- [ ] 数据持久化（刷新后数据保留）
- [ ] 旧数据自动迁移（如果有）
- [ ] Supabase 连接正常（如果配置）

### 3. 平台特定检查

**GitHub Pages**：
- [ ] 资源路径使用 `/player-grouping/` 前缀
- [ ] `https://julius19910613.github.io/player-grouping/` 可访问
- [ ] 页面链接点击正常工作

**Vercel**：
- [ ] 资源路径使用 `/` 根路径
- [ ] `https://your-project.vercel.app/` 可访问
- [ ] 所有静态资源正常加载

### 3. 检查控制台
打开浏览器开发者工具，确认：
- ✅ 没有 JavaScript 错误
- ✅ sql.js 初始化成功
- ✅ IndexedDB 可用
- ✅ 没有网络错误（WASM 文件加载）

---

## 🔧 生产环境配置

### sql.js WASM 加载

sql.js 从 CDN 加载 WASM 文件：

```typescript
const SQL = await initSqlJs({
  locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
});
```

**优点**:
- 利用 CDN 加速
- 减少打包体积
- 自动缓存

**注意事项**:
- 需要网络连接
- 首次加载可能较慢
- 建议使用支持的现代浏览器

### 备用方案

如果需要离线支持，可以下载 WASM 文件到本地：

1. **下载 WASM 文件**
   ```bash
   mkdir -p public/wasm
   curl -L https://sql.js.org/dist/sql-wasm.wasm -o public/wasm/sql-wasm.wasm
   ```

2. **修改 database.ts**
   ```typescript
   const SQL = await initSqlJs({
     locateFile: (file: string) => `/player-grouping/wasm/${file}`,
   });
   ```

---

## 📊 性能监控

### 关键指标

| 指标 | 目标值 | 监控方法 |
|------|--------|---------|
| 首次加载 | < 3s | Chrome DevTools |
| sql.js 初始化 | < 1s | console.time |
| 添加球员 | < 500ms | console.time |
| 查询所有球员 | < 100ms | console.time |

### 错误监控

在 `src/services/database.ts` 中已包含错误日志：

```typescript
console.error('❌ 数据库初始化失败:', error);
console.error('❌ SQL 查询失败:', sql, error);
console.error('❌ 迁移失败:', error);
```

可以集成第三方错误监控服务（如 Sentry）。

---

## 🐛 常见部署问题

### 1. sql.js WASM 加载失败

**症状**: 控制台显示 "Failed to fetch sql-wasm.wasm"

**原因**:
- 网络问题
- CDN 不可用
- CORS 错误

**解决方案**:
```bash
# 方案 1: 下载到本地（见上方备用方案）
# 方案 2: 使用不同的 CDN
# 方案 3: 检查网络和防火墙设置
```

### 2. 数据迁移失败

**症状**: 旧数据没有迁移到 SQLite

**检查**:
```javascript
// 在浏览器控制台执行
import { getMigrationStatus } from './utils/migration';
const status = await getMigrationStatus();
console.log(status);
```

**解决方案**:
- 检查 LocalStorage 中是否有旧数据
- 检查 IndexedDB 是否可用
- 查看控制台错误日志

### 3. IndexedDB 不可用

**症状**: "IndexedDB not available" 错误

**原因**:
- 隐私模式/无痕模式
- 浏览器设置禁用了 IndexedDB
- 存储配额已满

**解决方案**:
- 使用正常模式（非隐私模式）
- 清除浏览器数据
- 使用支持的浏览器

### 4. 部署后页面空白

**症状**: 访问 URL 显示空白页

**检查**:
1. 打开开发者工具查看控制台错误
2. 检查资源加载状态（404 错误）
3. 检查 `vite.config.ts` 的 `base` 配置
4. 确认所有资源路径正确

**解决方案**:
```typescript
// vite.config.ts - 已自动配置
// 本地开发使用: /
// GitHub Pages 使用: /player-grouping/
// Vercel 使用: /
```

### 5. 跨平台部署资源路径错误

**症状**：
- GitHub Pages 部署到 Vercel 后资源 404
- Vercel 部署到 GitHub Pages 后资源 404
- 页面可以访问，但样式和脚本加载失败

**原因**：base 路径配置与部署平台不匹配

**解决方案**：
- **Vercel**：确保环境变量 `VITE_BASE_URL=/` 已设置
- **GitHub Pages**：确保 GitHub Actions 设置了 `VITE_BASE_URL=/player-grouping/`
- **手动构建**：使用环境变量测试构建

```bash
# 测试 Vercel 构建
VITE_BASE_URL=/ npm run build

# 测试 GitHub Pages 构建
VITE_BASE_URL=/player-grouping/ npm run build

# 检查生成的 HTML 资源路径
grep -o 'href="[^"]*"' dist/index.html
```

### 6. Vercel 部署 Supabase 401 Unauthorized 错误

**症状**：
- Vercel 部署后，应用返回 401 错误
- 浏览器控制台显示 Supabase 请求失败
- 网络请求 URL 显示 `api_key=undefined`

**原因**：
1. **环境变量未在 Vercel 中配置** - `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 未设置
2. **环境变量名称错误** - 缺少 `VITE_` 前缀
3. **Vercel 项目设置中的配置未生效** - 需要重新部署

**解决方案步骤**：

#### 步骤 1：检查 Vercel 环境变量

1. 登录 [vercel.com](https://vercel.com)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 确认以下变量已添加：

| 环境变量 | 值 | 必需 |
|-----------|-----|------|
| `VITE_SUPABASE_URL` | `https://saeplsevqechdnlkwjyz.supabase.co` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...`（你的 key） | ✅ |
| `VITE_BASE_URL` | `/` | ✅ |

#### 步骤 2：重新部署项目

添加环境变量后，Vercel 会自动触发重新部署，或手动触发：

1. 进入 **Deployments** 标签
2. 点击 **Redeploy** 按钮

#### 步骤 3：验证配置

部署完成后，打开浏览器控制台，应该看到：

✅ 成功的日志：
```
🔍 Supabase 配置状态：{ urlConfigured: true, keyConfigured: true, ... }
```

❌ 如果看到：
```
⚠️ Supabase 配置缺失...
```

则说明环境变量未正确配置。

#### 调试步骤

如果问题仍然存在：

1. **检查浏览器网络请求**：
   - 打开开发者工具 → Network 标签
   - 搜索 Supabase 相关请求
   - 检查请求头中是否包含 API key

2. **检查构建输出**：
   ```bash
   # 本地测试构建（模拟 Vercel）
   VITE_BASE_URL=/ VITE_SUPABASE_URL=your-url VITE_SUPABASE_ANON_KEY=your-key npm run build

   # 检查生成的 JS 文件是否包含配置
   grep -o "supabase" dist/assets/index.js
   ```

3. **检查 Supabase 权限**：
   - 确认 anon key 有正确的权限（读/写）
   - 检查 Supabase 项目 RLS 策略设置
   - 确认 API URL 正确

---

## 🔄 回滚

如果部署后发现问题，可以快速回滚：

### 方法 1: Git 回滚

```bash
# 1. 查看提交历史
git log --oneline

# 2. 回滚到上一个版本
git revert HEAD

# 3. 重新部署
npm run deploy
```

### 方法 2: 重新部署旧版本

```bash
# 1. 切换到旧分支
git checkout previous-version

# 2. 部署
npm run deploy

# 3. 切回主分支
git checkout main
```

---

## 📝 部署检查清单

### 部署前
- [ ] 代码已提交到 Git
- [ ] 所有测试通过
- [ ] 本地构建成功
- [ ] 本地预览正常

### 部署后
- [ ] 应用可以访问
- [ ] 没有控制台错误
- [ ] sql.js 加载成功
- [ ] 数据库功能正常
- [ ] 数据迁移正常（如果有旧数据）
- [ ] 所有功能可用

### 文档
- [ ] README.md 已更新
- [ ] DATABASE.md 已创建
- [ ] 部署指南已完成

---

## 🚢 版本发布

### 版本号规则

遵循语义化版本（Semantic Versioning）：
- MAJOR: 不兼容的 API 修改
- MINOR: 向下兼容的功能性新增
- PATCH: 向下兼容的问题修正

### 发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 更新 CHANGELOG
# 编辑 CHANGELOG.md

# 3. 提交
git add .
git commit -m "chore: release v1.0.1"

# 4. 打标签
git tag v1.0.1

# 5. 推送
git push origin main --tags

# 6. 部署
npm run deploy
```

---

## 📞 支持

如遇部署问题：
1. 检查本文档的常见问题部分
2. 查看浏览器控制台错误
3. 检查 GitHub Issues
4. 联系维护者

---

*文档创建时间: 2026-03-03*
*维护者: Javis*
