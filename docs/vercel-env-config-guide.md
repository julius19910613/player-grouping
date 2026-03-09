# Vercel 环境变量配置指南

## 问题诊断

✅ **本地环境变量已配置**（`.env.local` 文件已存在）
✅ **语法错误已修复**（`api/chat.ts` 第 628 行）
❌ **生产环境缺少 API 密钥**（导致 500 错误）

## 解决方案

### 方案 1：Vercel Dashboard 配置（推荐）

1. **访问 Vercel 项目设置**
   ```
   https://vercel.com/julius19910613/player-grouping/settings/environment-variables
   ```

2. **添加以下环境变量**（全部选择 Production、Preview、Development）

   | 变量名 | 值 |
   |--------|-----|
   | `VITE_SUPABASE_URL` | `https://saeplsevqechdnlkwjyz.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_5w85rd1KeY453zx3oEKsng_-3OO0j-P` |
   | `VITE_ARK_API_KEY` | `2d04695b-2e03-43cf-8a25-ad07bad6b374` |
   | `VITE_ARK_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` |
   | `VITE_ARK_MODEL` | `doubao-seed-1-8-251228` |
   | `VITE_GEMINI_API_KEY` | `AIzaSyBnKN5g0lOu6aHTzvWtva98YZWRBA0r7Rc` |
   | `GEMINI_API_KEY` | `AIzaSyBnKN5g0lOu6aHTzvWtva98YZWRBA0r7Rc` |
   | `BRAVE_SEARCH_API_KEY` | `BSAgI6damlK2NsyclSMLQmQp_1PU6nQ` |

3. **重新部署**
   - 点击 "Deployments" 标签
   - 点击最新部署旁边的 "..." 按钮
   - 选择 "Redeploy"

### 方案 2：Vercel CLI 配置

如果网络恢复，可以使用 CLI 快速配置：

```bash
# 登录 Vercel
vercel login

# 链接项目
vercel link

# 添加环境变量
vercel env add VITE_SUPABASE_URL production
# 粘贴值：https://saeplsevqechdnlkwjyz.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# 粘贴值：sb_publishable_5w85rd1KeY453zx3oEKsng_-3OO0j-P

# ... 添加其他变量

# 重新部署
vercel --prod
```

### 方案 3：本地测试（临时）

如果网络问题持续，可以暂时修改前端代码进行本地测试：

1. **修改 `src/services/chat-service.ts`**
   ```typescript
   // 第 129-130 行，改为始终使用生产环境 API
   const backendEndpoint = 'https://player-grouping.vercel.app/api/chat';
   ```

2. **启动本地开发服务器**
   ```bash
   npm run dev
   ```

3. **访问 http://localhost:5174**

**注意**：这种方式仅用于测试 UI，API 调用仍然会失败（因为生产环境缺少密钥）。

## 网络问题排查

如果遇到 SSL 连接错误：

```bash
# 测试 GitHub 连接
ssh -T git@github.com

# 测试 Vercel 连接
curl -I https://vercel.com

# 如果都失败，可能是：
# 1. 防火墙/代理配置
# 2. DNS 解析问题
# 3. VPN/网络限制
```

## 下一步

1. **配置 Vercel 环境变量**（方案 1 最简单）
2. **推送代码**（等待网络恢复）
   ```bash
   git push origin main
   ```
3. **验证部署**
   - 访问 https://player-grouping.vercel.app/
   - 输入"骚当最近表现怎么样？"
   - 应该看到正常的 AI 回复（而不是 500 错误）

## 联系我

完成配置后，告诉我，我会帮你验证是否成功！
