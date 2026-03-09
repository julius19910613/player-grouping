# Basketball Agent 重构计划

> **目标**：将 player-grouping 首页对话框改造成一个功能完整的 Basketball Agent
>
> **创建时间**：2026-03-09 08:50
>
> **开发模式**：双 Subagent（开发 → 测试 → 下一阶段）

---

## 📋 需求概述

### 核心功能
1. **数据库查询 Agent**
   - 查询球员信息
   - 查询比赛信息
   - 球员对比（多维度对比）
   - 比赛表现分析

2. **多模态分析 Agent**
   - 上传文档（PDF、Word、Excel）
   - 上传视频（MP4、MOV）
   - 上传图片（JPG、PNG）
   - 分析球员表现
   - 更新后台数据

3. **移除联网搜索**
   - 移除 `search_web` 工具
   - 移除 Brave Search API

---

## 🏗️ 技术方案

### 架构设计

```
┌─────────────────────────────────────────────────┐
│                  前端 UI                         │
│  ┌─────────────┐  ┌─────────────┐               │
│  │ 文件上传组件 │  │ 聊天界面    │               │
│  │ (拖拽/选择) │  │ (消息流)    │               │
│  └─────────────┘  └─────────────┘               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              后端 API (Vercel)                   │
│  ┌─────────────┐  ┌─────────────┐               │
│  │ 文件处理    │  │ Gemini AI   │               │
│  │ (Vercel Blob)│  │ (多模态)    │               │
│  └─────────────┘  └─────────────┘               │
│  ┌─────────────┐  ┌─────────────┐               │
│  │ Supabase DB │  │ Tool 执行器 │               │
│  │ (数据存储)  │  │ (Function)  │               │
│  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────┘
```

### 工具定义

#### 1. 查询工具（新增）

```typescript
// 球员对比
{
  name: "compare_players",
  description: "对比两名或多名球员的数据，包括技能、位置、比赛表现等",
  parameters: {
    players: ["球员1", "球员2"],
    dimensions: ["技能", "位置", "overall"] // 可选
  }
}

// 比赛历史查询
{
  name: "get_match_history",
  description: "查询比赛历史记录，支持按日期、球员、对手筛选",
  parameters: {
    player_name?: "球员姓名",
    date_range?: { start: "2026-01-01", end: "2026-03-09" },
    limit?: 10
  }
}

// 比赛表现分析
{
  name: "analyze_match_performance",
  description: "分析球员在某场比赛的表现，生成详细报告",
  parameters: {
    match_id: "比赛ID",
    player_name: "球员姓名"
  }
}
```

#### 2. 多模态工具（新增）

```typescript
// 上传并分析
{
  name: "upload_and_analyze",
  description: "上传文件（文档/视频/图片），分析球员表现",
  parameters: {
    file_type: "document | video | image",
    analysis_type: "performance | stats | summary"
  }
}

// 更新球员数据
{
  name: "update_player_data",
  description: "根据分析结果更新球员数据到数据库",
  parameters: {
    player_name: "球员姓名",
    updates: {
      skills: { ... },
      notes: "备注"
    }
  }
}
```

#### 3. 移除的工具

```typescript
// ❌ 移除联网搜索
{
  name: "search_web", // 删除
  // ...
}
```

---

## 📅 开发计划（双 Subagent 方案）

### Phase 0：准备工作（30分钟）

**开发内容**：
- [ ] 移除 `search_web` 工具定义
- [ ] 移除 `search_web` 执行器
- [ ] 移除 `BraveSearchClient`
- [ ] 移除 `BRAVE_SEARCH_API_KEY` 环境变量
- [ ] 更新工具优先级注释

**验收标准**：
- ✅ 代码无 `search_web` 引用
- ✅ TypeScript 编译通过
- ✅ Vite 构建成功
- ✅ 现有测试通过（77.8%+）

**开发 Agent**：Claude Code
**测试 Agent**：Claude Code
**预计时间**：30 分钟

---

### Phase 1：新增查询工具（2小时）

**开发内容**：
- [ ] 实现 `compare_players` 工具
  - 查询多个球员数据
  - 多维度对比（技能、位置、overall）
  - 生成对比报告

- [ ] 实现 `get_match_history` 工具
  - Supabase 查询 `grouping_history` 表
  - 支持筛选（球员、日期）
  - 格式化输出

- [ ] 实现 `analyze_match_performance` 工具
  - 查询比赛数据
  - AI 分析表现
  - 生成详细报告

