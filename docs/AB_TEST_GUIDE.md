# SQL Query Agent A/B 测试指南

本文档说明如何对 Legacy 和 Enhanced SQL Query Agent 进行对比测试。

## 📋 测试目的

对比两个版本的 SQL Query Agent 在以下方面的表现：
- **查询成功率** - 查询是否正确生成并返回数据
- **字段准确率** - 返回的字段是否与预期一致
- **JOIN 正确率** - 多表关联查询是否正确
- **响应时间** - 查询和响应的总时间
- **错误率** - 各种错误类型的比例

---

## 🚀 快速开始

### 方式 1: 使用环境变量切换（推荐）

```bash
# 1. 测试 Legacy 版本
USE_ENHANCED_SQL_AGENT=false npm run ab:test:legacy

# 2. 测试 Enhanced 版本
USE_ENHANCED_SQL_AGENT=true npm run ab:test:enhanced
```

### 方式 2: 直接修改 API 路由

```bash
# 1. 备份原始文件
cp api/chat.ts api/chat.ts.backup

# 2. 修改导入
# 将 api/chat.ts 中的导入从 enhanced-sql-query-agent 改为 enhanced

# 3. 恢复原始
mv api/chat.ts.backup api/chat.ts
```

---

## 📊 测试覆盖范围

### 测试分类

#### 1. 简单排名查询 (Simple Ranking)
- 综合评分最高的 N 个球员
- 投篮能力最好的球员
- 速度最快的球员

#### 2. 范围查询 (Range Query)
- 综合评分在特定范围的球员
- 多个技能都高于某阈值的球员

#### 3. 位置查询 (Position Query)
- 特定位置的球员（PG, SG, SF, PF, C）
- 多个位置组合

#### 4. 模糊搜索 (Fuzzy Search)
- 按姓名部分匹配
- 多个姓名 OR 查询

#### 5. JOIN 查询 (Join Query)
- 球员 + 技能数据
- 球员 + 比赛统计
- 最近 N 场比赛数据

#### 6. 对比查询 (Comparison)
- 比较多个球员的能力
- 特定位置的某个能力比较

#### 7. 错误处理测试 (Error Handling)
- 不存在的字段
- 无法聚合的查询
- 表白名单外的表

---

## 📈 运行测试

### 步骤 1: 配置环境变量

```bash
# 创建 .env.local 文件（如果不存在）
cp .env.example .env.local

# 编辑 .env.local，确保有以下配置：
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - GEMINI_API_KEY
```

### 步骤 2: 运行 Legacy 版本测试

```bash
# 清除之前的测试报告
rm -f ab-test-report.json

# 运行 Legacy 版本 A/B 测试
npm run ab:test:legacy
```

**输出**：
- 彩色的测试过程日志
- 测试结果统计
- 详细的 `ab-test-report.json` 文件

### 步骤 3: 运行 Enhanced 版本测试

```bash
# 运行 Enhanced 版本 A/B 测试
npm run ab:test:enhanced
```

### 步骤 4: 查看测试报告

测试完成后，查看 `ab-test-report.json` 文件：

```bash
# 查看完整报告
cat ab-test-report.json

# 查看统计数据
cat ab-test-report.json | grep -A 1 "summary" | head -30

# 查看详细信息
cat ab-test-report.json | grep "details" | head -50
```

---

## 📊 测试报告说明

测试报告包含以下信息：

### 整体统计

```json
{
  "timestamp": "2024-XX-XXTXX:XX:XX:XXZ",
  "summary": {
    "legacy": {
      "success": 15,
      "total": 25,
      "successRate": 60,
      "avgResponseTime": 2150
    },
    "enhanced": {
      "success": 22,
      "total": 25,
      "successRate": 88,
      "avgResponseTime": 1680
    }
  },
  "improvement": {
    "successRate": "+28",
    "timeImprovement": "-21.8%"
  }
}
```

### 分类详细统计

按以下分类对比两个版本的表现：

| 分类 | Legacy 成功率 | Enhanced 成功率 | 改进 |
|--------|--------------|-----------------|------|
| simple-ranking | 80% | 92% | +12% |
| range-query | 70% | 90% | +20% |
| position-query | 85% | 95% | +10% |
| fuzzy-search | 75% | 85% | +10% |
| join-query | 60% | 90% | +30% |
| comparison | 65% | 85% | +20% |
| invalid-query | 0% (fail) | 5% (better error) | N/A |

### 每个测试用例的详细结果

