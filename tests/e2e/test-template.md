# E2E 测试脚本模板

> **用途**: 测试 Agent 执行 E2E 测试的标准模板
> **更新时间**: 2026-03-09

---

## 测试场景模板

### 模板结构

```markdown
# [场景名称] - E2E 测试

**场景编号**: [N]
**测试类型**: E2E
**优先级**: [高/中/低]
**预计耗时**: [X] 秒

## 1. 场景描述

[简要描述这个测试场景要验证的功能]

## 2. 前置条件

- [ ] 开发服务器已启动 (http://localhost:5173)
- [ ] 数据库已准备测试数据
- [ ] 必要的文件已准备好（如上传的图片/视频）

## 3. 测试步骤

### 步骤 1: [步骤名称]
- **操作**: [具体操作]
- **预期结果**: [预期看到的结果]
- **验证方式**: [如何验证]

### 步骤 2: [步骤名称]
...

## 4. 预期结果

- ✅ [预期结果 1]
- ✅ [预期结果 2]
- ✅ [预期结果 3]

## 5. 实际结果

**测试时间**: [YYYY-MM-DD HH:MM:SS]
**测试状态**: [✅ PASS / ❌ FAIL / ⏭️ SKIP]

### 实际步骤执行情况

| 步骤 | 状态 | 备注 |
|------|------|------|
| 1 | ✅ | 正常 |
| 2 | ✅ | 正常 |
| 3 | ❌ | API 返回 500 |

### 错误详情（如果有）

```
错误类型: API Error
错误信息: Failed to process image
堆栈跟踪: ...
```

### 截图

- [步骤 1 截图](./screenshots/phase-N-scene1-step1.png)
- [失败时截图](./screenshots/phase-N-scene1-error.png)

## 6. API 验证

| 端点 | 方法 | 状态码 | 响应时间 | 验证结果 |
|------|------|--------|---------|---------|
| /api/chat | POST | 200 | 230ms | ✅ |
| /api/upload | POST | 500 | 1200ms | ❌ |

## 7. 测试数据

**输入数据**:
```json
{
  "message": "骚当"
}
```

**预期输出**:
```json
{
  "player": {
    "name": "骚当",
    "position": "PG"
  }
}
```

**实际输出**:
```json
{
  "player": {
    "name": "骚当",
    "position": "PG"
  }
}
```

## 8. 清理工作

- [ ] 关闭浏览器
- [ ] 清理上传的文件（如果需要）
- [ ] 恢复数据库状态（如果需要）

## 9. 备注

[任何需要注意的事项]
```

---

## 完整示例

### 示例 1: 查询球员信息

```markdown
# 查询球员信息 - E2E 测试

**场景编号**: 1
**测试类型**: E2E
**优先级**: 高
**预计耗时**: 10 秒

## 1. 场景描述

验证用户可以通过输入球员昵称查询球员的详细信息，包括姓名、年龄、位置、数据等。

## 2. 前置条件

- [x] 开发服务器已启动 (http://localhost:5173)
- [x] 数据库中有球员"骚当"的数据
- [x] 网络连接正常

## 3. 测试步骤

### 步骤 1: 打开首页
- **操作**: 使用浏览器访问 `http://localhost:5173`
- **预期结果**: 
  - 页面正常加载
  - 显示输入框和发送按钮
  - 无错误提示
- **验证方式**: 
  ```typescript
  await browser({ action: 'open', url: 'http://localhost:5173' })
  const snapshot = await browser({ action: 'snapshot' })
  assert(snapshot.includes('输入消息'))
  assert(snapshot.includes('发送'))
  ```

### 步骤 2: 输入查询内容
- **操作**: 在输入框输入 "骚当"
- **预期结果**: 
  - 输入框显示 "骚当"
  - 无错误提示
