# Basketball Agent 重构设计文档

**项目**: player-grouping  
**创建时间**: 2026-03-09  
**预计工期**: 8 个 Phase，总计约 8 小时（每个 Phase 45-60 分钟）  
**目标**: 将现有聊天助手升级为功能完整的 Basketball Agent，支持多模态分析和数据库查询

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 架构设计](#2-架构设计)
- [3. 工具定义](#3-工具定义)
- [4. Phase 规划](#4-phase-规划)
- [5. 验收标准](#5-验收标准)
- [6. 风险评估](#6-风险评估)
- [7. 技术参考](#7-技术参考)

---

## 1. 项目概述

### 1.1 背景

当前 player-grouping 项目已有基础的 AI 聊天功能，但功能单一，仅支持：
- ✅ 查询球员基本信息（`get_player_stats`）
- ✅ 联网搜索篮球信息（`search_web` - Brave Search API）
- ✅ 简单的球员分组（`calculate_grouping`）

### 1.2 重构目标

将聊天助手升级为 **Basketball Agent**，具备以下能力：

#### 1.2.1 数据库查询 Agent（增强）
- ✅ 查询球员信息（已有，需优化）
- 🆕 查询比赛历史
- 🆕 球员对比分析
- 🆕 比赛表现分析

#### 1.2.2 多模态分析 Agent（新增）
- 🆕 上传图片分析球员表现（动作、姿势、技巧）
- 🆕 上传视频分析比赛片段（战术、配合、个人表现）
- 🆕 上传文档分析比赛报告（PDF、Word、Excel）
- 🆕 根据分析结果更新后台数据

#### 1.2.3 移除联网搜索
- ❌ 删除 `search_web` 工具
- ❌ 删除 Brave Search API 依赖
- **原因**: 专注于私有数据分析和多模态处理，减少外部依赖

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (React)                         │
├─────────────────────────────────────────────────────────┤
│  ChatView  │  FileUploader  │  AnalysisResultDisplay    │
│  (已有)    │  (新增)         │  (新增)                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                后端 API (Vercel Functions)              │
├─────────────────────────────────────────────────────────┤
│  /api/chat.ts  (核心 Agent 入口)                        │
│  ├─ Function Calling 路由                               │
│  └─ 多模态内容处理                                       │
│                                                          │
│  /api/upload.ts  (文件上传 - 新增)                      │
│  └─ 处理图片、视频、文档上传                             │
│                                                          │
│  /api/analyze-media.ts  (多模态分析 - 新增)             │
│  └─ 调用 Gemini Vision/Video API                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  存储 & AI 服务                          │
├─────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)     │  Gemini API               │
│  ├─ players                │  ├─ gemini-2.5-flash      │
│  ├─ player_skills          │  ├─ Vision API            │
│  ├─ matches (新增)         │  └─ Video Understanding   │
│  ├─ player_stats (新增)    │                           │
│  └─ media_uploads (新增)   │  Vercel Blob (新增)       │
│                            │  └─ 大文件存储             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 前端架构

#### 2.2.1 新增组件

```
src/components/
├── chat/
│   ├── ChatView.tsx            (已有，需修改)
│   ├── ChatInput.tsx           (已有，需支持文件上传)
│   ├── ChatMessage.tsx         (已有，需支持富媒体显示)
│   ├── FileUploader.tsx        (新增)
│   ├── FilePreview.tsx         (新增)
│   ├── AnalysisProgress.tsx    (新增)
│   └── AnalysisResult.tsx      (新增)
```

#### 2.2.2 状态管理

使用 React Context + Hooks 管理全局状态：

```typescript
// src/contexts/AgentContext.tsx
interface AgentState {
  // 当前上传的文件
  currentFile: File | null;
  uploadProgress: number;
  
  // 分析结果
  analysisResult: AnalysisResult | null;
  analysisStatus: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';
  
  // 会话历史
  messages: Message[];
  isLoading: boolean;
}

// Actions
type AgentAction =
  | { type: 'UPLOAD_START'; payload: { file: File } }
  | { type: 'UPLOAD_PROGRESS'; payload: { progress: number } }
  | { type: 'UPLOAD_SUCCESS'; payload: { fileId: string; url: string } }
  | { type: 'ANALYSIS_START' }
  | { type: 'ANALYSIS_SUCCESS'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: { error: string } }
  | { type: 'SEND_MESSAGE'; payload: { message: string } }
  | { type: 'RECEIVE_MESSAGE'; payload: { message: string } };
```

### 2.3 后端架构

#### 2.3.1 API 端点设计

**主入口: `/api/chat.ts`** (修改现有文件)

```typescript
// Function Calling 工具定义
const tools: FunctionDeclaration[] = [
  // 数据库查询工具
  { name: "get_player_stats", ... },
  { name: "get_match_history", ... },      // 新增
  { name: "compare_players", ... },        // 新增
  { name: "analyze_match_performance", ... }, // 新增
  
  // 移除联网搜索
  // { name: "search_web", ... }, // 已删除
  
  // 分组工具
  { name: "calculate_grouping", ... },
];
```

**文件上传: `/api/upload.ts`** (新增)

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 验证文件类型（图片/视频/文档）
  // 2. 验证文件大小（图片 10MB，视频 100MB，文档 20MB）
  // 3. 上传到 Vercel Blob Storage
  // 4. 返回文件 URL 和 fileId
  // 5. 记录到 Supabase media_uploads 表
}
```

**多模态分析: `/api/analyze-media.ts`** (新增)

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { fileUrl, fileType, prompt } = req.body;
  
  // 1. 根据文件类型选择分析策略
  //    - 图片: Gemini Vision API
  //    - 视频: Gemini Video Understanding API
  //    - 文档: Gemini Document API
  
  // 2. 调用 Gemini API 分析
  // 3. 提取结构化数据
  // 4. 可选：更新到数据库
  // 5. 返回分析结果
}
```

### 2.4 数据库设计

#### 2.4.1 新增表结构

**matches 表（比赛历史）**

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  venue TEXT,
  mode TEXT CHECK (mode IN ('5v5', '3v3', 'custom')),
  
  -- 分组信息（JSON）
  teams JSONB NOT NULL,
  -- { "team1": ["player1", "player2"], "team2": ["player3", "player4"] }
  
  -- 比赛结果
  result JSONB,
  -- { "team1_score": 21, "team2_score": 18, "winner": "team1" }
  
  -- 备注
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**player_match_stats 表（球员比赛数据）**

```sql
CREATE TABLE player_match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- 基础数据
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  
  -- 高级数据
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  
  -- 效率值
  efficiency_rating REAL DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(match_id, player_id)
);
```

**media_uploads 表（上传文件记录）**

```sql
CREATE TABLE media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,  -- 匿名用户 ID
  
  -- 文件信息
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'video', 'document')),
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,  -- Vercel Blob URL
  
  -- 分析状态
  analysis_status TEXT CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_result JSONB,
  
  -- 关联数据
  related_match_id UUID REFERENCES matches(id),
  related_player_id UUID REFERENCES players(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.5 存储方案

#### 2.5.1 Vercel Blob Storage

**为什么选择 Vercel Blob？**
- ✅ 与 Vercel Functions 无缝集成
- ✅ 支持大文件（最大 500MB）
- ✅ CDN 加速
- ✅ 无需额外配置

**配置方法**（参考：[Vercel Blob 官方文档](https://vercel.com/docs/storage/vercel-blob)）

```bash
# 1. 安装依赖
npm install @vercel/blob

# 2. 配置环境变量（.env.local）
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# 3. 使用示例
import { put } from '@vercel/blob';

const blob = await put('videos/match-001.mp4', file, {
  access: 'public',
  addRandomSuffix: true,
});
```

---

## 3. 工具定义

### 3.1 数据库查询工具

#### 3.1.1 get_player_stats（优化现有）

**功能**: 查询单个球员的详细信息和技能数据

**输入参数**:
```typescript
{
  player_name: string;  // 球员姓名（支持模糊匹配）
  include_history?: boolean;  // 是否包含比赛历史（默认 false）
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "name": "张三",
    "position": "后卫",
    "skills": {
      "three_point_shot": 85,
      "passing": 90,
      "speed": 88
    },
    "recent_matches": [
      {
        "date": "2026-03-08",
        "points": 12,
        "rebounds": 5,
        "assists": 8
      }
    ]
  }
}
```

**实现变更**:
- ✅ 支持查询关联的比赛数据（JOIN player_match_stats）
- ✅ 返回最近 5 场比赛统计

---

#### 3.1.2 get_match_history（新增）

**功能**: 查询比赛历史记录

**输入参数**:
```typescript
{
  player_name?: string;  // 可选：筛选特定球员
  date_from?: string;    // 可选：起始日期（YYYY-MM-DD）
  date_to?: string;      // 可选：结束日期（YYYY-MM-DD）
  limit?: number;        // 返回数量（默认 10，最大 50）
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "total": 23,
    "matches": [
      {
        "date": "2026-03-08",
        "mode": "5v5",
        "teams": {
          "team1": ["张三", "李四", "王五", "赵六", "孙七"],
          "team2": ["周八", "吴九", "郑十", "钱一", "陈二"]
        },
        "result": {
          "team1_score": 21,
          "team2_score": 18,
          "winner": "team1"
        }
      }
    ]
  }
}
```

**SQL 实现**:
```sql
SELECT 
  m.id, m.date, m.mode, m.teams, m.result, m.notes
FROM matches m
WHERE 
  ($player_name IS NULL OR m.teams::text LIKE '%' || $player_name || '%')
  AND ($date_from IS NULL OR m.date >= $date_from)
  AND ($date_to IS NULL OR m.date <= $date_to)
ORDER BY m.date DESC
LIMIT $limit;
```

---

#### 3.1.3 compare_players（新增）

**功能**: 对比多个球员的能力和比赛数据

**输入参数**:
```typescript
{
  player_names: string[];  // 球员姓名列表（2-5 个）
  criteria?: ('skills' | 'stats' | 'all')[];  // 对比维度（默认 all）
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "players": [
      {
        "name": "张三",
        "skills": {
          "shooting": 85,
          "passing": 90,
          "defense": 75
        },
        "avg_stats": {
          "points": 15.3,
          "rebounds": 4.2,
          "assists": 6.8
        }
      }
    ],
    "comparison": {
      "best_shooter": "李四",
      "best_passer": "张三",
      "best_defender": "王五"
    }
  }
}
```

**实现逻辑**:
```sql
-- 1. 查询技能数据
SELECT player_id, * FROM player_skills WHERE player_id IN (...);

-- 2. 查询比赛数据
SELECT 
  player_id,
  AVG(points) as avg_points,
  AVG(rebounds) as avg_rebounds,
  AVG(assists) as avg_assists
FROM player_match_stats
WHERE player_id IN (...)
GROUP BY player_id;
```

---

#### 3.1.4 analyze_match_performance（新增）

**功能**: 分析单场比赛的整体表现或特定球员表现

**输入参数**:
```typescript
{
  match_id?: string;      // 比赛ID
  match_date?: string;    // 或通过日期查询
  player_name?: string;   // 可选：聚焦特定球员
  analysis_type: 'overview' | 'individual' | 'team_comparison';
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "match_info": {
      "date": "2026-03-08",
      "mode": "5v5",
      "result": "team1 胜"
    },
    "analysis": {
      "team1_strength": "外线投射能力强，快攻得分占 40%",
      "team2_weakness": "内线防守薄弱，篮板球劣势明显",
      "mvp": "张三（21分 8篮板 10助攻）",
      "key_moments": [
        "第 15 分钟：张三连续命中 3 记三分球",
        "第 32 分钟：李四关键抢断反击得分"
      ]
    },
    "recommendations": [
      "team2 应加强内线防守训练",
      "张三可作为组织核心培养"
    ]
  }
}
```

**实现逻辑**:
- 查询 `player_match_stats` 获取数据
- 使用 Gemini 生成分析文本

---

### 3.2 多模态分析工具

#### 3.2.1 analyze_image（新增）

**功能**: 分析上传的篮球相关图片

**输入参数**:
```typescript
{
  image_url: string;     // 图片 URL（Vercel Blob）
  analysis_type: 'shooting_form' | 'defense_posture' | 'team_tactics' | 'auto';
  prompt?: string;       // 自定义提示词
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "analysis_type": "shooting_form",
    "summary": "投篮姿势分析：整体动作流畅，但出手点偏低",
    "details": {
      "strengths": [
        "核心稳定性好，身体平衡",
        "follow-through 动作完整"
      ],
      "improvements": [
        "出手点建议提高至额头正上方",
        "左手辅助手角度可优化"
      ],
      "score": 7.5
    },
    "visual_annotations": {
      "key_points": ["右手手腕", "左手位置", "膝盖弯曲角度"],
      "suggestions_overlay_url": "https://..."
    }
  }
}
```

**技术实现**:
- 使用 Gemini Vision API（`gemini-2.5-flash`）
- 支持 `media_resolution: "high"` 获取细节
- 返回结构化数据 + 可视化标注

---

#### 3.2.2 analyze_video（新增）

**功能**: 分析上传的比赛视频片段

**输入参数**:
```typescript
{
  video_url: string;     // 视频 URL（Vercel Blob）
  analysis_type: 'full_game' | 'highlights' | 'individual' | 'tactics';
  target_player?: string;  // 聚焦特定球员
  time_range?: {         // 分析时间段
    start: number;       // 秒
    end: number;
  };
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "analysis_type": "highlights",
    "duration": "00:03:45",
    "summary": "视频包含 12 个精彩回合，张三表现最佳",
    "key_events": [
      {
        "timestamp": "00:01:23",
        "event": "快攻得分",
        "player": "张三",
        "description": "抢断后一条龙上篮"
      },
      {
        "timestamp": "00:02:45",
        "event": "三分球",
        "player": "李四",
        "description": "接球后干拔三分命中"
      }
    ],
    "player_highlights": {
      "张三": {
        "score": 9.2,
        "highlights": ["快攻 3 次", "助攻 2 次", "抢断 1 次"]
      }
    },
    "tactical_insights": [
      "team1 频繁使用挡拆战术",
      "team2 联防效果不佳"
    ]
  }
}
```

**技术实现**:
- 使用 Gemini Video Understanding API
- 分段处理（每 30 秒一个片段）
- 合并分析结果

---

#### 3.2.3 analyze_document（新增）

**功能**: 分析上传的文档（比赛报告、数据表等）

**输入参数**:
```typescript
{
  document_url: string;  // 文档 URL（Vercel Blob）
  document_type: 'pdf' | 'excel' | 'word' | 'auto';
  extract_data?: boolean;  // 是否提取结构化数据
}
```

**输出示例**:
```json
{
  "success": true,
  "data": {
    "document_type": "excel",
    "summary": "包含 2026 年 3 月比赛数据，共 10 场",
    "extracted_data": {
      "matches": [
        {
          "date": "2026-03-01",
          "teams": ["A队", "B队"],
          "score": "21:18"
        }
      ],
      "player_stats": [
        {
          "name": "张三",
          "avg_points": 15.3,
          "total_rebounds": 42
        }
      ]
    },
    "import_to_database": true,  // 是否导入到数据库
    "import_status": "pending"    // 用户确认后执行
  }
}
```

**技术实现**:
- PDF/Word: 直接传给 Gemini Document API
- Excel: 使用 `xlsx` 库解析 → 转换为 JSON → 传给 Gemini

---

## 4. Phase 规划

### Phase 1: 准备工作与架构设计（30 分钟）

**任务清单**:
- [x] 创建设计文档（本文档）
- [ ] 创建 Supabase 数据库表（matches, player_match_stats, media_uploads）
- [ ] 配置 Vercel Blob Storage（获取 API Token）
- [ ] 安装新依赖（`@vercel/blob`）
- [ ] 创建状态文件模板（`agent-dev-state.json`）

**交付物**:
- ✅ `basketball-agent-design.md`
- ✅ `agent-dev-state.json`
- ✅ Supabase 表结构（`supabase/agent-tables.sql`）
- ✅ 环境变量配置（`.env.example`）

**验收标准**:
1. 数据库表创建成功，可通过 Supabase Dashboard 查询
2. Vercel Blob Token 已配置到 `.env.local`
3. `npm install` 无报错

---

### Phase 2: 数据库查询工具增强（45 分钟）

**任务清单**:
- [ ] 修改 `/api/chat.ts` 中的工具定义
  - [ ] 优化 `get_player_stats`（支持历史数据）
  - [ ] 添加 `get_match_history`
  - [ ] 添加 `compare_players`
  - [ ] 添加 `analyze_match_performance`
  - [ ] 删除 `search_web`
- [ ] 实现后端查询逻辑（Supabase queries）
- [ ] 编写单元测试（`api/__tests__/chat.test.ts`）

**交付物**:
- ✅ `api/chat.ts`（修改后）
- ✅ `lib/db-queries.ts`（数据库查询工具）
- ✅ `api/__tests__/chat.test.ts`

**验收标准**:
1. 可以通过对话查询比赛历史
2. 可以对比多个球员数据
3. 测试覆盖率 > 80%

**示例对话**:
```
User: "查询张三和李四的对比"
Agent: "张三擅长传球（90分），李四投篮更强（85分）..."
```

---

### Phase 3: 文件上传基础设施（60 分钟）

**任务清单**:
- [ ] 创建 `/api/upload.ts`（文件上传接口）
- [ ] 前端组件
  - [ ] `FileUploader.tsx`（拖拽上传）
  - [ ] `FilePreview.tsx`（文件预览）
- [ ] 集成 react-dropzone
- [ ] 实现上传进度条
- [ ] 文件类型和大小验证

**交付物**:
- ✅ `api/upload.ts`
- ✅ `components/chat/FileUploader.tsx`
- ✅ `components/chat/FilePreview.tsx`
- ✅ `components/chat/UploadProgressBar.tsx`

**验收标准**:
1. 可拖拽上传图片、视频、文档
2. 文件成功上传到 Vercel Blob
3. 显示上传进度
4. 超过大小限制时提示错误

**文件限制**:
- 图片: 10MB（jpg, png, webp）
- 视频: 100MB（mp4, mov, webm）
- 文档: 20MB（pdf, xlsx, docx）

---

### Phase 4: 图片分析功能（45 分钟）

**任务清单**:
- [ ] 创建 `/api/analyze-media.ts`（多模态分析接口）
- [ ] 实现图片分析逻辑
  - [ ] 投篮姿势分析
  - [ ] 防守姿态分析
  - [ ] 战术截图识别
- [ ] 前端组件
  - [ ] `AnalysisProgress.tsx`（分析进度）
  - [ ] `AnalysisResult.tsx`（结果展示）
- [ ] 测试 Gemini Vision API

**交付物**:
- ✅ `api/analyze-media.ts`
- ✅ `components/chat/AnalysisProgress.tsx`
- ✅ `components/chat/AnalysisResult.tsx`
- ✅ `api/__tests__/analyze-media.test.ts`

**验收标准**:
1. 上传球员投篮图片后，返回姿势分析
2. 分析结果包含优点、改进建议、评分
3. 测试通过率 100%

**示例对话**:
```
User: [上传投篮图片]
Agent: "分析完成：你的投篮姿势整体流畅，但出手点偏低，建议提高至额头正上方..."
```

---

### Phase 5: 视频分析功能（60 分钟）

**任务清单**:
- [ ] 扩展 `/api/analyze-media.ts` 支持视频
- [ ] 实现视频分段处理（每 30 秒）
- [ ] 提取关键事件（得分、助攻、防守）
- [ ] 生成精彩集锦摘要
- [ ] 优化性能（超时处理）

**交付物**:
- ✅ `api/analyze-media.ts`（支持视频）
- ✅ `lib/video-analyzer.ts`（视频处理工具）
- ✅ `types/analysis.ts`（分析结果类型）

**验收标准**:
1. 上传 3 分钟比赛视频后，返回事件时间线
2. 标注每个事件的时间戳、球员、描述
3. 处理时间 < 90 秒

**技术难点**:
- Gemini Video API 有时长限制（建议 < 5 分钟）
- 需要分段处理长视频
- 优化提示词以获取结构化输出

---

### Phase 6: 文档分析功能（45 分钟）

**任务清单**:
- [ ] 扩展 `/api/analyze-media.ts` 支持文档
- [ ] PDF/Word: 直接传给 Gemini
- [ ] Excel: 解析为 JSON → Gemini
- [ ] 提供数据导入选项
- [ ] 更新到数据库

**交付物**:
- ✅ `api/analyze-media.ts`（支持文档）
- ✅ `lib/document-parser.ts`（文档解析工具）
- ✅ `api/import-data.ts`（数据导入接口）

**验收标准**:
1. 上传 Excel 比赛数据表后，识别字段并映射
2. 用户确认后导入到 Supabase
3. 支持错误处理和回滚

**示例对话**:
```
User: [上传 Excel]
Agent: "检测到 10 场比赛数据，是否导入到数据库？"
User: "是"
Agent: "导入成功！已添加 10 条比赛记录。"
```

---

### Phase 7: 集成测试与优化（60 分钟）

**任务清单**:
- [ ] 端到端测试（E2E）
  - [ ] 完整对话流程
  - [ ] 文件上传 + 分析
  - [ ] 数据库查询
- [ ] 性能优化
  - [ ] 减少不必要的重渲染
  - [ ] 优化图片加载
  - [ ] 缓存 Gemini API 响应
- [ ] 错误处理完善
  - [ ] 网络错误重试
  - [ ] 超时降级
  - [ ] 用户友好提示
- [ ] 无障碍优化
  - [ ] 键盘导航
  - [ ] 屏幕阅读器支持

**交付物**:
- ✅ `e2e/agent-flow.spec.ts`（E2E 测试）
- ✅ 性能报告（Lighthouse）
- ✅ 错误监控配置（Sentry）

**验收标准**:
1. E2E 测试通过率 100%
2. Lighthouse 性能分数 > 90
3. 所有错误都有用户友好提示

---

### Phase 8: 文档与部署（45 分钟）

**任务清单**:
- [ ] 更新 `README.md`
  - [ ] 新功能说明
  - [ ] 配置指南
  - [ ] 使用示例
- [ ] 创建用户手册（`docs/user-guide.md`）
- [ ] API 文档（`docs/api-reference.md`）
- [ ] 部署到 Vercel
  - [ ] 配置环境变量
  - [ ] 运行数据库迁移
  - [ ] 监控日志
- [ ] 发布说明（Release Notes）

**交付物**:
- ✅ `README.md`（更新）
- ✅ `docs/user-guide.md`
- ✅ `docs/api-reference.md`
- ✅ Vercel 部署成功
- ✅ GitHub Release

**验收标准**:
1. 新用户可在 5 分钟内完成配置
2. API 文档覆盖所有端点
3. 线上环境无报错

---

## 5. 验收标准

### 5.1 功能验收

#### 数据库查询
- [ ] 可查询任意球员的基本信息 + 最近 5 场比赛数据
- [ ] 可按日期范围筛选比赛历史
- [ ] 可对比 2-5 名球员的能力和统计数据
- [ ] 可生成单场比赛的分析报告

#### 多模态分析
- [ ] 图片分析：识别投篮/防守动作，给出改进建议
- [ ] 视频分析：提取事件时间线，标注关键球员
- [ ] 文档分析：解析 Excel/PDF，可导入数据库

#### 文件上传
- [ ] 支持拖拽上传
- [ ] 显示实时上传进度
- [ ] 文件大小超限时提示错误
- [ ] 上传成功后自动触发分析

### 5.2 性能验收

- [ ] 图片分析：< 10 秒
- [ ] 视频分析（3 分钟）：< 90 秒
- [ ] 文档分析：< 15 秒
- [ ] 数据库查询：< 2 秒
- [ ] Lighthouse 性能分数：> 90

### 5.3 稳定性验收

- [ ] 单元测试覆盖率：> 80%
- [ ] E2E 测试通过率：100%
- [ ] API 错误率：< 1%
- [ ] 降级方案：Gemini 超时时返回友好提示

### 5.4 用户体验验收

- [ ] 所有按钮都有 loading 状态
- [ ] 所有错误都有友好提示（非技术语言）
- [ ] 键盘可完全操作（Tab 导航）
- [ ] 屏幕阅读器可读出关键信息

---

## 6. 风险评估

### 6.1 技术风险

#### 风险 1: Gemini Video API 超时

**影响**: 视频分析失败，用户体验差

**应对方案**:
1. 限制视频长度（< 5 分钟）
2. 分段处理（每 30 秒一个片段）
3. 超时后降级为文本描述 + 关键帧截图
4. 缓存分析结果（避免重复请求）

**验证方法**:
- 测试 10 个不同长度的视频
- 记录超时率
- 调整分片策略

---

#### 风险 2: Vercel Blob 存储配额不足

**影响**: 文件上传失败

**应对方案**:
1. 设置文件大小限制（图片 10MB，视频 100MB）
2. 定期清理旧文件（> 30 天）
3. 监控存储使用量
4. 必要时升级 Vercel 计划

**验证方法**:
- 监控 Vercel Dashboard 存储使用量
- 设置告警（> 80% 时通知）

---

#### 风险 3: Supabase 查询性能慢

**影响**: 对话响应延迟

**应对方案**:
1. 添加索引（player_id, match_id, date）
2. 使用数据库视图（预计算统计数据）
3. 限制返回数量（最多 50 条）
4. 考虑引入 Redis 缓存

**验证方法**:
- 使用 EXPLAIN ANALYZE 检查查询计划
- 压力测试（100 并发请求）

---

### 6.2 业务风险

#### 风险 4: 用户上传无关内容

**影响**: 浪费资源，可能触发内容审核

**应对方案**:
1. 文件类型白名单（仅允许篮球相关格式）
2. 文件名关键词过滤（拒绝明显无关文件）
3. 添加内容审核 API（可选）
4. 用户协议中明确禁止滥用

**验证方法**:
- 测试上传非篮球图片/视频
- 验证错误提示是否清晰

---

#### 风险 5: 多模态分析不准确

**影响**: 用户信任度下降

**应对方案**:
1. 使用高质量提示词（提供示例）
2. 允许用户反馈（点赞/点踩）
3. 记录错误案例，持续优化
4. 降低预期（说明 AI 分析仅供参考）

**验证方法**:
- A/B 测试不同提示词
- 收集用户反馈数据

---

### 6.3 项目风险

#### 风险 6: 开发时间超出预期

**影响**: 延迟上线

**应对方案**:
1. 每个 Phase 预留 15 分钟缓冲时间
2. 优先实现核心功能（Phase 1-4）
3. 可选功能（Phase 5-6）可延后
4. 并行开发（前端 + 后端）

**验证方法**:
- 每个 Phase 结束后更新状态文件
- 评估剩余工作量

---

## 7. 技术参考

### 7.1 Gemini 多模态 API

**官方文档**:
- [Video Understanding](https://ai.google.dev/gemini-api/docs/video-understanding)
- [Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Document Understanding](https://ai.google.dev/gemini-api/docs/document-understanding)

**关键参数**:
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  },
});

// 图片分析
const result = await model.generateContent([
  { text: "分析这张篮球投篮图片..." },
  { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
]);

// 视频分析
const result = await model.generateContent([
  { text: "分析这段比赛视频..." },
  { fileData: { mimeType: 'video/mp4', fileUri: videoUrl } }
], {
  media_resolution: "high"  // 高分辨率，识别细节
});
```

