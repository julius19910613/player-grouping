# 双 Subagent 开发流程设计文档

> **版本**: v1.0
> **创建时间**: 2026-03-09
> **参考**: 基于 MEMORY.md 中的经验教训和行业最佳实践

---

## 📋 目录

1. [概述](#概述)
2. [开发 Agent 职责](#开发-agent-职责)
3. [测试 Agent 职责](#测试-agent-职责)
4. [E2E 测试场景](#e2e-测试场景)
5. [验收标准](#验收标准)
6. [工作流程](#工作流程)
7. [错误处理和重试机制](#错误处理和重试机制)
8. [工具使用示例](#工具使用示例)
9. [监控和通知](#监控和通知)
10. [最佳实践参考](#最佳实践参考)

---

## 概述

### 设计目标

建立一套**双 Agent 协作的自动化开发测试流程**，确保：

- ✅ **部署前必须全部验证通过**
- ✅ **不能出现 500 错误**（避免之前的问题）
- ✅ **使用真实浏览器测试**（Playwright）
- ✅ **验证完整用户流程**（端到端）

### 核心原则

| 原则 | 说明 |
|------|------|
| **本地优先** | 所有测试在本地进行，不依赖外部环境 |
| **工具优先** | 充分使用 OpenClaw 工具，不模拟工具功能 |
| **验证优先** | 多次验证（至少 3 次），不假设成功 |
| **错误优先** | 假设会出错，提前准备错误处理 |

---

## 开发 Agent 职责

### 1. 使用 Claude Code 开发代码

**启动方式**：
```bash
# 使用 coding-agent skill
claude-code --project /Users/ppt/Projects/player-grouping
```

**职责**：
- ✅ 新功能开发
- ✅ Bug 修复
- ✅ 代码重构
- ✅ 配置文件修改
- ✅ 单元测试编写

**工具使用**：

| 工具 | 用途 | 示例 |
|------|------|------|
| `read` | 读取代码文件 | `read src/api/chat.ts` |
| `write` | 创建新文件 | `write src/utils/helper.ts` |
| `edit` | 精确修改代码 | `edit src/api/chat.ts` |
| `web_search` | 查询最佳实践 | "TypeScript async best practices" |
| `web_fetch` | 获取官方文档 | "https://vuejs.org/guide" |

### 2. 启动本地开发服务器

**步骤**：

```bash
# 1. 安装依赖（如果需要）
npm install

# 2. 启动开发服务器
npm run dev &

# 3. 等待服务器启动
sleep 5

# 4. 验证服务器是否正常运行
curl -s http://localhost:5173/api/health | jq .
```

**使用 exec 工具**：
```typescript
await exec({
  command: 'cd /Users/ppt/Projects/player-grouping && npm run dev &',
  workdir: '/Users/ppt/Projects/player-grouping',
  background: true  // 后台运行
})
```

**使用 process 工具管理**：
```typescript
// 检查服务器是否启动
const result = await process({
  action: 'log',
  sessionId: 'dev-server-session-id'
})

// 如果需要停止服务器
await process({
  action: 'kill',
  sessionId: 'dev-server-session-id'
})
```

### 3. 验证 API 端点

**使用 curl 验证**：
```bash
# 健康检查
curl -X GET http://localhost:5173/api/health
# 预期: {"status":"ok"}

# 查询球员信息
curl -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"骚当"}'
# 预期: 返回球员数据，状态码 200

# 球员对比
curl -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"骚当和小李对比"}'
# 预期: 返回对比结果，状态码 200
```

**使用 exec 工具批量验证**：
```bash
#!/bin/bash
# verify-api.sh

echo "=== API 端点验证开始 ==="

# 验证健康检查
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/api/health | grep -q "200"; then
  echo "✅ /api/health: 200 OK"
else
  echo "❌ /api/health: 失败"
  exit 1
fi

# 验证聊天接口
if curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"测试"}' | grep -q "200"; then
  echo "✅ /api/chat: 200 OK"
else
  echo "❌ /api/chat: 失败"
  exit 1
fi

echo "=== API 端点验证完成 ==="
```

### 4. 运行单元测试

**步骤**：
```bash
# 运行所有单元测试
npm test

# 运行特定测试文件
npm test src/__tests__/chat.test.ts

# 生成覆盖率报告
npm test -- --coverage
```

**验收标准**：
- ✅ 所有测试通过
- ✅ 覆盖率 > 80%
- ✅ 无 TypeScript 编译错误

### 5. 更新状态文件

开发完成后，**必须更新状态文件**：

```json
{
  "phase": "N",
  "status": "development_completed",
  "timestamp": "2026-03-09T10:00:00+08:00",
  "devAgent": {
    "sessionId": "dev-session-xxx",
    "completedAt": "2026-03-09T10:00:00+08:00",
    "artifacts": {
      "files": ["src/api/chat.ts", "src/utils/helper.ts"],
      "tests": "all_passed",
      "coverage": "85%",
      "apiVerified": true
    },
    "readyForTesting": true
  }
}
```

---

## 测试 Agent 职责

### 1. 使用 browser 工具进行 E2E 测试

**OpenClaw browser 工具**（基于 Playwright）：

```typescript
// 1. 打开页面
await browser({
  action: 'open',
  url: 'http://localhost:5173',
  profile: 'chrome'  // 或 'openclaw' 独立浏览器
})

// 2. 获取页面快照（DOM 结构）
const snapshot = await browser({
  action: 'snapshot',
  refs: 'aria'  // 使用 aria-ref，更稳定
})

// 3. 输入文本
await browser({
  action: 'act',
  request: {
    kind: 'type',
    ref: 'e12',  // 从 snapshot 获取的 ref
    text: '骚当'
  }
})

// 4. 点击按钮
await browser({
  action: 'act',
  request: {
    kind: 'click',
    ref: 'e15'
  }
})

// 5. 等待响应
await browser({
  action: 'act',
  request: {
    kind: 'wait',
    timeMs: 2000
  }
})

// 6. 截图
await browser({
  action: 'screenshot',
  fullPage: true,
  type: 'png'
})
```

### 2. 访问本地开发服务器

**步骤**：

```typescript
// 1. 读取开发 Agent 的状态
const state = await read('/Users/ppt/Projects/player-grouping/agent-dev-state.json')
const { devAgent } = JSON.parse(state)

if (!devAgent.readyForTesting) {
  throw new Error('开发 Agent 尚未完成')
}

// 2. 确认服务器运行
await exec({
  command: 'curl -s http://localhost:5173/api/health',
  workdir: '/Users/ppt/Projects/player-grouping'
})

// 3. 启动浏览器测试
await browser({
  action: 'open',
  url: 'http://localhost:5173'
})
```

### 3. 验证用户流程

**完整流程示例**：

```typescript
// 场景 1：查询球员信息
async function testPlayerQuery() {
  // 打开页面
  await browser({ action: 'open', url: 'http://localhost:5173' })
  
  // 获取快照
  const snapshot = await browser({ action: 'snapshot', refs: 'aria' })
  
  // 找到输入框（根据 aria-ref）
  const inputRef = findElement(snapshot, 'textbox', '输入消息')
  
  // 输入查询
  await browser({
    action: 'act',
    request: { kind: 'type', ref: inputRef, text: '骚当' }
  })
  
  // 找到发送按钮
  const buttonRef = findElement(snapshot, 'button', '发送')
  
  // 点击发送
  await browser({
    action: 'act',
    request: { kind: 'click', ref: buttonRef }
  })
  
  // 等待响应
  await browser({
    action: 'act',
    request: { kind: 'wait', timeMs: 3000 }
  })
  
  // 验证响应
  const responseSnapshot = await browser({ action: 'snapshot' })
  
  // 检查是否包含球员数据
  if (!responseSnapshot.includes('骚当')) {
    throw new Error('未找到球员数据')
  }
  
  // 截图记录
  await browser({ action: 'screenshot', fullPage: true })
  
  return { success: true }
}
```

### 4. 生成测试报告

**测试报告模板**：

```markdown
# E2E 测试报告 - Phase N

**测试时间**: 2026-03-09 10:30:00
**测试 Agent**: test-session-xxx
**开发服务器**: http://localhost:5173

## 测试结果摘要

| 场景 | 状态 | 耗时 | 错误信息 |
|------|------|------|---------|
| 查询球员信息 | ✅ PASS | 2.3s | - |
| 球员对比 | ✅ PASS | 3.1s | - |
| 上传图片分析 | ❌ FAIL | 5.2s | API 返回 500 |
| 上传视频分析 | ⏭️ SKIP | - | 依赖图片上传 |
| 更新球员数据 | ⏭️ SKIP | - | 依赖视频上传 |

## 通过率

- **通过**: 2/5 (40%)
- **失败**: 1/5 (20%)
- **跳过**: 2/5 (40%)

## 详细测试日志

### ✅ 场景 1: 查询球员信息

**步骤**:
1. 打开页面 http://localhost:5173 ✅
2. 输入"骚当" ✅
3. 点击发送 ✅
4. 验证返回数据 ✅

**截图**: [screenshot-1.png]

---

### ❌ 场景 3: 上传图片分析

**步骤**:
1. 打开页面 http://localhost:5173 ✅
2. 点击上传按钮 ✅
3. 选择图片文件 ✅
4. 等待分析结果 ❌

**错误详情**:
```
API Error: 500 Internal Server Error
URL: POST /api/upload/image
Response: {"error":"Failed to process image"}
```

**截图**: [screenshot-3-error.png]

## API 验证结果

| 端点 | 状态码 | 响应时间 | 验证结果 |
|------|--------|---------|---------|
| GET /api/health | 200 | 12ms | ✅ |
| POST /api/chat | 200 | 230ms | ✅ |
| POST /api/upload/image | 500 | 1200ms | ❌ |
| POST /api/upload/video | N/A | N/A | ⏭️ |

## 建议

1. **优先修复**: 图片上传 API 500 错误
2. **需要调查**: 检查图片处理模块
3. **重试建议**: 修复后重新运行场景 3-5

---

**生成时间**: 2026-03-09 10:45:00
```

### 5. 更新状态文件

测试完成后，**必须更新状态文件**：

```json
{
  "phase": "N",
  "status": "testing_completed",
  "timestamp": "2026-03-09T10:45:00+08:00",
  "devAgent": {
    "sessionId": "dev-session-xxx",
    "completedAt": "2026-03-09T10:00:00+08:00",
    "readyForTesting": true
  },
  "testAgent": {
    "sessionId": "test-session-xxx",
    "completedAt": "2026-03-09T10:45:00+08:00",
    "results": {
      "total": 5,
      "passed": 2,
      "failed": 1,
      "skipped": 2,
      "passRate": "40%"
    },
    "apiVerification": {
      "passed": 2,
      "failed": 1,
      "errors": [
        {
          "endpoint": "/api/upload/image",
          "statusCode": 500,
          "error": "Failed to process image"
        }
      ]
    },
    "report": "tests/e2e/reports/phase-N-report.md",
    "screenshots": [
      "tests/e2e/screenshots/phase-N-scene1.png",
      "tests/e2e/screenshots/phase-N-scene3-error.png"
    ]
  },
  "readyForReview": true
}
```

---

## E2E 测试场景

### 场景 1：查询球员信息

**描述**: 用户输入球员昵称，系统返回球员详细信息

**测试步骤**:
1. 打开首页 `http://localhost:5173`
2. 在输入框输入 "骚当"
3. 点击"发送"按钮
4. 等待 2 秒
5. 验证页面显示球员信息

**预期结果**:
- ✅ 输入框可正常输入
- ✅ 发送按钮可点击
- ✅ 返回球员姓名、年龄、位置、数据
- ✅ 无错误提示
- ✅ API 返回 200

**验收标准**:
```json
{
  "player": {
    "name": "骚当",
    "age": 25,
    "position": "PG",
    "stats": {
      "points": 18.5,
      "rebounds": 4.2,
      "assists": 6.1
    }
  }
}
```

**测试脚本**:
```typescript
// tests/e2e/scenario-1-player-query.ts
export async function testPlayerQuery() {
  // 打开页面
  await browser({ action: 'open', url: 'http://localhost:5173' })
  
  // 获取快照
  const snapshot = await browser({ action: 'snapshot', refs: 'aria' })
  
  // 输入查询
  const inputRef = findElement(snapshot, 'textbox', '输入消息')
  await browser({
    action: 'act',
    request: { kind: 'type', ref: inputRef, text: '骚当' }
  })
  
  // 点击发送
  const buttonRef = findElement(snapshot, 'button', '发送')
  await browser({
    action: 'act',
    request: { kind: 'click', ref: buttonRef }
  })
  
  // 等待响应
  await browser({
    action: 'act',
    request: { kind: 'wait', timeMs: 3000 }
  })
  
  // 验证响应
  const responseSnapshot = await browser({ action: 'snapshot' })
  if (!responseSnapshot.includes('骚当') || !responseSnapshot.includes('PG')) {
    throw new Error('未找到完整球员数据')
  }
  
  // 截图
  await browser({ action: 'screenshot', fullPage: true })
  
  return { success: true }
}
```

---

### 场景 2：球员对比

**描述**: 用户请求对比两个球员的数据

**测试步骤**:
1. 在输入框输入 "骚当和小李对比"
2. 点击"发送"
3. 等待 3 秒
4. 验证返回对比表格

**预期结果**:
- ✅ 返回两个球员的对比数据
- ✅ 包含姓名、得分、篮板、助攻对比
- ✅ 高亮显示优劣势

**验收标准**:
```json
{
  "comparison": {
    "players": ["骚当", "小李"],
    "stats": {
      "points": { "骚当": 18.5, "小李": 15.2, "winner": "骚当" },
      "rebounds": { "骚当": 4.2, "小李": 5.8, "winner": "小李" },
      "assists": { "骚当": 6.1, "小李": 3.9, "winner": "骚当" }
    }
  }
}
```

---

### 场景 3：上传图片并分析

**描述**: 用户上传比赛截图，系统分析球员数据

**测试步骤**:
1. 点击"上传图片"按钮
2. 选择测试图片 `tests/fixtures/game-screenshot.png`
3. 等待分析完成（10 秒）
4. 验证返回分析结果

**预期结果**:
- ✅ 图片上传成功
- ✅ API 返回 200（不是 500！）
- ✅ 返回识别的球员信息
- ✅ 返回分析建议

**验收标准**:
```json
{
  "analysis": {
    "imageId": "img_12345",
    "recognized": ["骚当", "小李", "阿强"],
    "stats": {
      "骚当": { "points": 12, "rebounds": 3 },
      "小李": { "points": 8, "rebounds": 5 }
    },
    "suggestions": "建议增加骚当的上场时间"
  }
}
```

**错误处理**:
- ❌ 如果 API 返回 500 → 记录错误日志，标记测试失败
- ❌ 如果分析超时 → 重试 1 次，仍然失败则记录

---

### 场景 4：上传视频并分析

**描述**: 用户上传比赛视频，系统分析球员表现

**测试步骤**:
1. 点击"上传视频"按钮
2. 选择测试视频 `tests/fixtures/game-clip.mp4`
3. 等待分析完成（30 秒）
4. 验证返回分析结果

**预期结果**:
- ✅ 视频上传成功
- ✅ 返回逐帧分析
- ✅ 返回球员轨迹
- ✅ 返回战术建议

---

### 场景 5：更新球员数据

**描述**: 根据分析结果更新球员数据库

**测试步骤**:
1. 基于场景 3 或 4 的分析结果
2. 点击"确认更新"按钮
3. 验证数据库更新
4. 验证前端显示更新

**预期结果**:
- ✅ 数据库成功更新
- ✅ 前端显示新数据
- ✅ 历史记录已保存

---

## 验收标准

### 开发阶段验收

| 项目 | 标准 | 验证方式 |
|------|------|---------|
| 单元测试 | ✅ 全部通过 | `npm test` |
| 测试覆盖率 | ✅ > 80% | `npm test -- --coverage` |
| TypeScript 编译 | ✅ 无错误 | `npm run build` |
| 代码风格 | ✅ ESLint 通过 | `npm run lint` |
| 本地服务器 | ✅ 正常启动 | `curl localhost:5173/api/health` |

### 测试阶段验收

| 项目 | 标准 | 验证方式 |
|------|------|---------|
| API 端点 | ✅ 全部返回 200 | curl 测试 |
| E2E 场景 | ✅ 通过率 100% | Playwright 测试 |
| 用户体验 | ✅ 无卡顿无报错 | 真实浏览器测试 |
| 截图记录 | ✅ 每个场景都有截图 | browser 工具 |

### 部署前验收

| 项目 | 标准 | 验证方式 |
|------|------|---------|
| 本地构建 | ✅ 成功 | `npm run build` |
| 本地预览 | ✅ 正常访问 | `http://localhost:4173` |
| 预览环境 E2E | ✅ 全部通过 | Playwright (preview port) |
| 无 500 错误 | ✅ 所有 API 正常 | 日志检查 |

---

## 工作流程

### Phase N 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    主会话启动 Phase N                        │
│                  sessions_spawn(mode="run")                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              开发 Agent (60 分钟)                            │
│  Label: "project-dev-phaseN"                                │
│  Timeout: 3600s                                             │
│                                                              │
│  1. 读取规划文档                                             │
│  2. 开发代码 (Claude Code)                                  │
│  3. 运行单元测试 (npm test)                                 │
│  4. 本地启动服务器 (npm run dev)                            │
│  5. 验证 API 端点 (curl/exec)                               │
│  6. 更新状态文件 ✅                                          │
│                                                              │
│  输出:                                                       │
│  - 代码文件                                                   │
│  - 状态: "development_completed"                            │
│  - readyForTesting: true                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              测试 Agent (30 分钟)                            │
│  Label: "project-test-phaseN"                               │
│  Timeout: 1800s                                             │
│                                                              │
│  1. 读取状态文件                                             │
│  2. 确认服务器运行                                           │
│  3. 执行 E2E 测试 (browser 工具)                            │
│     - 场景 1: 查询球员信息                                  │
│     - 场景 2: 球员对比                                      │
│     - 场景 3: 上传图片分析                                  │
│     - 场景 4: 上传视频分析                                  │
│     - 场景 5: 更新球员数据                                  │
│  4. 验证 API 返回（无 500）                                 │
│  5. 生成测试报告                                             │
│  6. 更新状态文件 ✅                                          │
│                                                              │
│  输出:                                                       │
│  - 测试报告                                                   │
│  - 截图                                                       │
│  - 状态: "testing_completed"                                │
│  - readyForReview: true                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              主会话验证阶段                                   │
│                                                              │
│  1. 读取测试报告                                             │
│  2. 检查通过率                                               │
│  3. 检查 API 验证结果                                        │
│  4. 决策:                                                    │
│     - ✅ 通过率 100% → 启动下一 Phase                        │
│     - ❌ 有失败 → 通知开发 Agent 修复                       │
│     - ❌ 严重错误 → 回滚 + 重试                             │
│                                                              │
│  5. (可选) 部署到预览环境                                    │
│  6. (可选) 预览环境 E2E 测试                                │
│  7. 部署到生产环境                                           │
└─────────────────────────────────────────────────────────────┘
```

### 时间线示例

```
09:00  主会话启动 Phase 5
       └─ sessions_spawn("project-dev-phase5", timeout=3600)

09:05  开发 Agent 开始
       ├─ 读取规划文档
       ├─ 开发代码
       ├─ 运行单元测试
       └─ 更新状态文件

09:50  开发 Agent 完成
       └─ 状态: "development_completed"

09:55  主会话启动测试 Agent
       └─ sessions_spawn("project-test-phase5", timeout=1800)

10:00  测试 Agent 开始
       ├─ 读取状态文件
       ├─ 执行 E2E 测试
       ├─ 验证 API
       └─ 生成测试报告

10:25  测试 Agent 完成
       └─ 状态: "testing_completed"

10:30  主会话验证
       ├─ 检查测试报告
       ├─ 决策: 通过 ✅
       └─ 启动 Phase 6
```

---

## 错误处理和重试机制

### 1. 开发 Agent 失败

**触发条件**:
- 超时（60 分钟）
- 单元测试失败
- 编译错误
- API 验证失败

**处理流程**:
```
开发 Agent 失败
       ↓
检查错误类型
       ↓
   ┌───┴───┐
   │       │
 编译错误  测试失败
   │       │
   ↓       ↓
修复代码  修复测试
   │       │
   └───┬───┘
       ↓
重试（最多 3 次）
       ↓
   ┌───┴───┐
   │       │
 成功    失败（3 次后）
   │       │
   ↓       ↓
继续    通知主会话
         └─ 人工介入
```

**状态文件记录**:
```json
{
  "phase": "N",
  "status": "development_failed",
  "retryCount": 2,
  "lastError": {
    "type": "test_failure",
    "message": "Unit test failed: chat.test.ts",
    "timestamp": "2026-03-09T09:45:00+08:00"
  }
}
```

### 2. 测试 Agent 发现 Bug

**触发条件**:
- E2E 测试失败
- API 返回 500
- 验收标准不通过

**处理流程**:
```
测试 Agent 发现 Bug
       ↓
记录错误详情
       ↓
生成测试报告
       ↓
通知开发 Agent
       ↓
开发 Agent 修复
       ↓
重新运行测试 Agent
```

**通知机制**（使用飞书）:
```typescript
await message({
  action: 'send',
  channel: 'feishu',
  target: 'ou_78a4033e2e70343e3c945ab93877ac18',
  message: `
🔴 **测试失败通知 - Phase N**

**失败场景**: 场景 3 - 上传图片分析
**错误**: API 返回 500
**详情**: ${errorDetails}

请开发 Agent 尽快修复。
  `
})
```

### 3. E2E 测试失败

**详细错误报告模板**:

```markdown
# E2E 测试失败报告

**失败时间**: 2026-03-09 10:15:00
**失败场景**: 场景 3 - 上传图片分析
**失败步骤**: 步骤 4 - 等待分析结果

## 错误详情

**API 错误**:
```
POST /api/upload/image
Status: 500 Internal Server Error
Response: {
  "error": "Failed to process image",
  "stack": "Error: ENOENT: no such file or directory..."
}
```

**浏览器状态**:
- URL: http://localhost:5173
- 页面标题: 球员分组工具
- 当前元素: 上传按钮（已点击）

**环境信息**:
- Node.js: v24.13.0
- OS: Darwin 25.3.0 (arm64)
- 开发服务器: Running (PID 12345)

## 截图

[失败时截图](tests/e2e/screenshots/phase-N-scene3-error.png)

## 建议修复方案

1. 检查图片处理模块路径
2. 验证文件上传配置
3. 添加错误处理逻辑

## 复现步骤

1. 打开 http://localhost:5173
2. 点击"上传图片"
3. 选择 `tests/fixtures/game-screenshot.png`
4. 等待响应 → 500 错误

---

**需要立即修复！**
```

### 4. API 返回 500

**立即处理流程**:

```
API 返回 500
       ↓
记录错误日志
       ↓
检查服务器日志
       ↓
   ┌───┴────┐
   │        │
 模块错误  配置错误
   │        │
   ↓        ↓
修复代码  修复配置
   │        │
   └───┬────┘
       ↓
重启服务器
       ↓
重新验证 API
       ↓
   ┌───┴───┐
   │       │
 成功    失败
   │       │
   ↓       ↓
继续    通知主会话
```

**错误日志记录**:
```json
{
  "timestamp": "2026-03-09T10:15:00+08:00",
  "error": {
    "type": "api_error",
    "endpoint": "/api/upload/image",
    "method": "POST",
    "statusCode": 500,
    "message": "Failed to process image",
    "stack": "Error: ENOENT...",
    "request": {
      "file": "game-screenshot.png",
      "size": "2.3MB"
    },
    "environment": {
      "nodeVersion": "v24.13.0",
      "os": "Darwin 25.3.0",
      "devServerPid": 12345
    }
  }
}
```

### 5. 超时处理

**各类超时设置**:

| Agent 类型 | 超时时间 | 超时后动作 |
|-----------|---------|-----------|
| 开发 Agent | 60 分钟 | 记录状态，通知主会话 |
| 测试 Agent | 30 分钟 | 记录状态，通知主会话 |
| API 请求 | 10 秒 | 重试 1 次 |
| 页面加载 | 30 秒 | 截图，记录错误 |
| E2E 场景 | 5 分钟 | 标记失败，继续下一场景 |

---

## 工具使用示例

### 开发 Agent 示例

#### 示例 1：启动开发服务器并验证

```bash
#!/bin/bash
# dev-server-verify.sh

# 进入项目目录
cd /Users/ppt/Projects/player-grouping

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# 启动开发服务器（后台运行）
npm run dev &
DEV_PID=$!

# 等待服务器启动
echo "Waiting for dev server to start..."
sleep 5

# 验证服务器健康检查
echo "Verifying dev server..."
for i in {1..3}; do
  if curl -s http://localhost:5173/api/health | grep -q "ok"; then
    echo "✅ Dev server is running (attempt $i)"
    break
  else
    if [ $i -eq 3 ]; then
      echo "❌ Dev server failed to start"
      kill $DEV_PID
      exit 1
    fi
    echo "⏳ Waiting... (attempt $i)"
    sleep 2
  fi
done

# 验证所有 API 端点
echo "Verifying API endpoints..."
curl -X GET http://localhost:5173/api/health
curl -X POST http://localhost:5173/api/chat -H "Content-Type: application/json" -d '{"message":"test"}'

echo "✅ Development server is ready for testing"

# 保持服务器运行
wait $DEV_PID
```

#### 示例 2：运行单元测试并生成覆盖率

```bash
#!/bin/bash
# run-tests.sh

cd /Users/ppt/Projects/player-grouping

# 运行单元测试
echo "Running unit tests..."
npm test

if [ $? -eq 0 ]; then
  echo "✅ Unit tests passed"
  
  # 生成覆盖率报告
  echo "Generating coverage report..."
  npm test -- --coverage
  
  # 检查覆盖率阈值
  COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
  if (( $(echo "$COVERAGE > 80" | bc -l) )); then
    echo "✅ Coverage: $COVERAGE% (threshold: 80%)"
  else
    echo "⚠️ Coverage: $COVERAGE% (below threshold: 80%)"
    exit 1
  fi
else
  echo "❌ Unit tests failed"
  exit 1
fi
```

#### 示例 3：更新状态文件

```bash
#!/bin/bash
# update-state.sh

STATE_FILE="/Users/ppt/Projects/player-grouping/agent-dev-state.json"

# 读取当前状态
CURRENT=$(cat $STATE_FILE)

# 更新状态
echo $CURRENT | jq '. + {
  "status": "development_completed",
  "timestamp": "'$(date -Iseconds)'",
  "devAgent": {
    "sessionId": "'$SESSION_ID'",
    "completedAt": "'$(date -Iseconds)'",
    "artifacts": {
      "files": ["src/api/chat.ts"],
      "tests": "all_passed",
      "coverage": "85%",
      "apiVerified": true
    },
    "readyForTesting": true
  }
}' > $STATE_FILE

echo "✅ State file updated: $STATE_FILE"
```

### 测试 Agent 示例

#### 示例 1：完整 E2E 测试脚本

```typescript
// tests/e2e/run-all-scenarios.ts

import { browser } from 'openclaw-tools'

async function runAllScenarios() {
  console.log('=== E2E 测试开始 ===')
  
  const results = {
    total: 5,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  }
  
  // 场景 1: 查询球员信息
  try {
    await testScenario1()
    results.passed++
    console.log('✅ 场景 1: 通过')
  } catch (error) {
    results.failed++
    results.errors.push({ scenario: 1, error: error.message })
    console.log('❌ 场景 1: 失败 -', error.message)
  }
  
  // 场景 2: 球员对比
  try {
    await testScenario2()
    results.passed++
    console.log('✅ 场景 2: 通过')
  } catch (error) {
    results.failed++
    results.errors.push({ scenario: 2, error: error.message })
    console.log('❌ 场景 2: 失败 -', error.message)
  }
  
  // 场景 3: 上传图片分析
  try {
    await testScenario3()
    results.passed++
    console.log('✅ 场景 3: 通过')
  } catch (error) {
    results.failed++
    results.errors.push({ scenario: 3, error: error.message })
    console.log('❌ 场景 3: 失败 -', error.message)
  }
  
  // 场景 4-5 依赖场景 3
  if (results.errors.find(e => e.scenario === 3)) {
    results.skipped += 2
    console.log('⏭️ 场景 4-5: 跳过（依赖场景 3）')
  } else {
    // 场景 4: 上传视频分析
    try {
      await testScenario4()
      results.passed++
      console.log('✅ 场景 4: 通过')
    } catch (error) {
      results.failed++
      results.errors.push({ scenario: 4, error: error.message })
      console.log('❌ 场景 4: 失败 -', error.message)
    }
    
    // 场景 5: 更新球员数据
    try {
      await testScenario5()
      results.passed++
      console.log('✅ 场景 5: 通过')
    } catch (error) {
      results.failed++
      results.errors.push({ scenario: 5, error: error.message })
      console.log('❌ 场景 5: 失败 -', error.message)
    }
  }
  
  console.log('=== E2E 测试完成 ===')
  console.log(`总计: ${results.total}, 通过: ${results.passed}, 失败: ${results.failed}, 跳过: ${results.skipped}`)
  
  return results
}

async function testScenario1() {
  // 打开页面
  await browser({
    action: 'open',
    url: 'http://localhost:5173'
  })
  
  // 获取快照
  const snapshot = await browser({
    action: 'snapshot',
    refs: 'aria'
  })
  
  // 找到输入框（根据 aria 属性）
  const inputRef = findElementByRole(snapshot, 'textbox')
  if (!inputRef) {
    throw new Error('未找到输入框')
  }
  
  // 输入查询
  await browser({
    action: 'act',
    request: {
      kind: 'type',
      ref: inputRef,
      text: '骚当'
    }
  })
  
  // 找到发送按钮
  const buttonRef = findElementByRole(snapshot, 'button', '发送')
  if (!buttonRef) {
    throw new Error('未找到发送按钮')
  }
  
  // 点击发送
  await browser({
    action: 'act',
    request: {
      kind: 'click',
      ref: buttonRef
    }
  })
  
  // 等待响应
  await browser({
    action: 'act',
    request: {
      kind: 'wait',
      timeMs: 3000
    }
  })
  
  // 验证响应
  const responseSnapshot = await browser({ action: 'snapshot' })
  if (!responseSnapshot.includes('骚当') || !responseSnapshot.includes('PG')) {
    throw new Error('未找到完整球员数据')
  }
  
  // 截图
  await browser({
    action: 'screenshot',
    fullPage: true
  })
}

// ... 其他场景测试函数

// 辅助函数
function findElementByRole(snapshot: string, role: string, name?: string): string | null {
  // 解析 snapshot 找到匹配的元素 ref
  // 实现略
  return 'e12' // 示例返回
}
```

#### 示例 2：API 验证脚本

```bash
#!/bin/bash
# verify-api.sh

echo "=== API 端点验证开始 ==="

BASE_URL="http://localhost:5173"
PASS_COUNT=0
FAIL_COUNT=0

# 测试函数
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  
  if [ -z "$data" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -X $method $BASE_URL$endpoint)
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X $method $BASE_URL$endpoint \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  if [ "$status" == "$expected_status" ]; then
    echo "✅ $method $endpoint: $status"
    ((PASS_COUNT++))
  else
    echo "❌ $method $endpoint: $status (expected $expected_status)"
    ((FAIL_COUNT++))
  fi
}

# 测试所有端点
test_endpoint "GET" "/api/health" "" "200"
test_endpoint "POST" "/api/chat" '{"message":"骚当"}' "200"
test_endpoint "POST" "/api/chat" '{"message":"骚当和小李对比"}' "200"
test_endpoint "POST" "/api/upload/image" "" "200"  # 需要 multipart/form-data

echo "=== API 端点验证完成 ==="
echo "通过: $PASS_COUNT, 失败: $FAIL_COUNT"

if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
fi
```

#### 示例 3：生成测试报告

```bash
#!/bin/bash
# generate-report.sh

REPORT_FILE="tests/e2e/reports/phase-N-report.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 创建报告目录
mkdir -p $(dirname $REPORT_FILE)

# 读取测试结果
STATE=$(cat /Users/ppt/Projects/player-grouping/agent-dev-state.json)
PASSED=$(echo $STATE | jq '.testAgent.results.passed')
FAILED=$(echo $STATE | jq '.testAgent.results.failed')
SKIPPED=$(echo $STATE | jq '.testAgent.results.skipped')
TOTAL=$(echo $STATE | jq '.testAgent.results.total')

# 生成报告
cat > $REPORT_FILE << EOF
# E2E 测试报告 - Phase N

**测试时间**: $TIMESTAMP
**测试服务器**: http://localhost:5173

## 测试结果摘要

| 指标 | 数量 |
|------|------|
| 总计 | $TOTAL |
| 通过 | $PASSED |
| 失败 | $FAILED |
| 跳过 | $SKIPPED |
| 通过率 | $(echo "scale=0; $PASSED * 100 / $TOTAL" | bc)%

## API 验证结果

$(generate_api_results)

## 截图

$(generate_screenshot_links)

---

**生成时间**: $TIMESTAMP
EOF

echo "✅ 测试报告已生成: $REPORT_FILE"
```

---

## 监控和通知

### 1. 状态文件结构

`/Users/ppt/Projects/player-grouping/agent-dev-state.json`:

```json
{
  "version": "1.0",
  "project": "player-grouping",
  "currentPhase": "N",
  "updatedAt": "2026-03-09T10:45:00+08:00",
  
  "phases": {
    "phase1": {
      "status": "completed",
      "startedAt": "2026-03-09T09:00:00+08:00",
      "completedAt": "2026-03-09T10:45:00+08:00"
    },
    "phaseN": {
      "status": "testing_completed",
      "startedAt": "2026-03-09T09:00:00+08:00",
      
      "devAgent": {
        "sessionId": "dev-session-xxx",
        "status": "completed",
        "startedAt": "2026-03-09T09:05:00+08:00",
        "completedAt": "2026-03-09T09:50:00+08:00",
        "artifacts": {
          "files": ["src/api/chat.ts", "src/utils/helper.ts"],
          "tests": "all_passed",
          "coverage": "85%",
          "apiVerified": true
        },
        "readyForTesting": true
      },
      
      "testAgent": {
        "sessionId": "test-session-xxx",
        "status": "completed",
        "startedAt": "2026-03-09T10:00:00+08:00",
        "completedAt": "2026-03-09T10:45:00+08:00",
        "results": {
          "total": 5,
          "passed": 2,
          "failed": 1,
          "skipped": 2,
          "passRate": "40%"
        },
        "apiVerification": {
          "passed": 2,
          "failed": 1,
          "errors": [
            {
              "endpoint": "/api/upload/image",
              "statusCode": 500,
              "error": "Failed to process image",
              "timestamp": "2026-03-09T10:15:00+08:00"
            }
          ]
        },
        "report": "tests/e2e/reports/phase-N-report.md",
        "screenshots": [
          "tests/e2e/screenshots/phase-N-scene1.png",
          "tests/e2e/screenshots/phase-N-scene3-error.png"
        ]
      },
      
      "readyForReview": true
    }
  },
  
  "errorLog": [
    {
      "timestamp": "2026-03-09T10:15:00+08:00",
      "phase": "phaseN",
      "agent": "testAgent",
      "type": "api_error",
      "severity": "high",
      "message": "API returned 500: /api/upload/image",
      "resolved": false
    }
  ],
  
  "notifications": {
    "feishu": {
      "enabled": true,
      "target": "ou_78a4033e2e70343e3c945ab93877ac18",
      "events": ["error", "phase_complete", "review_required"]
    }
  }
}
```

### 2. 飞书通知配置

**通知事件**:

| 事件 | 触发条件 | 通知内容 |
|------|---------|---------|
| `dev_complete` | 开发 Agent 完成 | ✅ Phase N 开发完成 |
| `test_complete` | 测试 Agent 完成 | ✅/❌ Phase N 测试完成 |
| `error` | 发生错误 | 🔴 错误详情 |
| `review_required` | 需要人工审核 | ⏳ 等待审核 |

**通知模板**:

```typescript
// 成功通知
await message({
  action: 'send',
  channel: 'feishu',
  target: 'ou_78a4033e2e70343e3c945ab93877ac18',
  message: `
✅ **Phase N 测试完成**

**通过率**: 100% (5/5)
**耗时**: 25 分钟
**报告**: [查看详情](链接)

所有测试通过，可以进入下一阶段。
  `
})

// 失败通知
await message({
  action: 'send',
  channel: 'feishu',
  target: 'ou_78a4033e2e70343e3c945ab93877ac18',
  message: `
🔴 **Phase N 测试失败**

**通过率**: 40% (2/5)
**失败场景**: 场景 3 - 上传图片分析
**错误**: API 返回 500
**报告**: [查看详情](链接)

需要开发 Agent 修复后重试。
  `
})
```

### 3. Cron 监控配置

**监控规则**:

```json
{
  "cron": {
    "interval": "2m",
    "session": "main",
    "command": "openclaw cron check-agent-state",
    "systemEvent": true
  }
}
```

**检查逻辑**:

```typescript
// 每 2 分钟执行
async function checkAgentState() {
  const state = await read('/Users/ppt/Projects/player-grouping/agent-dev-state.json')
  const { phases } = JSON.parse(state)
  
  // 检查是否有 Agent 超时
  for (const [phase, data] of Object.entries(phases)) {
    if (data.status === 'running') {
      const lastUpdate = new Date(data.updatedAt)
      const now = new Date()
      const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60
      
      // 如果超过 30 分钟没有更新，认为超时
      if (minutesSinceUpdate > 30) {
        await notifyTimeout(phase, minutesSinceUpdate)
      }
    }
  }
  
  // 检查是否需要启动下一 Phase
  const currentPhase = phases[`phase${state.currentPhase}`]
  if (currentPhase.readyForReview && !currentPhase.reviewed) {
    await notifyReviewRequired(state.currentPhase)
  }
}
```

### 4. 心跳检测

**心跳配置**（HEARTBEAT.md）:

```markdown
# 心跳检查清单

## Agent 状态检查
- [ ] 检查 `/Users/ppt/Projects/player-grouping/agent-dev-state.json`
- [ ] 验证当前 Phase 状态
- [ ] 检查是否有超时（>30 分钟）

## 服务器状态检查
- [ ] 验证开发服务器运行（localhost:5173）
- [ ] 检查 API 健康状态

## 通知检查
- [ ] 是否有未处理的错误
- [ ] 是否需要启动下一 Phase

如果一切正常，回复 HEARTBEAT_OK。
```

---

## 最佳实践参考

### Playwright E2E 测试最佳实践

**来源**: [Playwright 官方文档](https://playwright.dev/docs/best-practices) + [DeviQA 2026 指南](https://www.deviqa.com/blog/guide-to-playwright-end-to-end-testing-in-2025/)

#### 1. 测试隔离

✅ **每个测试独立运行**，使用独立的浏览器上下文：

```typescript
// ✅ Good: 每个测试独立
test('查询球员信息', async ({ page }) => {
  // 自动创建新的 browser context
  await page.goto('http://localhost:5173')
  // 测试逻辑...
})

// ❌ Bad: 共享状态
let sharedPage
test.beforeAll(async ({ browser }) => {
  sharedPage = await browser.newPage()  // 不推荐
})
```

#### 2. 选择器优先级

✅ **优先使用用户可见的属性**：

```typescript
// ✅ 优先级 1: role + name
await page.getByRole('button', { name: '发送' })

// ✅ 优先级 2: text content
await page.getByText('骚当')

// ✅ 优先级 3: test id（作为后备）
await page.getByTestId('submit-button')

// ❌ 避免: 脆弱的 CSS 选择器
await page.locator('#root > div > div:nth-child(3) > button')
```

#### 3. 等待策略

✅ **使用自动等待，避免硬编码 sleep**：

```typescript
// ✅ Good: Playwright 自动等待
await page.click('button')
await page.waitForSelector('.result')  // 等待元素出现

// ❌ Bad: 硬编码等待
await page.click('button')
await page.waitForTimeout(3000)  // 不推荐
```

#### 4. 断言最佳实践

✅ **使用 Web-First 断言**：

```typescript
// ✅ Good: Web-first assertion (自动重试)
await expect(page.locator('.result')).toContainText('骚当')

// ❌ Bad: 手动断言（无重试）
const text = await page.locator('.result').textContent()
expect(text).toContain('骚当')
```

#### 5. 测试数据管理

✅ **使用固定测试数据，避免依赖外部状态**：

```typescript
// ✅ Good: 使用 fixtures
test('查询球员', async ({ page, playerData }) => {
  // playerData 是预定义的测试数据
  await page.goto('http://localhost:5173')
  // 使用 playerData 进行测试
})

// ❌ Bad: 依赖数据库实时数据
test('查询球员', async ({ page }) => {
  // 假设数据库中有"骚当"
  await page.goto('http://localhost:5173')
})
```

### 本地开发服务器测试最佳实践

**来源**: [LuxeQuality Playwright 指南](https://luxequality.com/blog/playwright-end-to-end-testing/) + [White-Test 2025](https://white-test.com/for-qa/useful-articles-for-qa/playwright-e2e-testing/)

#### 1. 服务器启动策略

✅ **在测试前启动服务器，测试后清理**：

```typescript
// playwright.config.ts
export default defineConfig({
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,  // CI 环境不重用
  }
})
```

#### 2. API Mock 策略

✅ **对于不稳定的外部服务，使用 Mock**：

```typescript
// 对于真实的业务逻辑，使用真实 API
test('真实查询球员', async ({ page }) => {
  await page.goto('http://localhost:5173')
  // 调用真实后端
})

// 对于第三方服务，使用 Mock
test('第三方支付', async ({ page }) => {
  await page.route('**/api/payment', route => {
    route.fulfill({ status: 200, body: '{"success":true}' })
  })
  await page.goto('http://localhost:5173')
})
```

#### 3. 构建验证

✅ **测试前验证构建**：

```bash
# 1. 单元测试
npm test

# 2. 构建验证
npm run build

# 3. 预览测试
npm run preview &
PREVIEW_PID=$!
sleep 5

# 4. 在预览环境运行 E2E 测试
npm run test:e2e -- --base-url=http://localhost:4173

# 5. 清理
kill $PREVIEW_PID
```

### AI Agent 自动化测试最佳实践

**来源**: [NVIDIA Technical Blog](https://developer.nvidia.com/blog/building-ai-agents-to-automate-software-test-case-creation/) + [Mabl 2026](https://www.mabl.com/blog/ai-agent-frameworks-end-to-end-test-automation)

#### 1. Agent 协作模式

✅ **明确职责边界，避免职责重叠**：

```
开发 Agent:
- 只负责代码开发和单元测试
- 不负责 E2E 测试

测试 Agent:
- 只负责 E2E 测试和验证
- 不修改代码（除非是测试代码）

主会话:
- 负责协调和决策
- 不直接参与开发或测试
```

#### 2. 状态同步机制

✅ **使用状态文件同步 Agent 进度**：

```json
{
  "devAgent": {
    "status": "completed",
    "artifacts": {...},
    "readyForTesting": true
  },
  "testAgent": {
    "status": "running",
    "currentScenario": 2,
    "progress": "40%"
  }
}
```

#### 3. 错误自愈机制

✅ **Agent 能够自动处理常见错误**：

```typescript
// 测试 Agent 发现错误
if (apiError.statusCode === 500) {
  // 1. 记录错误
  logError(apiError)
  
  // 2. 检查是否是已知错误
  if (isKnownError(apiError)) {
    // 3. 尝试自动修复（如重启服务器）
    await restartServer()
    
    // 4. 重试测试
    return retryTest()
  }
  
  // 5. 无法自动修复，通知开发 Agent
  await notifyDevAgent(apiError)
}
```

#### 4. 测试报告生成

✅ **自动生成人类可读的测试报告**：

```markdown
# 测试报告

## 摘要
- 通过率: 80%
- 主要问题: 图片上传 API 不稳定

## 详细结果
[自动生成的测试详情]

## 建议
1. 修复图片上传模块
2. 添加重试机制

## 截图
[自动附加的截图]
```

---

## 总结

### 关键成功因素

1. **本地验证优先**: 部署前必须本地 E2E 测试通过
2. **工具充分利用**: 使用 OpenClaw 的 browser、exec、process 工具
3. **错误详细记录**: 每个错误都要记录详情和截图
4. **自动化通知**: 使用飞书实时通知状态
5. **多重验证**: 不假设成功，至少验证 3 次

### 避免的陷阱

- ❌ 跳过本地测试直接部署
- ❌ 忽略 500 错误
- ❌ 使用硬编码等待（sleep）
- ❌ 共享测试状态
- ❌ 不记录错误详情

### 下一步

1. 实施此流程到 player-grouping 项目
2. 根据实际使用情况调整参数
3. 积累经验，持续改进

---

**文档维护**: 随着项目进展，持续更新此文档。

**反馈**: 如有问题或建议，请联系主会话。
