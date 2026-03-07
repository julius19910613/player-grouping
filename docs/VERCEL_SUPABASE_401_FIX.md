# Vercel 部署 Supabase 401 错误修复指南

## 问题描述

在 Vercel 部署后，应用返回 401 Unauthorized 错误：
```
GET https://saeplsevqechdnlkwjyz.supabase.co/rest/v1/players?select=...&order=created_at.desc 401 (Unauthorized)
```

## 根本原因

**Vercel 构建时环境变量未正确注入到客户端代码。**

Vite 只会在构建时将以 `VITE_` 开头的环境变量注入到客户端代码中。如果这些变量：
1. 未在构建环境中设置
2. 设置为空值
3. 名称不正确

则会导致 `import.meta.env.VITE_*` 返回 `undefined`，进而导致 Supabase 请求使用 `api_key=undefined`。

## 快速修复步骤

### 步骤 1：登录 Vercel

访问 [vercel.com](https://vercel.com) 并登录。

### 步骤 2：进入项目设置

1. 选择你的 `player-grouping` 项目
2. 点击顶部的 **Settings** 标签
3. 点击左侧菜单的 **Environment Variables**

### 步骤 3：添加环境变量

添加以下三个环境变量：

| 环境变量 | 值 | 类型 |
|-----------|-----|------|
| `VITE_BASE_URL` | `/` | String |
| `VITE_SUPABASE_URL` | `https://saeplsevqechdnlkwjyz.supabase.co` | String |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | String |

**重要：**
- ⚠️ 变量名必须**完全匹配**（包括 `VITE_` 前缀）
- 🔑 Supabase ANON KEY 获取方式：
  1. [Supabase Dashboard](https://supabase.com/dashboard/project/saeplsevqechdnlkwjyz/settings/api)
  2. 找到 "anon public" 并复制
- ✅ 添加完成后，选择环境范围：Production, Preview, Development（或根据需求选择）

### 步骤 4：重新部署

添加环境变量后：

1. Vercel 会自动触发新的构建
2. 或手动进入 **Deployments** 标签点击 **Redeploy**

### 步骤 5：验证修复

部署完成后：

1. 打开你的 Vercel URL（如 `player-grouping.vercel.app`）
2. 打开浏览器开发者工具（F12）
3. 查看控制台日志

**成功标志**：
```
🔍 Supabase 配置状态：{ urlConfigured: true, keyConfigured: true, ... }
```

**失败标志**：
```
⚠️ Supabase 配置缺失...
```

## 验证环境变量是否正确注入

### 方法 1：浏览器控制台

在 Vercel 部署的页面控制台执行：
```javascript
// 检查环境变量
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('VITE_BASE_URL:', import.meta.env.VITE_BASE_URL);
```

如果输出为 `undefined`，说明环境变量未正确设置。

### 方法 2：检查网络请求

1. 打开开发者工具 → Network 标签
2. 过滤 Supabase 请求（搜索 `supabase.co`）
3. 点击请求查看详情
4. 检查 Request Headers 中的 `apikey` 字段

**正确**：
```
apikey: eyJhbGc...（你的完整密钥）
```

**错误**：
```
apikey: undefined
apikey: null
```

## 常见错误

### 错误 1：环境变量设置后仍然 401

**可能原因：**
- Vercel 环境变量添加到了错误的环境（如 Development 而不是 Production）
- 环境变量值中有空格或特殊字符
- 复制粘贴时丢失了部分密钥

**解决方案：**
1. 重新检查环境变量值
2. 确保**所有环境**（Production, Preview, Development）都已设置（如需要）
3. 完全删除并重新添加环境变量
4. 清除浏览器缓存后重试

### 错误 2：本地开发正常，Vercel 异常

**可能原因：**
- .env.local 中的配置与 Vercel 设置不一致
- 本地构建使用了缓存

**解决方案：**
```bash
# 清除构建缓存
rm -rf node_modules/.tmp

# 使用 Vercel 环境模拟本地构建
VITE_BASE_URL=/ \
VITE_SUPABASE_URL=https://saeplsevqechdnlkwjyz.supabase.co \
VITE_SUPABASE_ANON_KEY=your-key \
npm run build
```

### 错误 3：环境变量正确但仍失败

**可能原因：**
- Supabase anon key 权限不足
- Supabase RLS（行级安全）策略阻止了请求
- Supabase 服务暂时不可用

**解决方案：**

1. **检查 Supabase Dashboard**：
   - 验证 anon key 是否有效
   - 检查 API 设置是否允许匿名访问

2. **检查 RLS 策略**：
   - 在 Supabase SQL 编辑器中运行：
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'players';
   ```
   - 确保有允许匿名访问的策略

3. **临时降级到 SQLite**：
   - 移除 Supabase 环境变量
   - 重新部署
   - 应用将自动使用 SQLite 本地存储

## 参考文档

- [Vercel 环境变量](https://vercel.com/docs/projects/environment-variables)
- [Vite 环境变量](https://vite.dev/guide/env-and-mode)
- [项目部署文档](./DEPLOYMENT.md)
- [.env.example](../.env.example)