**最佳实践**（参考: [Google Developers Blog](https://developers.googleblog.com/new-gemini-api-updates-for-gemini-3/)）:
- 图片: 使用 `media_resolution: "high"` 提高识别精度
- 视频: 时长 < 5 分钟，分段处理长视频
- 文档: 直接传递 PDF/Word，Excel 需先转换为 JSON

---

### 7.2 Vercel Blob Storage

**官方文档**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)

**配置步骤**:
```bash
# 1. 安装
npm install @vercel/blob

# 2. 创建 Blob Store
# 在 Vercel Dashboard → Storage → Create → Blob

# 3. 获取 Token
# Dashboard → Blob Store → Settings → Read-write Token

# 4. 配置环境变量
echo "BLOB_READ_WRITE_TOKEN=vercel_blob_xxx" >> .env.local
```

**使用示例**:
```typescript
import { put, del } from '@vercel/blob';

// 上传文件
const blob = await put('videos/match.mp4', file, {
  access: 'public',
  addRandomSuffix: true,
});
console.log(blob.url);  // https://xxx.public.blob.vercel-storage.com/videos/match-abc123.mp4

// 删除文件
await del(blob.url);
```

**限制**:
- 单文件最大: 500MB
- 总存储: 根据计划（Hobby: 1GB）
- 流量: 根据计划

