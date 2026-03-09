# 双 Subagent 开发流程 - 快速启动指南

> **用途**: 快速上手使用双 Subagent 开发流程
> **创建时间**: 2026-03-09

---

## 📋 目录

1. [前置要求](#前置要求)
2. [快速启动](#快速启动)
3. [工作流程](#工作流程)
4. [常见问题](#常见问题)

---

## 前置要求

### 1. 项目准备

```bash
# 确保项目结构完整
cd /Users/ppt/Projects/player-grouping

# 确认必要文件存在
ls -la package.json
ls -la docs/dual-subagent-dev-plan.md
ls -la tests/e2e/test-template.md
ls -la agent-dev-state.json

# 安装依赖
npm install
```

### 2. 开发服务器验证

```bash
# 启动开发服务器
npm run dev &

# 等待启动
sleep 5

# 验证服务器
curl http://localhost:5173/api/health
# 预期: {"status":"ok"}

# 停止服务器（等会由开发 Agent 启动）
kill %1
```

### 3. 状态文件初始化

```bash
# 确认状态文件存在
cat agent-dev-state.json

# 初始化为 Phase 1
# （由主会话自动完成）
```

---

## 快速启动

### 方式 1: 主会话启动（推荐）

在主会话中执行：

```
启动 Phase 1 开发
```

主会话会自动：
1. 启动开发 Agent（60 分钟超时）
2. 监控 Agent 状态
3. 开发完成后启动测试 Agent
4. 测试完成后验证结果

### 方式 2: 手动启动开发 Agent

```typescript
// 在主会话中执行
await sessions_spawn({
  label: "project-dev-phase1",
  mode: "run",
  runTimeoutSeconds: 3600,
  request: {
    task: `
      开发 Phase 1 功能
      参考: docs/dual-subagent-dev-plan.md
      状态文件: agent-dev-state.json
    `
  }
})
```

### 方式 3: 手动启动测试 Agent

```typescript
// 在主会话中执行
await sessions_spawn({
  label: "project-test-phase1",
  mode: "run",
  runTimeoutSeconds: 1800,
  request: {
    task: `
      测试 Phase 1 功能
      参考: docs/dual-subagent-dev-plan.md
      状态文件: agent-dev-state.json
    `
  }
})
```

---

## 工作流程

### Phase N 完整流程

```
┌─────────────────────────────────────────────────────────┐
│  主会话                                                 │
│  - 启动开发 Agent                                       │
│  - 监控状态                                             │
│  - 启动测试 Agent                                       │
│  - 验证结果                                             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  开发 Agent (60 分钟)                                   │
│                                                          │
│  1. 读取规划文档                                         │
│  2. 开发代码 (Claude Code)                              │
│  3. 运行单元测试                                         │
│  4. 启动服务器 (npm run dev)                            │
│  5. 验证 API (curl)                                     │
│  6. 更新状态文件 ✅                                      │
│                                                          │
│  输出: agent-dev-state.json (status: dev_completed)    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  测试 Agent (30 分钟)                                   │
│                                                          │
│  1. 读取状态文件                                         │
│  2. 验证服务器运行                                       │
│  3. 执行 E2E 测试 (browser 工具)                        │
│     - 场景 1: 查询球员                                  │
│     - 场景 2: 球员对比                                  │
│     - 场景 3: 上传图片                                  │
│     - 场景 4: 上传视频                                  │
│     - 场景 5: 更新数据                                  │
│  4. 生成测试报告                                         │
│  5. 更新状态文件 ✅                                      │
│                                                          │
│  输出:                                                   │
│  - agent-dev-state.json (status: test_completed)       │
│  - tests/e2e/reports/phase-N-summary.md                │
│  - tests/e2e/screenshots/*.png                         │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  主会话验证                                              │
│                                                          │
│  1. 读取测试报告                                         │
│  2. 检查通过率                                           │
│  3. 决策:                                                │
│     - 100% 通过 → 启动下一 Phase                        │
│     - 有失败 → 通知开发 Agent 修复                      │
│     - 严重错误 → 回滚 + 重试                            │
└─────────────────────────────────────────────────────────┘
```

---

## 常见问题

### Q1: 如何检查 Agent 状态？

```bash
# 方式 1: 查看状态文件
cat agent-dev-state.json | jq '.devAgent.status'

# 方式 2: 查看日志
tail -f logs/agent-dev.log
tail -f logs/agent-test.log

# 方式 3: 主会话查询
# 在主会话中询问: "当前 Phase 1 的状态是什么？"
```

### Q2: 开发 Agent 超时怎么办？

**原因**: 
- 任务复杂，60 分钟不够
- Agent 卡住了

**解决**:
```bash
# 1. 检查状态文件
cat agent-dev-state.json | jq '.devAgent'

# 2. 如果确实超时，主会话可以重启
# 在主会话中: "重启 Phase 1 开发 Agent"

# 3. 或者延长超时时间
# 在主会话中: "启动 Phase 1 开发，超时 90 分钟"
```

### Q3: 测试 Agent 发现 Bug 怎么办？

**流程**:
```
测试 Agent 发现 Bug
       ↓
生成测试报告
       ↓
通知主会话
       ↓
主会话决策:
  ├─ 轻微 Bug → 记录，下一 Phase 修复
  └─ 严重 Bug → 通知开发 Agent 立即修复
```

**示例**:
```markdown
主会话收到通知:

🔴 **Phase 1 测试失败**

**失败场景**: 场景 3 - 上传图片分析
**错误**: API 返回 500
**通过率**: 40% (2/5)

**建议**: 优先修复图片上传模块

**操作**:
- 回复 "修复" → 启动开发 Agent 修复
- 回复 "跳过" → 继续下一 Phase
- 回复 "查看详情" → 查看测试报告
```

### Q4: 如何跳过某个测试场景？

```json
// 在 agent-dev-state.json 中添加
{
  "testAgent": {
    "skipScenarios": [4, 5],  // 跳过场景 4、5
    "skipReason": "依赖场景 3 通过"
  }
}
```

### Q5: 如何查看测试报告？

```bash
# 查看总报告
cat tests/e2e/reports/phase-1-summary.md

# 查看特定场景报告
cat tests/e2e/reports/phase-1-scene-1-report.md

# 查看截图
open tests/e2e/screenshots/phase-1-scene1-*.png
```

### Q6: 如何手动触发 E2E 测试？

```bash
# 1. 确保服务器运行
npm run dev &
sleep 5

# 2. 运行测试
npx ts-node tests/e2e/run-all.ts

# 3. 查看报告
cat tests/e2e/reports/phase-1-summary.md
```

### Q7: 如何重置到某个 Phase？

```bash
# 1. 编辑状态文件
vi agent-dev-state.json

# 2. 修改 currentPhase
{
  "currentPhase": 1,  // 重置到 Phase 1
  "phases": {
    "phase1": {
      "status": "not_started"  // 重置状态
    }
  }
}

# 3. 重新启动
# 在主会话中: "重启 Phase 1"
```

### Q8: Cron 监控如何工作？

**配置**:
```json
{
  "monitoring": {
    "cron": {
      "enabled": true,
      "interval": "2m"  // 每 2 分钟检查一次
    }
  }
}
```

**检查逻辑**:
```typescript
// 每 2 分钟执行
1. 读取 agent-dev-state.json
2. 检查当前 Phase 状态
3. 如果状态是 "running" 且超过 30 分钟未更新:
   - 发送飞书告警
   - 记录错误日志
4. 如果状态是 "completed" 且未启动下一 Phase:
   - 通知主会话
```

### Q9: 飞书通知如何配置？

**配置文件** (agent-dev-state.json):
```json
{
  "notifications": {
    "feishu": {
      "enabled": true,
      "target": "ou_78a4033e2e70343e3c945ab93877ac18",
      "events": [
        "dev_complete",      // 开发完成
        "test_complete",     // 测试完成
        "error",             // 发生错误
        "review_required"    // 需要审核
      ]
    }
  }
}
```

**通知示例**:
```
✅ Phase 1 开发完成

**耗时**: 45 分钟
**文件**: 12 个
**测试**: 全部通过
**覆盖率**: 85%

准备启动测试 Agent...

---

🔴 Phase 1 测试失败

**通过率**: 40% (2/5)
**失败场景**: 场景 3 - 上传图片
**错误**: API 返回 500

需要开发 Agent 修复后重试。

[查看详细报告](链接)
```

### Q10: 如何确保不出现 500 错误？

**开发阶段**:
```bash
# 1. 单元测试覆盖所有 API
npm test

# 2. 本地验证所有端点
curl -X GET http://localhost:5173/api/health
curl -X POST http://localhost:5173/api/chat -d '{"message":"test"}'
curl -X POST http://localhost:5173/api/upload/image -F "file=@test.png"

# 3. 检查日志
tail -f logs/server.log | grep "500"
```

**测试阶段**:
```typescript
// 测试 Agent 会验证所有 API
for (const endpoint of allEndpoints) {
  const response = await fetch(endpoint)
  if (response.status === 500) {
    // 立即记录错误并通知
    logError(endpoint, 500)
    await notifyDevelAgent(error)
  }
}
```

**验收标准**:
- ✅ 所有 API 返回 200 或预期的 4xx
- ❌ 任何 5xx 错误都会阻止部署

---

## 最佳实践

### 1. 开发 Agent 最佳实践

- ✅ 先写测试，再写代码（TDD）
- ✅ 每个功能都有单元测试
- ✅ 启动服务器后立即验证 API
- ✅ 更新状态文件记录进度
- ❌ 不要跳过单元测试
- ❌ 不要假设服务器一定启动成功

### 2. 测试 Agent 最佳实践

- ✅ 每个场景都有独立的测试函数
- ✅ 失败时截图记录
- ✅ 详细记录错误信息
- ✅ 生成人类可读的测试报告
- ❌ 不要假设上一个场景一定通过
- ❌ 不要忽略任何错误

### 3. 主会话最佳实践

- ✅ 定期检查 Agent 状态
- ✅ 收到通知后及时响应
- ✅ 测试失败时优先修复严重 Bug
- ❌ 不要在 Agent 运行时频繁查询状态
- ❌ 不要忽略测试失败通知

---

## 快速参考

### 常用命令

```bash
# 查看当前状态
cat agent-dev-state.json | jq '.'

# 查看开发 Agent 状态
cat agent-dev-state.json | jq '.devAgent'

# 查看测试结果
cat agent-dev-state.json | jq '.testAgent.results'

# 查看错误日志
cat agent-dev-state.json | jq '.errorLog'

# 查看测试报告
cat tests/e2e/reports/phase-$(cat agent-dev-state.json | jq '.currentPhase')-summary.md

# 启动开发服务器
npm run dev &

# 验证服务器
curl http://localhost:5173/api/health

# 运行单元测试
npm test

# 运行 E2E 测试
npx ts-node tests/e2e/run-all.ts
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `agent-dev-state.json` | Agent 状态文件 |
| `docs/dual-subagent-dev-plan.md` | 设计文档 |
| `tests/e2e/test-template.md` | E2E 测试模板 |
| `tests/e2e/run-all.ts` | E2E 测试运行器 |
| `tests/e2e/reports/` | 测试报告目录 |
| `tests/e2e/screenshots/` | 测试截图目录 |

### 状态说明

| 状态 | 说明 |
|------|------|
| `not_started` | 未开始 |
| `running` | 运行中 |
| `development_completed` | 开发完成，等待测试 |
| `testing_completed` | 测试完成，等待审核 |
| `completed` | 全部完成 |
| `failed` | 失败 |

---

## 下一步

1. **阅读设计文档**: `docs/dual-subagent-dev-plan.md`
2. **了解测试模板**: `tests/e2e/test-template.md`
3. **在主会话中启动**: "启动 Phase 1 开发"
4. **查看测试报告**: `tests/e2e/reports/`
5. **根据反馈迭代改进**

---

**维护**: 随着项目进展，持续更新此指南。