- [ ] 更新 `api/chat.ts`
  - 添加新工具定义
  - 添加新工具执行器

- [ ] 更新前端工具列表

**验收标准**：
- ✅ 可以对比两名球员
- ✅ 可以查询比赛历史
- ✅ 可以分析比赛表现
- ✅ TypeScript 无错误
- ✅ Vite 构建成功
- ✅ 单元测试覆盖率 > 60%

**开发 Agent**：Claude Code
**测试 Agent**：Claude Code
**预计时间**：2 小时

---

### Phase 2：前端文件上传 UI（1.5小时）

**开发内容**：
- [ ] 创建 `FileUpload` 组件
  - 拖拽上传
  - 点击选择
  - 文件类型限制（PDF, DOC, MP4, JPG, PNG）
  - 文件大小限制（视频 < 100MB，图片 < 10MB）

- [ ] 创建 `UploadPreview` 组件
  - 图片预览
  - 视频预览（缩略图）
  - 文档图标 + 文件名

- [ ] 更新 `ChatInput` 组件
  - 添加上传按钮（📎）
  - 显示上传进度
  - 上传完成自动发送

- [ ] 更新 `ChatView` 组件
  - 显示上传文件消息
  - 显示分析结果

**验收标准**：
- ✅ 支持拖拽上传
- ✅ 支持点击选择
- ✅ 文件类型限制正常
- ✅ 文件大小限制正常
- ✅ 上传进度显示正常
- ✅ 预览正常显示
- ✅ TypeScript 无错误
- ✅ Vite 构建成功

**开发 Agent**：Claude Code
**测试 Agent**：Claude Code
**预计时间**：1.5 小时

---

### Phase 3：后端文件处理 + AI 分析（2.5小时）

**开发内容**：
- [ ] 配置 Vercel Blob Storage
  - 创建 Blob Store
  - 配置环境变量
  - 测试上传/下载

- [ ] 创建 `/api/upload` 端点
  - 接收文件上传
  - 存储到 Vercel Blob
  - 返回文件 URL

- [ ] 实现 `upload_and_analyze` 工具
  - 下载文件（从 Vercel Blob）
  - 调用 Gemini 多模态 API
    - 图片：直接传给 Gemini Vision
    - 视频：提取关键帧或使用 Gemini Video API
    - 文档：提取文本或使用 Gemini Document API
  - 分析球员表现
  - 生成结构化数据

- [ ] 实现 `update_player_data` 工具
  - 连接 Supabase
  - 更新球员技能数据
  - 添加分析备注

- [ ] 更新 `api/chat.ts`
  - 集成新工具
  - 处理文件 URL

**验收标准**：
- ✅ 文件上传到 Vercel Blob 成功
- ✅ 图片分析正常（Gemini Vision）
- ✅ 视频分析正常（提取关键帧）
- ✅ 文档分析正常（提取文本）
- ✅ 分析结果正确存入 Supabase
- ✅ TypeScript 无错误
- ✅ Vite 构建成功
- ✅ 端到端测试通过

**开发 Agent**：Claude Code
**测试 Agent**：Claude Code
**预计时间**：2.5 小时

---

### Phase 4：集成测试（1小时）

**开发内容**：
- [ ] 测试查询工具
  - 球员对比
  - 比赛历史查询
  - 比赛表现分析

- [ ] 测试多模态工具
  - 上传图片并分析
  - 上传视频并分析
  - 上传文档并分析

- [ ] 测试数据更新
  - 更新球员数据
  - 验证 Supabase 数据正确

- [ ] 回归测试
  - 现有功能正常
  - 无破坏性变更

**验收标准**：
- ✅ 所有查询工具正常
- ✅ 所有分析工具正常
- ✅ 数据更新正常
- ✅ 无回归 Bug
- ✅ 测试覆盖率 > 70%

**开发 Agent**：Claude Code
**测试 Agent**：Claude Code
**预计时间**：1 小时

---

### Phase 5：部署和监控（30分钟）

**开发内容**：
- [ ] 提交代码到 Git
- [ ] 配置 Vercel 环境变量
  - `BLOB_READ_WRITE_TOKEN`（Vercel Blob）
  - 其他环境变量验证

- [ ] 触发 Vercel 自动部署
- [ ] 生产环境测试
  - 查询工具测试
  - 多模态工具测试

- [ ] 更新文档
  - 用户使用指南
  - 开发者文档