---

### 7.3 react-dropzone

**官方文档**: [react-dropzone](https://react-dropzone.js.org/)

**最佳实践**（参考: [Medium Guide](https://medium.com/@vishalsinghrajawat990/the-definitive-guide-to-uploading-files-in-react-ux-compression-api-best-practices-fa388fd7165c)）:
- 使用 `maxSize` 限制文件大小
- 使用 `accept` 限制文件类型
- 显示拖拽预览
- 处理错误文件

**示例代码**:
```typescript
import { useDropzone } from 'react-dropzone';

function FileUploader() {
  const { getRootProps, getInputProps, isDragActive, rejectedFiles } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 100 * 1024 * 1024,  // 100MB
    onDrop: (acceptedFiles) => {
      // 上传逻辑
    },
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? '松开以上传' : '拖拽文件至此或点击选择'}
      {rejectedFiles.length > 0 && <p>文件类型或大小不符合要求</p>}
    </div>
  );
}
```

---

### 7.4 监控与告警

#### Sentry 错误监控

**配置**:
```bash
npm install @sentry/react @sentry/tracing
```

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,  // 采样 10%
});
```

#### Vercel Analytics

**配置**:
```bash
npm install @vercel/analytics
```

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

---

## 8. 附录

### 8.1 环境变量清单

```bash
# .env.example

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # 后端使用