- **验证方式**:
  ```typescript
  const inputRef = findElement(snapshot, 'textbox')
  await browser({
    action: 'act',
    request: { kind: 'type', ref: inputRef, text: '骚当' }
  })
  ```

### 步骤 3: 点击发送按钮
- **操作**: 点击 "发送" 按钮
- **预期结果**: 
  - 按钮可点击
  - 输入框被清空或禁用
  - 显示加载状态
- **验证方式**:
  ```typescript
  const buttonRef = findElement(snapshot, 'button', '发送')
  await browser({
    action: 'act',
    request: { kind: 'click', ref: buttonRef }
  })
  ```

### 步骤 4: 等待响应
- **操作**: 等待服务器返回结果
- **预期结果**: 
  - 2-3 秒内返回结果
  - 显示球员信息
  - 无错误提示
- **验证方式**:
  ```typescript
  await browser({
    action: 'act',
    request: { kind: 'wait', timeMs: 3000 }
  })
  const responseSnapshot = await browser({ action: 'snapshot' })
  ```

### 步骤 5: 验证返回数据
- **操作**: 检查返回的球员信息
- **预期结果**: 
  - 包含球员姓名 "骚当"
  - 包含位置信息（如 "PG"）
  - 包含统计数据
- **验证方式**:
  ```typescript
  assert(responseSnapshot.includes('骚当'))
  assert(responseSnapshot.includes('PG'))
  assert(responseSnapshot.includes('得分'))
  ```

## 4. 预期结果

- ✅ 页面正常加载
- ✅ 输入框可正常输入
- ✅ 发送按钮可点击
- ✅ 返回完整球员信息
- ✅ API 返回 200
- ✅ 无错误提示
- ✅ 响应时间 < 3 秒

## 5. 实际结果

**测试时间**: 2026-03-09 10:05:00
**测试状态**: ✅ PASS

### 实际步骤执行情况

| 步骤 | 状态 | 耗时 | 备注 |
|------|------|------|------|
| 1: 打开首页 | ✅ | 1.2s | 页面正常加载 |
| 2: 输入查询 | ✅ | 0.1s | 输入成功 |
| 3: 点击发送 | ✅ | 0.05s | 按钮可点击 |
| 4: 等待响应 | ✅ | 2.3s | 响应及时 |
| 5: 验证数据 | ✅ | 0.01s | 数据完整 |

**总耗时**: 3.66 秒

### 截图

- [首页加载](./screenshots/phase-1-scene1-home.png)
- [输入内容](./screenshots/phase-1-scene1-input.png)
- [查询结果](./screenshots/phase-1-scene1-result.png)

## 6. API 验证

| 端点 | 方法 | 状态码 | 响应时间 | 验证结果 |
|------|------|--------|---------|---------|
| GET /api/health | GET | 200 | 12ms | ✅ |
| POST /api/chat | POST | 200 | 230ms | ✅ |

### API 响应详情

**请求**:
```bash
curl -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"骚当"}'
```

**响应**:
```json
{
  "success": true,
  "data": {
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
}
```

**验证**: ✅ 响应格式正确，数据完整

## 7. 测试数据

**输入数据**:
```json
{
  "message": "骚当"
}
```

**预期输出**:
```json
{
  "success": true,
  "data": {
    "player": {
      "name": "骚当",
      "position": "PG"
    }
  }
}
```

**实际输出**:
```json
{
  "success": true,
  "data": {
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
}
```

**验证**: ✅ 输出符合预期

## 8. 清理工作

- [x] 关闭浏览器
- [x] 无需清理数据库
- [x] 无需清理文件

## 9. 备注

- 测试稳定，无随机失败
- 响应速度快，用户体验好
- 可以作为其他场景的基准测试
```

---

### 示例 2: 上传图片并分析（失败案例）

```markdown
# 上传图片并分析 - E2E 测试

**场景编号**: 3
**测试类型**: E2E
**优先级**: 高
**预计耗时**: 15 秒

## 1. 场景描述

