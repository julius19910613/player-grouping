# Phase 0 测试清单

## 1. 文件结构验证
- [ ] 检查 `src/lib/api/` 目录是否存在
- [ ] 检查 `api/chat.ts` 是否存在（Vercel Function）
- [ ] 检查 `vercel.json` 是否存在
- [ ] 检查 `.gitignore` 是否包含 `.env.local`

## 2. 环境变量验证
- [ ] 检查 `.env.local` 不包含 Gemini/Brave API Key（前端不使用）
- [ ] 检查代码中环境变量引用正确（服务端使用 `process.env`）
- [ ] 确认 `vercel.json` 中配置了环境变量引用

## 3. API 连接测试
- [ ] 创建 `scripts/test-api-connection.sh` 测试脚本
- [ ] 测试 Gemini API 连接（使用环境变量中的 Key）
- [ ] 测试 Brave Search API 连接（使用环境变量中的 Key）
- [ ] 记录 API 响应时间

## 4. 代码质量检查
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 检查 TypeScript 编译无错误

## 5. 安全检查
- [ ] 确认 `.env.local` 在 `.gitignore` 中
- [ ] 确认前端代码不包含任何 API Key
- [ ] 确认所有 API 调用通过 `/api/chat`（不直接调用 Gemini）
- [ ] 检查是否有敏感文件被提交到 Git

## 6. Vercel 配置验证
- [ ] 检查 `vercel.json` 配置正确
  - API Routes 配置
  - 环境变量引用
  - 超时设置
  - CORS 配置
- [ ] 创建 `api/health.ts` 健康检查端点（可选）

## 7. 项目结构验证
- [ ] 检查目录结构符合设计文档
- [ ] 检查依赖安装正确（`package.json`）
- [ ] 检查测试框架配置（Vitest/Playwright）

## 验收标准
- 所有 ✅ 项通过
- 无 🔴 严重问题
- API 连接测试成功
- 代码编译无错误
- 安全检查全部通过

## 测试报告格式
```json
{
  "phase": 0,
  "timestamp": "2026-03-07T22:45:00Z",
  "status": "pass",
  "summary": {
    "total_checks": 20,
    "passed": 20,
    "failed": 0,
    "warnings": 0
  },
  "details": [...],
  "issues": [],
  "recommendation": "通过 - 可以进入 Phase 1"
}
```