```json
{
  "testCases": [
    {
      "question": "谁是投篮最厉害的球员？",
      "category": "simple-ranking",
      "expectedColumns": ["two_point_shot"],
      "legacy": {
        "success": false,
        "error": "字段名错误",
        "responseTime": 850,
        "hasExpectedColumns": false
      },
      "enhanced": {
        "success": true,
        "hasExpectedColumns": true,
        "responseTime": 620,
        "rowCount": 1
      }
    },
    // ... 其他测试用例
  ]
}
```

---

## 🔍 性能指标解读

### 成功率

```
successRate = (成功查询数 / 总查询数) * 100%

成功标准：
- success: true 且返回了数据
- success: true 且 expectedColumns/filters 都匹配
```

### 响应时间

```
avgResponseTime = 所有查询响应时间的平均数

判断标准：
- < 1000ms: 优秀
- 1000-2000ms: 良好
- 2000-3000ms: 一般
- > 3000ms: 需要优化
```

### 字段准确率

```
columnAccuracy = (包含预期字段的查询数 / 总查询数) * 100

判断标准：
- > 90%: 优秀
- 80-90%: 良好
- < 80%: 需要优化
```

---

## 📝 决策建议

### 如果 Enhanced 版本表现更好

1. **替换原版本**
   ```bash
   # 备份原文件
   cp api/chat.ts api/chat.ts.backup

   # 删除原文件
   rm api/chat.ts

   # 重命名新文件
   mv api/chat-ab-test.ts api/chat.ts
   ```

2. **更新 package.json**
   ```json
   {
     "scripts": {
       "ab:test": "tsx scripts/ab-test-sql-agent.ts"
     }
   }
   ```

3. **部署测试**
   - 在生产环境使用增强版 Agent 几天
   - 监控错误率和响应时间
   - 根据实际情况调整 Prompt

### 如果 Legacy 版本表现更好

1. **检查 Prompt 问题**
   - Enhanced 版本的 Prompt 是否有问题
   - Schema 定义是否正确
   - Few-Shot 示例是否误导

2. **回退到原版本**
   - 保持原版本作为主版本
   - 保留 Enhanced 版本作为备用
   - 继续优化 Prompt 和 Schema

3. **混合使用**
   - 简单查询用 Enhanced
   - 复杂查询先用 Legacy 验证，再用 Enhanced

---

## 🎯 持续优化

测试完成后，可以根据结果继续优化：

### 1. Prompt 优化

如果某些类别成功率低：
- 添加更多 Few-Shot 示例
- 调整 Prompt 中的强调程度
- 简化查询模式描述

### 2. Schema 扩展

如果字段经常出错：
- 在 `database-schema.ts` 中添加更详细的描述
- 添加字段使用示例
- 标注常见错误

### 3. AI 模型调优

如果响应时间太长：
- 降低 `temperature`（当前是 0.2）
- 减少 `maxOutputTokens`（当前是 2048）
- 尝试更快的模型（gemini-3-flash-preview）

---

## 🔧 故障排查

### 测试脚本无法运行

```bash
# 检查 Node.js 版本（需要 16+）
node --version

# 检查 TypeScript
npm run build

# 检查环境变量是否正确
echo $USE_ENHANCED_SQL_AGENT
```

### 测试超时或失败

```bash
# 增加超时时间（修改脚本）
# 或减少测试用例数量

# 检查网络连接
curl -I https://saeplsevqechdnlkwjyz.supabase.co
```

### 查询总是失败

1. **检查数据库连接**
   ```bash
   curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
        "https://saeplsevqechdnlkwjyz.supabase.co/rest/v1/players?select=id"
   ```

2. **查看详细日志**
   测试脚本会输出详细的测试过程日志

3. **手动测试查询**
   ```bash

---

## 📚 相关文件

```
scripts/
└── ab-test-sql-agent.ts          # A/B 测试脚本

api/
├── chat.ts                      # 原 API 路由
└── chat-ab-test.ts              # 支持 A/B 测试的版本

src/lib/sql-agent/
├── database-schema.ts           # 数据库结构定义
├── prompt-templates.ts           # Prompt 模板
├── enhanced-sql-query-agent.ts  # 增强的 Query Agent
└── sql-query-agent.ts             # 原始 Query Agent
```

---

## 🚀 开始测试

准备好后，运行以下命令开始 A/B 测试：

```bash
# 1. Legacy 版本测试
npm run ab:test:legacy

# 2. Enhanced 版本测试
npm run ab:test:enhanced

# 3. 查看报告
cat ab-test-report.json
```
