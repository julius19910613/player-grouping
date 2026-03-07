# 双 Subagent 不间断开发方案

## 📋 方案概述

**目标**：使用开发 Agent + 测试 Agent 不间断完成 Phase 0-6，你只需在最后验收

**核心挑战**：
1. ❌ 之前测试 Agent 质量不好
2. ❌ 流程容易中断
3. ❌ 测试覆盖不全面

**解决方案**：
1. ✅ 详细测试清单 + 验证标准
2. ✅ 自动流转 + 失败重试机制
3. ✅ 测试覆盖率要求 + 多层验证

---

## 🔄 执行流程

### 自动化流程图

```
启动开发 Agent Phase 0
    ↓
开发完成
    ↓
启动测试 Agent Phase 0
    ↓
测试通过？ ──── 否 ──→ 重新开发 Phase 0（最多3次）
    │                        ↓
    是                   仍然失败？ ──→ 飞书告警 + 等待人工介入
    ↓
启动开发 Agent Phase 1
    ↓
...（重复 Phase 0-6）...
    ↓
所有阶段完成
    ↓
飞书通知你 + 发送完整报告
```

### 详细流程

**Phase N 执行步骤**：

1. **开发 Agent 启动**（使用 Claude Code）
   ```typescript
   sessions_spawn({
     mode: "run",
     label: `chatbot-dev-phase${N}`,
     timeout: 3600 * 预估天数,
     task: `
       # Phase ${N} 开发任务
       
       ## 目标
       [明确的目标]
       
       ## 详细任务清单
       [每个任务都要可验证]
       
       ## 验收标准
       [具体的验收标准]
       
       ## 文件清单
       [需要创建/修改的文件]
       
       参考文档：docs/implementation-plan.md Phase ${N}
     `
   })
   ```

2. **开发完成 → 启动测试 Agent**
   ```typescript
   sessions_spawn({
     mode: "run",
     label: `chatbot-test-phase${N}`,
     timeout: 1800,
     task: `
       # Phase ${N} 测试任务
       
       ## 测试清单（必须全部执行）
       [详细的测试清单]
       
       ## 验证标准
       [每个测试的通过标准]
       
       ## 输出要求
       1. 测试报告（JSON格式）
       2. 测试覆盖率
       3. 发现的问题清单
       4. 是否通过（true/false）
       
       参考文档：docs/implementation-plan.md Phase ${N} 测试部分
     `
   })
   ```

3. **测试结果判断**
   - ✅ **通过**：启动下一阶段开发
   - ❌ **不通过**：重新启动开发 Agent（修复问题）
   - ❌ **3次仍失败**：飞书告警，等待人工介入

---

## 🎯 提升测试 Agent 质量的方法

### 问题诊断：为什么之前测试质量不好？

1. ❌ **测试任务太笼统**
   - 例如："测试 Phase 0"
   - 问题：没有具体测试什么

2. ❌ **缺少验证标准**
   - 例如："检查文件是否创建"
   - 问题：没有说明如何检查

3. ❌ **没有测试用例**
   - 测试 Agent 不知道要测试哪些场景

4. ❌ **输出不清晰**
   - 测试报告没有明确结论

---

### 解决方案 1：详细测试清单 ⭐

**为每个 Phase 准备详细的测试清单**

**示例：Phase 0 测试清单**

```markdown
# Phase 0 测试清单

## 1. 文件结构验证
- [ ] 检查 `src/lib/api/` 目录是否存在
- [ ] 检查 `api/chat.ts` 是否存在
- [ ] 检查 `vercel.json` 是否存在
- [ ] 检查 `.gitignore` 是否包含 `.env.local`

## 2. 环境变量验证
- [ ] 检查 `.env.local` 是否存在（本地）
- [ ] 检查环境变量是否正确引用（代码中）
- [ ] 确认前端代码不包含 API Key

## 3. API 连接测试
- [ ] 运行 `npm run dev`
- [ ] 访问 `/api/health`（如果存在）
- [ ] 测试 Gemini API 连接（使用测试脚本）
- [ ] 测试 Brave Search API 连接（使用测试脚本）

## 4. 代码质量检查
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 运行 `npm run test`（如果有测试）

## 5. 安全检查
- [ ] 确认 API Key 不在 Git 中
- [ ] 确认 `.env.local` 在 `.gitignore` 中
- [ ] 确认前端不直接调用 Gemini API

## 验收标准
- 所有 ✅ 项通过
- 无 🔴 严重问题
- 测试覆盖率 > 80%（如果有测试）
```

---

### 解决方案 2：测试报告格式 ⭐

**要求测试 Agent 输出标准化报告**

```json
{
  "phase": 0,
  "timestamp": "2026-03-07T22:30:00Z",
  "status": "pass",
  "summary": {
    "total_checks": 15,
    "passed": 14,
    "failed": 1,
    "warnings": 2
  },
  "details": [
    {
      "category": "文件结构",
      "checks": [
        {
          "name": "src/lib/api/ 目录",
          "status": "pass",
          "message": "目录存在"
        },
        {
          "name": "api/chat.ts 文件",
          "status": "pass",
          "message": "文件存在，代码行数: 120"
        }
      ]
    },
    {
      "category": "API 连接",
      "checks": [
        {
          "name": "Gemini API 连接",
          "status": "pass",
          "message": "响应时间: 230ms"
        },
        {
          "name": "Brave Search API 连接",
          "status": "fail",
          "message": "API Key 无效"
        }
      ]
    }
  ],
  "coverage": {
    "lines": 85,
    "functions": 90,
    "branches": 80,
    "statements": 85
  },
  "issues": [
    {
      "severity": "high",
      "category": "API 连接",
      "description": "Brave Search API Key 无效",
      "file": "api/chat.ts",
      "line": 45
    }
  ],
  "recommendation": "不通过 - 需要修复 Brave Search API Key"
}
```

