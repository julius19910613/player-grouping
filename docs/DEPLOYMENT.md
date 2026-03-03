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

### 方法 1: 自动部署到 GitHub Pages

```bash
# 1. 构建并部署
npm run deploy

# 2. 等待 1-2 分钟
# 3. 访问 https://julius19910613.github.io/player-grouping
```

### 方法 2: 手动部署

```bash
# 1. 构建
npm run build

# 2. 部署到 GitHub Pages
npx gh-pages -d dist

# 或者使用其他托管服务
# dist/ 目录包含了所有需要部署的文件
```

---

## ✅ 部署后验证

### 1. 访问应用
- URL: https://julius19910613.github.io/player-grouping

### 2. 检查功能
- [ ] 应用可以正常加载
- [ ] sql.js WASM 文件加载成功
- [ ] 可以添加球员
- [ ] 可以编辑球员
- [ ] 可以删除球员
- [ ] 数据持久化（刷新后数据保留）
- [ ] 旧数据自动迁移（如果有）

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
2. 检查 `vite.config.ts` 的 `base` 配置
3. 确认所有资源路径正确

**解决方案**:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/player-grouping/', // 确认这个路径正确
})
```

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