**验收标准**：
- ✅ 生产环境可用
- ✅ 所有功能正常
- ✅ 文档已更新

**开发 Agent**：Claude Code
**测试 Agent**：Claude Code
**预计时间**：30 分钟

---

## 📊 时间估算

| Phase | 任务 | 预计时间 | 累计 |
|-------|------|---------|------|
| 0 | 准备工作（移除联网搜索） | 30分钟 | 0.5h |
| 1 | 新增查询工具 | 2小时 | 2.5h |
| 2 | 前端文件上传 UI | 1.5小时 | 4h |
| 3 | 后端文件处理 + AI 分析 | 2.5小时 | 6.5h |
| 4 | 集成测试 | 1小时 | 7.5h |
| 5 | 部署和监控 | 30分钟 | 8h |

**总计**：约 8 小时（1个工作日）

---

## 🔧 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- react-dropzone（文件上传）

### 后端
- Vercel Serverless Functions
- Vercel Blob Storage（文件存储）
- Supabase（数据库）
- Gemini 2.5 Flash（AI + 多模态）

### 工具
- Claude Code（开发 Agent）
- OpenClaw Cron（监控）
- Vitest（测试）

---

## ⚠️ 风险和注意事项

### 1. Gemini 多模态 API 限制
- **视频大小限制**：Gemini 直接处理视频可能有限制
- **解决方案**：提取关键帧（使用 ffmpeg 或 Cloudflare Images）

### 2. Vercel Blob 存储成本
- **免费额度**：Hobby 计划有限制
- **解决方案**：监控使用量，必要时清理旧文件

### 3. 文件上传体验
- **大文件上传慢**：可能影响用户体验
- **解决方案**：
  - 显示上传进度
  - 压缩视频（前端或后端）
  - 使用 CDN 加速

### 4. 数据隐私
- **敏感数据**：上传的文件可能包含敏感信息
- **解决方案**：
  - 文件加密存储
  - 定期清理
  - 用户授权机制

---

## 📝 开发流程（双 Subagent）

### 标准 SOP

```
1. 准备阶段
   └─ 确认需求、技术方案

2. 开发 Agent（30-60分钟）
   └─ 代码实现
   └─ 提交代码

3. 测试 Agent（15-30分钟）
   └─ 运行测试
   └─ 验收标准检查
   └─ 生成测试报告

4. 验证阶段
   └─ 检查代码质量
   └─ 检查测试报告
   └─ 决定是否通过

5. 下一阶段
   └─ 通过 → 启动下一 Phase 开发
   └─ 失败 → 重试（最多 3 次）
```

### 状态文件

**位置**：`/Users/ppt/Projects/player-grouping/docs/agent-dev-state.json`

```json
{
  "project": "basketball-agent",
  "currentPhase": 0,
  "phases": {
    "phase0": {
      "status": "pending",
      "devAgent": null,
      "testAgent": null,
      "startTime": null,
      "endTime": null
    },
    // ...
  },
  "heartbeat": "2026-03-09T08:50:00Z",
  "cronJobId": null
}
```

### 监控机制

- **Cron Job**：每 5 分钟检查状态文件
- **心跳检测**：如果 `heartbeat` > 30 分钟 → 飞书告警
- **自动流转**：测试通过 → 自动启动下一 Phase
- **飞书通知**：每个 Phase 完成 → 通知用户

---

## 🎯 验收标准（最终）

- [ ] 可以查询球员信息（原有功能）
- [ ] 可以查询比赛历史（新功能）
- [ ] 可以对比多名球员（新功能）
- [ ] 可以分析比赛表现（新功能）
- [ ] 可以上传图片并分析（新功能）
- [ ] 可以上传视频并分析（新功能）
- [ ] 可以上传文档并分析（新功能）
- [ ] 可以根据分析更新数据（新功能）
- [ ] 不再联网搜索（移除功能）
- [ ] 生产环境可用
- [ ] 测试覆盖率 > 70%

---

## 📚 参考资料

- [Gemini 多模态 API 文档](https://ai.google.dev/tutorials/multimodal)
- [Vercel Blob Storage 文档](https://vercel.com/docs/storage/vercel-blob)
- [Supabase 文档](https://supabase.com/docs)
- [OpenClaw 双 Subagent SOP](MEMORY.md#双-subagent-协作-sop)

---

**创建者**：Javis
**创建时间**：2026-03-09 08:50
**状态**：待启动