---

### 解决方案 3：失败重试机制 ⭐

**自动重试，但限制次数**

```typescript
// 状态跟踪文件：docs/dev-test-state.json
{
  "currentPhase": 0,
  "retryCount": {
    "phase0": 0,
    "phase1": 0
  },
  "maxRetries": 3,
  "status": "running"
}
```

**重试逻辑**：
1. 测试失败 → 读取 `retryCount`
2. 如果 `retryCount < 3`：
   - 增加 `retryCount`
   - 重新启动开发 Agent（携带失败原因）
3. 如果 `retryCount >= 3`：
   - 标记 `status: "failed"`
   - 飞书告警
   - 等待人工介入

---

### 解决方案 4：多层验证 ⭐

**测试 Agent 需要执行多层验证**

```
Layer 1: 静态检查
- 文件是否存在
- 代码是否编译
- Lint 是否通过

Layer 2: 单元测试
- 运行测试用例
- 检查测试覆盖率

Layer 3: 集成测试
- API 是否可访问
- 数据流是否正确

Layer 4: 功能测试
- 运行应用
- 执行关键路径
```

---

### 解决方案 5：具体的测试用例 ⭐

**为测试 Agent 提供具体的测试代码**

**示例：Phase 2 测试用例**

```typescript
// tests/phase2/api-chat.test.ts

describe('Phase 2: API Chat', () => {
  
  test('POST /api/chat 应该返回 Gemini 响应', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);
  });
  
  test('应该正确处理超时', async () => {
    // 发送一个会触发超时的请求
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: '长文本生成...' }]
      })
    });
    
    // 应该返回降级响应，而不是错误
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.fallback).toBe(true);
  });
  
  test('API Key 不应该暴露', async () => {
    const response = await fetch('/api/chat');
    const text = await response.text();
    
    expect(text).not.toContain('AIzaSy');
    expect(text).not.toContain('GEMINI_API_KEY');
  });
});
```

---

## 🚀 完整执行计划

### 阶段时间表

| Phase | 开发时间 | 测试时间 | 重试缓冲 | 总计 |
|-------|---------|---------|---------|------|
| Phase 0 | 1 天 | 0.5 天 | 0.5 天 | 2 天 |
| Phase 1 | 2-3 天 | 1 天 | 0.5 天 | 3.5-4.5 天 |
| Phase 2 | 2-3 天 | 1 天 | 0.5 天 | 3.5-4.5 天 |
| Phase 3 | 3-4 天 | 1.5 天 | 0.5 天 | 5-6 天 |
| Phase 4 | 2-3 天 | 1 天 | 0.5 天 | 3.5-4.5 天 |
| Phase 5 | 2-3 天 | 1 天 | 0.5 天 | 3.5-4.5 天 |
| Phase 6 | 1-2 天 | 0.5 天 | 0.5 天 | 2-3 天 |
| **总计** | **13-18 天** | **6.5 天** | **3.5 天** | **23-28 天** |

---

## 📋 启动前的准备工作

### 1. 创建测试清单文件

为每个 Phase 创建详细的测试清单：
- `docs/test-checklist-phase0.md`
- `docs/test-checklist-phase1.md`
- ... （共 7 个文件）

### 2. 创建状态跟踪文件

`docs/dev-test-state.json`:
```json
{
  "version": "1.0",
  "startTime": "2026-03-07T22:30:00Z",
  "currentPhase": 0,
  "phases": {
    "phase0": { "status": "pending", "devAgent": null, "testAgent": null, "retryCount": 0 },
    "phase1": { "status": "pending", "devAgent": null, "testAgent": null, "retryCount": 0 }
  },
  "maxRetries": 3
}
```

### 3. 准备测试脚本

创建测试辅助脚本：
- `scripts/test-api-connection.sh` - 测试 API 连接
- `scripts/verify-security.sh` - 验证安全性
- `scripts/check-coverage.sh` - 检查测试覆盖率

---

## ⚠️ 风险和应对

### 风险 1：测试 Agent 仍然质量不好
**应对**：
- 为测试 Agent 提供更详细的指令
- 要求输出 JSON 格式报告
- 我会审查测试报告

### 风险 2：流程卡在某阶段
**应对**：
- 3 次重试后自动告警
- 飞书通知你，等待决策

### 风险 3：开发 Agent 理解错误
**应对**：
- 每个任务都有详细的验收标准
- 测试 Agent 会检查是否符合标准

---

## ✅ 最终输出

**你将收到**：
1. 📦 完整的代码（Phase 0-6）
2. 📊 测试报告（每个阶段）
3. 📝 开发日志（所有 agent 的执行记录）
4. 🚀 部署指南（Vercel 部署步骤）

---

## 🎯 下一步

**我可以**：
1. 立即启动 Phase 0 开发 + 测试
2. 或者先让你审查这个方案，确认后再开始

你想怎么做？