验证用户可以上传比赛截图，系统自动分析图片中的球员数据并返回分析结果。

## 2. 前置条件

- [x] 开发服务器已启动 (http://localhost:5173)
- [x] 测试图片已准备 (`tests/fixtures/game-screenshot.png`)
- [x] 图片分析模块已配置

## 3. 测试步骤

### 步骤 1: 打开首页
- **操作**: 访问 `http://localhost:5173`
- **预期结果**: 页面正常加载
- **验证方式**: 
  ```typescript
  await browser({ action: 'open', url: 'http://localhost:5173' })
  ```

### 步骤 2: 点击上传按钮
- **操作**: 点击 "上传图片" 按钮
- **预期结果**: 
  - 文件选择对话框打开
  - 或显示拖拽上传区域
- **验证方式**:
  ```typescript
  const uploadRef = findElement(snapshot, 'button', '上传图片')
  await browser({
    action: 'act',
    request: { kind: 'click', ref: uploadRef }
  })
  ```

### 步骤 3: 选择图片文件
- **操作**: 选择测试图片 `tests/fixtures/game-screenshot.png`
- **预期结果**: 
  - 文件选择成功
  - 显示文件预览
  - 开始上传
- **验证方式**:
  ```typescript
  await browser({
    action: 'upload',
    inputRef: 'file-input',
    paths: ['tests/fixtures/game-screenshot.png']
  })
  ```

### 步骤 4: 等待分析完成
- **操作**: 等待图片上传和分析完成
- **预期结果**: 
  - 上传进度条显示
  - 5-10 秒内分析完成
  - 显示分析结果
- **验证方式**:
  ```typescript
  await browser({
    action: 'act',
    request: { kind: 'wait', timeMs: 10000 }
  })
  const resultSnapshot = await browser({ action: 'snapshot' })
  ```

### 步骤 5: 验证分析结果
- **操作**: 检查返回的分析数据
- **预期结果**: 
  - 包含识别的球员信息
  - 包含统计数据
  - 包含建议
- **验证方式**:
  ```typescript
  assert(resultSnapshot.includes('识别'))
  assert(resultSnapshot.includes('骚当'))
  ```

## 4. 预期结果

- ✅ 图片上传成功
- ✅ API 返回 200
- ✅ 返回识别的球员信息
- ✅ 返回统计数据
- ✅ 返回建议

## 5. 实际结果

**测试时间**: 2026-03-09 10:15:00
**测试状态**: ❌ FAIL

### 实际步骤执行情况

| 步骤 | 状态 | 耗时 | 备注 |
|------|------|------|------|
| 1: 打开首页 | ✅ | 1.2s | 正常 |
| 2: 点击上传 | ✅ | 0.1s | 正常 |
| 3: 选择文件 | ✅ | 0.5s | 文件选择成功 |
| 4: 等待分析 | ❌ | 5.2s | API 返回 500 |
| 5: 验证结果 | ⏭️ | - | 跳过 |

**总耗时**: 7.0 秒
**失败步骤**: 步骤 4

### 错误详情

**错误类型**: API Error (500 Internal Server Error)

**错误信息**:
```
POST /api/upload/image
Status: 500 Internal Server Error
Response Time: 1200ms

Response Body:
{
  "error": "Failed to process image",
  "message": "ENOENT: no such file or directory, open '/tmp/uploads/abc123.png'",
  "stack": "Error: ENOENT: no such file or directory..."
}
```

**服务器日志**:
```
[ERROR] 2026-03-09 10:15:05 - Image processing failed
Error: ENOENT: no such file or directory, open '/tmp/uploads/abc123.png'
    at Object.openSync (node:fs:585:3)
    at uploadImage (src/api/upload.ts:45:12)
```

**根本原因分析**:
1. 图片上传路径配置错误
2. 临时目录 `/tmp/uploads/` 不存在
3. 文件写入权限问题

### 截图

- [首页](./screenshots/phase-1-scene3-home.png)
- [上传按钮](./screenshots/phase-1-scene3-upload-button.png)
- [文件选择](./screenshots/phase-1-scene3-file-selected.png)
- [错误提示](./screenshots/phase-1-scene3-error.png)

## 6. API 验证

| 端点 | 方法 | 状态码 | 响应时间 | 验证结果 |
|------|------|--------|---------|---------|
| GET /api/health | GET | 200 | 12ms | ✅ |
| POST /api/upload/image | POST | 500 | 1200ms | ❌ |

### API 请求详情

**请求**:
```bash
curl -X POST http://localhost:5173/api/upload/image \
  -F "file=@tests/fixtures/game-screenshot.png"
```

**响应** (500):
```json
{
  "error": "Failed to process image",
  "message": "ENOENT: no such file or directory..."
}
```

**预期响应** (200):
```json
{
  "success": true,
  "data": {
    "imageId": "img_12345",
    "recognized": ["骚当", "小李", "阿强"],
    "stats": {
      "骚当": { "points": 12, "rebounds": 3 }
    }
  }
}
```

## 7. 测试数据

**输入数据**:
- 文件: `tests/fixtures/game-screenshot.png`
- 大小: 2.3 MB
- 格式: PNG

**预期输出**:
```json
{
  "success": true,
  "data": {
    "imageId": "img_12345",
    "recognized": ["骚当", "小李", "阿强"]
  }
}
```

**实际输出**:
```json
{
  "error": "Failed to process image"
}
```

## 8. 清理工作

- [x] 关闭浏览器
- [x] 检查服务器日志
- [x] 记录错误信息

## 9. 修复建议

### 优先级: 🔴 高 (阻塞后续场景)

### 修复步骤:

1. **检查上传路径配置**
   ```typescript
   // src/config/upload.ts
   export const UPLOAD_DIR = '/tmp/uploads'  // 确保目录存在
   
   // 添加目录检查
   if (!fs.existsSync(UPLOAD_DIR)) {
     fs.mkdirSync(UPLOAD_DIR, { recursive: true })
   }
   ```

2. **添加错误处理**
   ```typescript
   try {
     await processImage(filePath)
   } catch (error) {
     logger.error('Image processing failed', error)
     return res.status(500).json({ 
       error: 'Failed to process image',
       details: error.message 
     })
   }
   ```

3. **验证文件权限**
   ```bash
   ls -la /tmp/uploads
   chmod 755 /tmp/uploads
   ```

### 测试验证:

修复后，重新运行此场景，确保:
- ✅ 图片上传成功
- ✅ API 返回 200
- ✅ 分析结果正确

## 10. 依赖关系

- **被依赖场景**: 
  - 场景 4: 上传视频分析（依赖此场景通过）
  - 场景 5: 更新球员数据（依赖此场景通过）
  
**影响**: 此场景失败会导致场景 4-5 被跳过

## 11. 备注

- 这是之前遇到的 500 错误问题
- 需要优先修复
- 修复后需要回归测试
```

---

## 测试执行脚本模板

### TypeScript 版本

```typescript
// tests/e2e/scenarios/scene-1-player-query.ts

import { browser } from 'openclaw-tools'
import { generateReport } from '../utils/report-generator'

export interface TestResult {
  scenario: number
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  duration: number
  steps: StepResult[]
  errors?: ErrorDetail[]
  screenshots: string[]
}

export interface StepResult {
  step: number
  name: string
  status: 'PASS' | 'FAIL'
  duration: number
  note?: string
}

export interface ErrorDetail {
  type: string
  message: string
  stack?: string
  apiEndpoint?: string
  statusCode?: number
}

/**
 * 场景 1: 查询球员信息
 */
export async function testPlayerQuery(): Promise<TestResult> {
  const result: TestResult = {
    scenario: 1,
    name: '查询球员信息',
    status: 'PASS',
    duration: 0,
    steps: [],
    screenshots: []
  }
  
  const startTime = Date.now()
  
  try {
    // 步骤 1: 打开首页
    const step1Start = Date.now()
    await browser({ action: 'open', url: 'http://localhost:5173' })
    const snapshot1 = await browser({ action: 'snapshot', refs: 'aria' })
    
    // 截图 1
    const screenshot1 = await browser({ action: 'screenshot', fullPage: true })
    result.screenshots.push(screenshot1)
    
    result.steps.push({
      step: 1,
      name: '打开首页',
      status: 'PASS',
      duration: Date.now() - step1Start,
      note: '页面正常加载'
    })
    
    // 步骤 2: 输入查询
    const step2Start = Date.now()
    const inputRef = findElementByRole(snapshot1, 'textbox')
    if (!inputRef) {
      throw new Error('未找到输入框')
    }
    
    await browser({
      action: 'act',
      request: { kind: 'type', ref: inputRef, text: '骚当' }
    })
    
    result.steps.push({
      step: 2,
      name: '输入查询',
      status: 'PASS',
      duration: Date.now() - step2Start,
      note: '输入成功'
    })
    
    // 步骤 3: 点击发送
    const step3Start = Date.now()
    const buttonRef = findElementByRole(snapshot1, 'button', '发送')
    if (!buttonRef) {
      throw new Error('未找到发送按钮')
    }
    
    await browser({
      action: 'act',
      request: { kind: 'click', ref: buttonRef }
    })
    
    result.steps.push({
      step: 3,
      name: '点击发送',
      status: 'PASS',
      duration: Date.now() - step3Start,
      note: '按钮可点击'
    })
    
    // 步骤 4: 等待响应
    const step4Start = Date.now()
    await browser({
      action: 'act',
      request: { kind: 'wait', timeMs: 3000 }
    })
    
    const responseSnapshot = await browser({ action: 'snapshot' })
    
    // 截图 2
    const screenshot2 = await browser({ action: 'screenshot', fullPage: true })
    result.screenshots.push(screenshot2)
    
    result.steps.push({
      step: 4,
      name: '等待响应',
      status: 'PASS',
      duration: Date.now() - step4Start,
      note: '响应及时'
    })
    
    // 步骤 5: 验证数据
    const step5Start = Date.now()
    if (!responseSnapshot.includes('骚当') || !responseSnapshot.includes('PG')) {
      throw new Error('未找到完整球员数据')
    }
    
    result.steps.push({
      step: 5,
      name: '验证数据',
      status: 'PASS',
      duration: Date.now() - step5Start,
      note: '数据完整'
    })
    
    result.status = 'PASS'
    
  } catch (error) {
    result.status = 'FAIL'
    result.errors = [{
      type: error.name,
      message: error.message,
      stack: error.stack
    }]
    
    // 失败时截图
    const errorScreenshot = await browser({ action: 'screenshot', fullPage: true })
    result.screenshots.push(errorScreenshot)
  }
  
  result.duration = Date.now() - startTime
  
  // 生成报告
  await generateReport(result)
  
  return result
}

/**
 * 辅助函数: 根据角色查找元素
 */
function findElementByRole(snapshot: string, role: string, name?: string): string | null {
  // 解析 snapshot，找到匹配的元素
  // 实现略，返回元素 ref
  return 'e12' // 示例
}
```

---

## 测试报告生成器

```typescript
// tests/e2e/utils/report-generator.ts

import { write } from 'openclaw-tools'
import { TestResult } from '../scenarios/scene-1-player-query'

export async function generateReport(result: TestResult): Promise<void> {
  const reportPath = `tests/e2e/reports/phase-${getPhase()}-scene-${result.scenario}-report.md`
  
  const report = `
# ${result.name} - E2E 测试报告

**场景编号**: ${result.scenario}
**测试时间**: ${new Date().toISOString()}
**测试状态**: ${result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⏭️ SKIP'}
**总耗时**: ${(result.duration / 1000).toFixed(2)} 秒

## 测试步骤

| 步骤 | 名称 | 状态 | 耗时 | 备注 |
|------|------|------|------|------|
${result.steps.map(s => `| ${s.step} | ${s.name} | ${s.status === 'PASS' ? '✅' : '❌'} | ${(s.duration / 1000).toFixed(2)}s | ${s.note || '-'} |`).join('\n')}

## 错误详情

${result.errors && result.errors.length > 0 ? `
${result.errors.map(e => `
### ${e.type}

**错误信息**: ${e.message}

\`\`\`
${e.stack || 'No stack trace'}
\`\`\`

${e.apiEndpoint ? `**API 端点**: ${e.apiEndpoint}` : ''}
${e.statusCode ? `**状态码**: ${e.statusCode}` : ''}
`).join('\n')}
` : '无错误'}

## 截图

${result.screenshots.map((s, i) => `- [截图 ${i + 1}](${s})`).join('\n')}

---

**生成时间**: ${new Date().toISOString()}
`.trim()
  
  await write(reportPath, report)
}

function getPhase(): number {
  // 从状态文件读取当前 Phase
  return 1 // 示例
}
```

---

## 批量测试运行器

```typescript
// tests/e2e/run-all.ts

import { testPlayerQuery } from './scenarios/scene-1-player-query'
import { testPlayerComparison } from './scenarios/scene-2-player-comparison'
import { testUploadImage } from './scenarios/scene-3-upload-image'
import { testUploadVideo } from './scenarios/scene-4-upload-video'
import { testUpdatePlayerData } from './scenarios/scene-5-update-data'
import { write } from 'openclaw-tools'

async function runAllTests() {
  console.log('=== E2E 测试开始 ===')
  
  const results = {
    total: 5,
    passed: 0,
    failed: 0,
    skipped: 0,
    scenarios: []
  }
  
  // 场景 1: 查询球员信息
  const result1 = await testPlayerQuery()
  results.scenarios.push(result1)
  if (result1.status === 'PASS') results.passed++
  else if (result1.status === 'FAIL') results.failed++
  else results.skipped++
  
  // 场景 2: 球员对比
  const result2 = await testPlayerComparison()
  results.scenarios.push(result2)
  if (result2.status === 'PASS') results.passed++
  else if (result2.status === 'FAIL') results.failed++
  else results.skipped++
  
  // 场景 3: 上传图片
  const result3 = await testUploadImage()
  results.scenarios.push(result3)
  if (result3.status === 'PASS') results.passed++
  else if (result3.status === 'FAIL') results.failed++
  else results.skipped++
  
  // 场景 4-5 依赖场景 3
  if (result3.status === 'PASS') {
    // 场景 4: 上传视频
    const result4 = await testUploadVideo()
    results.scenarios.push(result4)
    if (result4.status === 'PASS') results.passed++
    else if (result4.status === 'FAIL') results.failed++
    else results.skipped++
    
    // 场景 5: 更新数据
    const result5 = await testUpdatePlayerData()
    results.scenarios.push(result5)
    if (result5.status === 'PASS') results.passed++
    else if (result5.status === 'FAIL') results.failed++
    else results.skipped++
  } else {
    // 跳过场景 4-5
    results.skipped += 2
    console.log('⏭️ 场景 4-5 跳过（依赖场景 3）')
  }
  
  console.log('=== E2E 测试完成 ===')
  console.log(`总计: ${results.total}, 通过: ${results.passed}, 失败: ${results.failed}, 跳过: ${results.skipped}`)
  
  // 生成总报告
  await generateSummaryReport(results)
  
  // 更新状态文件
  await updateStateFile(results)
  
  return results
}

async function generateSummaryReport(results: any) {
  const report = `
# E2E 测试总报告 - Phase ${getPhase()}

**测试时间**: ${new Date().toISOString()}

## 测试结果摘要

| 指标 | 数量 |
|------|------|
| 总计 | ${results.total} |
| 通过 | ${results.passed} |
| 失败 | ${results.failed} |
| 跳过 | ${results.skipped} |
| 通过率 | ${((results.passed / results.total) * 100).toFixed(0)}% |

## 各场景结果

| 场景 | 名称 | 状态 | 耗时 | 报告 |
|------|------|------|------|------|
${results.scenarios.map(s => 
  `| ${s.scenario} | ${s.name} | ${s.status === 'PASS' ? '✅ PASS' : s.status === 'FAIL' ? '❌ FAIL' : '⏭️ SKIP'} | ${(s.duration / 1000).toFixed(2)}s | [详情](./phase-${getPhase()}-scene-${s.scenario}-report.md) |`
).join('\n')}

## 失败场景

${results.scenarios.filter(s => s.status === 'FAIL').map(s => `
### 场景 ${s.scenario}: ${s.name}

**错误**: ${s.errors[0]?.message}

**建议**: 查看详细报告进行修复
`).join('\n')}

---

**生成时间**: ${new Date().toISOString()}
`
  
  await write(`tests/e2e/reports/phase-${getPhase()}-summary.md`, report)
}

async function updateStateFile(results: any) {
  const statePath = '/Users/ppt/Projects/player-grouping/agent-dev-state.json'
  const state = await read(statePath)
  const stateObj = JSON.parse(state)
  
  stateObj.testAgent = {
    status: 'completed',
    completedAt: new Date().toISOString(),
    results: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: `${((results.passed / results.total) * 100).toFixed(0)}%`
    }
  }
  
  stateObj.readyForReview = true
  
  await write(statePath, JSON.stringify(stateObj, null, 2))
}