# Gemini API
GEMINI_API_KEY=xxx

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Sentry (可选)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 8.2 Git 分支策略

```
main (生产)
  └── dev (开发)
       ├── feature/agent-tools (Phase 2)
       ├── feature/file-upload (Phase 3)
       ├── feature/image-analysis (Phase 4)
       ├── feature/video-analysis (Phase 5)
       └── feature/document-analysis (Phase 6)
```

### 8.3 Commit 规范

```
feat: 添加视频分析功能
fix: 修复文件上传大小限制错误
docs: 更新 README 配置说明
test: 添加图片分析单元测试
refactor: 优化数据库查询性能
```

---

## 9. 总结

本设计文档详细规划了 Basketball Agent 的重构方案，包括：

✅ **架构设计**: 前后端分离，使用 Vercel + Supabase + Gemini  
✅ **工具定义**: 4 个数据库查询工具 + 3 个多模态分析工具  
✅ **Phase 拆分**: 8 个阶段，总计 8 小时  
✅ **验收标准**: 功能、性能、稳定性、用户体验  
✅ **风险评估**: 技术风险、业务风险、项目风险及应对方案  
✅ **技术参考**: Gemini API、Vercel Blob、react-dropzone 最佳实践  

**下一步**:
1. ✅ 创建 `agent-dev-state.json` 状态文件
2. 开始执行 Phase 1 任务

---

**文档版本**: v1.0  
**最后更新**: 2026-03-09 09:15
