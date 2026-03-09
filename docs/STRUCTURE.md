# 文档结构指南

## 📚 目的

本文档定义项目文档的组织结构、命名规范和存放规则，确保文档清晰、易于维护。

---

## 📂 当前文档分析

### 文件统计

- **docs/** 目录文件数**：约 150+ 个
- **docs.wip/** 目录文件数**：约 80+ 个
- **文档类型分布**：任务文档、设计文档、测试文档、状态记录

### 主要问题

1. **过度分散**：任务记录和设计文档混杂在同一目录
2. **命名不规范**：难以区分文档类型和所属模块
3. **缺乏归档**：完成的 Sprint 文档未及时归档
4. **临时文件累积**：大量草稿和讨论文档未清理

---

## 📂 文档分类规则

### 一、文档类型定义

| 类型 | 说明 | 命名规范 | 存放位置 | 维护者 |
|------|------|----------|-----------|--------|----------|
| **主文档** | 项目说明、功能介绍 | `[名称].md` | `docs/` | 项目负责人 |
| **设计文档** | 架构设计、技术决策 | `design-[模块]-[类型].md` | `docs.wip/design/` | 设计负责人 |
| **任务文档** | Sprint 开发任务 | `phase[编号]-[任务类型].md` | `docs.wip/phase*` | Sprint Lead |
| **测试文档** | 测试计划和结果 | `test-results-[phase]-[类型].md` | `docs.wip/test-results/` | QA Leader |
| **状态记录** | JSON 状态文件 | `[功能]-state.json` | 项目负责人 |
| **归档文档** | 历史设计/任务记录 | `[日期]-[主题].md` | 架构 Lead |
| **AI 文档** | AI 功能设计 | `ai-[功能]-[类型].md` | AI 团队 |
| **API 文档** | API 接口文档 | `api-[服务]-[类型].md` | 后端 Leader |
| **参考文档** | 设计参考、术语 | `[名称]-REFERENCE.md` | 设计团队 |
| **模板文档** | 文档创建模板 | `*-template.md` | 架构 Lead |
| **贡献指南** | 贡献者指南 | `CONTRIBUTING.md` | 项目负责人 |

### 二、文档命名规范

#### 主文档（docs/）
```
README.md                    # 项目说明
PROJECT_SUMMARY.md            # 项目总结
CLAUDE.md                    # Claude Code 使用指南
DESIGN_REFERENCE.md          # 设计参考
CHANGELOG.md                 # 版本更新记录
DEPLOYMENT.md               # 部署指南
CONTRIBUTING.md            # 贡献指南
```

#### 设计文档（docs.wip/）
```
design/                     # 设计进行中的文档
├── ROADMAP.md               # 产品路线图
├── FEATURES.md              # 功能设计
├── IMPLEMENTATION.md          # 实现计划
└── EXECUTION.md             # 执行计划
```

#### 任务文档（docs.wip/）
```
phase1-dev-task.md
phase2-dev-task.md
phase3-dev-task.md
...
```

**命名格式**：
- **Sprint 文档**：`phase[编号]-[任务类型].md`
  - 示例：`phase1-dev-task.md`
  - 编号规则：Q1, Q2, Q3, Q4 对应 Phase 1-4

- **设计文档**：`design-[模块]-[类型].md`
  - 示例：`design-ai-architecture.md`
  - 类型：architecture, features, implementation, execution

- **测试文档**：`test-results-[phase]-[类型].md`
  - 示例：`test-results-phase1-summary.md`
  - 类型：summary, report, checklist, plan

#### 归档文档（docs.archive/）
```
docs.archive/
├── templates/              # 文档模板
└── [年份]-[主题]/       # 按年份和主题归档
    ├── 2025-Q1/         # 2025 年 Q1 归档
    ├── 2025-Q2/         # 2025 年 Q2 归档
    └── ...
```

### 三、文档生命周期

```
创建 → 审查 → 批准 → 实施 → 完成 → 归档
  ↓        ↓       ↓      ↓       ↓
(draft)  (review) (approved) (in-progress) (completed) (archived)
```

---

## 📂 非主功能文档处理规则

### 规则定义

以下文档**不属于主功能的核心代码文档**，需要特殊处理：

1. **docs.wip/ 中的所有 Sprint 任务文档** - 在对应阶段完成后必须归档
2. **所有测试报告文档** - 应使用标准模板格式
3. **临时讨论或笔记** - 不应直接存放在 `docs/` 或 `docs.wip/` 下
4. **项目状态 JSON 文件** - 可保留，但需在 `.gitignore` 中标记
5. **菜单截图和临时文件** - 应删除或移出项目目录

### 判断标准

| 文件路径 | 是否属于主要功能 | 处理方式 |
|-----------|-----------------------------|----------|
| `docs/phase*.md` | ❌ 否 | 重新命名或归档 |
| `docs.wip/design/*.md` | ❌ 否 | 归档或重构为正式文档 |
| `docs.wip/data-management-*.md` | ❌ 否 | 归档或整合到设计文档 |
| `docs.wip/ui-redesign-*.md` | ❌ 否 | 归档或整合到设计文档 |
| `docs.wip/sap-fiori-*.md` | ❌ 否 | 归档或整合到设计文档 |
| `docs/chatbot-*.md` | ❌ 否 | 归档为 AI 功能文档 |
| `docs/DEPLOYMENT.md` | ✅ 是 | 保留 |
| `docs/VERCEL_SUPABASE_401_FIX.md` | ✅ 是 | 保留（故障修复文档） |
| `docs/CLAUDE.md` | ✅ 是 | 保留 |
| `docs/PROJECT_SUMMARY.md` | ✅ 是 | 保留 |
| `docs/DATABASE.md` | ✅ 是 | 保留 |
| `README.md` | ✅ 是 | 保留 |
| `src/` 目录 | ✅ 是 | 主代码目录 |
| `*.state.json` | ✅ 是 | 状态记录文件 |
| `menu-*.png/json` | ❌ 否 | 删除或移出 |
| `ui-verification.png` | ❌ 否 | 删除或移出 |
| `.claude/` 目录 | ⚠️ | Claude 配置，需要评估 |

### 重命名建议

| 当前名称 | 建议新名称 | 原因 |
|---------|------------|--------|------|
| `phase1-dev-task.md` | `docs.wip/tasks/2025-Q1-phase1-dev-task.md` | 移到归档目录 |
| `phase2-dev-task.md` | `docs.wip/tasks/2025-Q2-phase2-dev-task.md` | 移到归档目录 |
| `test-reports-phase1.md` | `docs.archive/test/phase1-summary.md` | 移到归档目录 |
| `test-reports-phase2.md` | `docs.archive/test/phase2-summary.md` | 移到归档目录 |
| `chatbot-architecture.md` | `docs.archive/ai/chatbot-architecture.md` | 移到归档目录 |
| `chatbot-dev-guide.md` | `docs.archive/ai/chatbot-dev-guide.md` | 移到归档目录 |

---

## 📂 整理行动计划

### 阶段一：创建归档目录和模板

1. ✅ 创建归档目录结构
2. ✅ 创建文档模板文件
3. ✅ 更新 STRUCTURE.md（本文档）

### 阶段二：整理和分类现有文档

1. **移动 AI 功能设计文档到归档**
   ```bash
   mkdir -p docs.archive/ai/
   mv docs/chatbot-architecture.md docs.archive/ai/
   mv docs/chatbot-design-summary.md docs.archive/ai/
   mv docs/chatbot-integration-task.md docs.archive/ai/
   ```

2. **移动数据管理设计文档到归档**
   ```bash
   mkdir -p docs.archive/design/
   mv docs.wip/data-management-*.md docs.archive/design/
   ```

3. **移动 UI 重新设计文档到归档**
   ```bash
   mkdir -p docs.archive/ui/
   mv docs.wip/ui-redesign-*.md docs.archive/ui/
   mv docs.wip/sap-fiori-*.md docs.archive/ui/
   ```

4. **移动 Sprint 任务文档到归档**
   ```bash
   mkdir -p docs.archive/tasks/2025-Q1/
   mv docs.wip/phase*.md docs.archive/tasks/2025-Q1/
   ```

5. **移动测试文档到归档**
   ```bash
   mkdir -p docs.archive/test/
   mv docs.wip/test-results-*.md docs.archive/test/
   ```

### 阶段三：清理 docs.wip/ 和临时文件

1. **检查并删除临时截图和文件**
   ```bash
   rm -f menu-*.png
   rm -f menu-functionality-test.json
   ```

2. **清理过时的单功能测试文档**
   - 删除不符合规范的测试文档

### 阶段四：更新主文档索引

在 `docs/STRUCTURE.md` 中添加各归档文档的链接

---

## 📂 .gitignore 配置

### 推荐的 .gitignore 规则

```gitignore
# 文档忽略规则
docs.wip/
docs.archive/
*.state.json

# 临时和测试文件
menu-*.png
menu-functionality-test.json
ui-verification.png
```

### 说明

1. **docs.wip/****：进行中的文档，使用通配符忽略
2. **docs.archive/****：已归档的文档，避免历史记录污染
3. ***.state.json**：状态记录文件，通常不需要版本控制
4. **菜单截图和测试文件**：临时文件，不应提交

---

## 📝 后续使用指南

### 创建新文档

1. **确定文档类型**
   - 主文档 → 项目根目录
   - 设计文档 → `docs.wip/design/`（进行中）或 `docs.archive/design/`（已完成）
   - 任务文档 → `docs.wip/phase*/`（进行中）或 `docs.archive/tasks/`（已完成）
   - 测试文档 → `docs.wip/test-results/` 或 `docs.archive/test/`

2. **使用模板**
   - 从 `docs.archive/templates/` 复制模板
   - 根据类型选择对应模板
   - 替换模板变量

3. **遵循命名规范**
   - 文件名使用清晰的类型前缀
   - 使用连字符分隔（使用 `-` 而非 `_`）
   - 避免中文在文件名中，或使用英文类型前缀

4. **完成后更新索引**
   - 在主文档中添加新文档链接

5. **完成后归档**
   - 将文档从 `docs.wip/` 移动到 `docs.archive/`
   - 更新文档状态标记

---

## 📚 参考资源

- [Markdown 最佳实践](https://www.markdownguide.org/)
- [技术文档写作指南](https://diata.org/)
- [项目文档组织](https://www.writethedocs.org/)

---

**更新日期**：2026-03-09