// 运行
runAllTests().catch(console.error)
```

---

## 使用说明

### 1. 创建新测试场景

```bash
# 1. 复制模板
cp tests/e2e/test-template.md tests/e2e/scenarios/scene-N-description.md

# 2. 编辑模板，填写具体内容

# 3. 实现测试脚本
touch tests/e2e/scenarios/scene-N-description.ts
```

### 2. 运行测试

```bash
# 运行单个场景
npx ts-node tests/e2e/scenarios/scene-1-player-query.ts

# 运行所有场景
npx ts-node tests/e2e/run-all.ts
```

### 3. 查看报告

```bash
# 查看总报告
cat tests/e2e/reports/phase-N-summary.md

# 查看详细报告
cat tests/e2e/reports/phase-N-scene-1-report.md
```

### 4. 测试 Agent 使用方式

```typescript
// 测试 Agent 主脚本
import { runAllTests } from './tests/e2e/run-all'

async function main() {
  // 1. 读取开发 Agent 状态
  const state = await read('/Users/ppt/Projects/player-grouping/agent-dev-state.json')
  
  if (!state.devAgent.readyForTesting) {
    throw new Error('开发 Agent 尚未完成')
  }
  
  // 2. 验证服务器运行
  await exec({ command: 'curl -s http://localhost:5173/api/health' })
  
  // 3. 运行所有测试
  const results = await runAllTests()
  
  // 4. 发送通知
  if (results.failed > 0) {
    await message({
      action: 'send',
      channel: 'feishu',
      target: 'ou_78a4033e2e70343e3c945ab93877ac18',
      message: `🔴 测试失败: ${results.failed}/${results.total}`
    })
  } else {
    await message({
      action: 'send',
      channel: 'feishu',
      target: 'ou_78a4033e2e70343e3c945ab93877ac18',
      message: `✅ 所有测试通过: ${results.passed}/${results.total}`
    })
  }
}

main()
```

---

**维护**: 随着项目进展，持续更新模板和示例。
