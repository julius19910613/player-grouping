# 设计文档归档

> 本文件整合了项目历史设计文档的核心内容。归档日期：2026-03-20

## 目录

1. [项目概述](#1-项目概述)
2. [产品路线图](#2-产品路线图)
3. [功能设计](#3-功能设计)
4. [数据库架构](#4-数据库架构)
5. [文档结构规范](#5-文档结构规范)
6. [Chat/AI 设计决策](#6-chatai-设计决策)
7. [原始文档索引](#7-原始文档索引)

---

## 1. 项目概述

**球员分组程序** - 篮球球员分组 Web 应用。技术栈：React 19 + TypeScript + Vite + Vitest + Supabase。

- **路由**：`/` 聊天、`/players` 球员管理、`/grouping` 分组
- **数据**：Supabase 主存储，Repository 模式抽象
- **分组算法**：能力平衡、位置平衡、随机策略

---

## 2. 产品路线图

### v1.0 - 基础版本 ✅
球员管理、19 项能力评分、分组策略、本地/云存储、导入导出。

### v1.1 - 篮球专业化 ✅
篮球位置 (PG/SG/SF/PF/C/UTILITY)、19 项篮球能力、编辑球员、雷达图。

### v1.2 - 分组增强
3v3/5v5 多赛制、智能分组、分组预设、拖拽调整。

### v1.3 - 比赛管理
比赛日程、比赛记录、球员统计、历史分析。

### v2.0 - 团队协作
多用户、团队/俱乐部管理、活动管理、移动应用。

---

## 3. 功能设计

### 篮球位置系统
PG(控卫)、SG(分卫)、SF(小前)、PF(大前)、C(中锋)、UTILITY(通用)。位置权重用于 overall 计算。

### 篮球能力 (19 项，1-99)
投篮：two_point_shot, three_point_shot, free_throw  
组织：passing, ball_control, court_vision  
防守：perimeter_defense, interior_defense, steals, blocks  
篮板：offensive_rebound, defensive_rebound  
身体：speed, strength, stamina, vertical  
智商：basketball_iq, teamwork, clutch  

### 分组算法类型
- **Balanced**：贪心，按能力分配到总实力最低队
- **Position Balanced**：按位置轮流分配
- **Random**：随机分配
- **Smart**（规划）：遗传算法/模拟退火，多维度评估

---

## 4. 数据库架构

### 当前方案
- **主存储**：Supabase（players 强制）
- **可选**：SQLite/IndexedDB 本地 fallback（grouping、matches）

### 表结构
- `players`：id, user_id, name, position, created_at, updated_at
- `player_skills`：19 项技能 + overall（position-weighted）
- `grouping_history`：mode, team_count, balance_score, data(JSON)
- `matches`：date, venue, mode, teams, result
- `player_match_stats`、`skill_adjustments`、`player_videos`

### 迁移
LocalStorage → IndexedDB 备份 → SQLite/Supabase。回滚：`src/migration/rollback.ts`。

---

## 5. 文档结构规范

| 类型 | 命名 | 位置 |
|------|------|------|
| 主文档 | README, CLAUDE, DEPLOYMENT | 根 / docs/ |
| 设计 | design-*.md | design/ |
| 任务 | phaseN-*.md | docs/ |
| 测试 | test-results-*.md | docs/ |
| 归档 | [日期]-[主题].md | docs.archive/ |

---

## 6. Chat/AI 设计决策

### 技术选型
- **AI API**：Vercel Serverless 代理 Gemini API（$0/月）
- **Web Search**：Brave Search API（2000 次/月免费）
- **Chat UI**：自建 + shadcn/ui

### SQL Agent
- 自然语言 → Supabase 查询
- 表白名单、仅 SELECT、最多 100 行
- 集成于 `/api/chat.ts`

---

## 7. 原始文档索引

以下文档已归档，核心内容已合并到本文档：

| 原路径 | 说明 |
|--------|------|
| design/ROADMAP.md | 产品路线图 |
| design/FEATURES.md | 功能详细设计 |
| design/IMPLEMENTATION.md | 实现计划 |
| design/EXECUTION_PLAN.md | 执行计划 |
| design/SQLITE_MIGRATION*.md | SQLite 迁移设计 |
| docs/DATABASE.md | 数据库架构 |
| docs/STRUCTURE.md | 文档结构规范 |
| docs/chatbot-design-summary.md | Chat 设计总结 |
| docs/chatbot-architecture.md | Chat 架构 |
| docs/tech-selection.md | 技术选型 |
| docs/implementation-plan.md | 实施计划 |
| docs/phase*-*.md | Phase 任务与完成报告 |
| docs/test-results-*.md | 测试结果 |
| docs/design-*.md | 设计评审 |
| PROJECT_SUMMARY.md | 项目总结 |
| PHASE3_COMPLETE.md | Phase 3 完成 |

**保留的主文档**：README.md, CLAUDE.md, docs/DEPLOYMENT.md, docs/quick-start-guide.md, docs/deployment-checklist.md, docs/VERCEL_SUPABASE_401_FIX.md, docs/CHAT_USER_GUIDE.md, docs/CHAT_DEVELOPER_GUIDE.md, docs/CHAT_API_REFERENCE.md, docs/chatbot-user-guide.md
