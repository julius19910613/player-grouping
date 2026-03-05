# Supabase 迁移设计方案

> 篮球球员分组 Web 应用 - 从本地存储迁移到云端同步方案
>
> 设计日期: 2026-03-04
> 版本: 1.0.0

---

## 目录

- [1. 背景与目标](#1-背景与目标)
- [2. 现有架构分析](#2-现有架构分析)
- [3. Supabase 数据库设计](#3-supabase-数据库设计)
- [4. 认证方案设计](#4-认证方案设计)
- [5. API 服务层架构](#5-api-服务层架构)
- [6. 数据迁移策略](#6-数据迁移策略)
- [7. 迁移实施步骤](#7-迁移实施步骤)
- [8. 风险评估与应对](#8-风险评估与应对)
- [9. 技术栈变更](#9-技术栈变更)

---

## 1. 背景与目标

### 1.1 现有问题

| 问题 | 影响 |
|------|------|
| 数据存储在浏览器本地 | 跨设备/浏览器无法同步 |
| 换设备或清缓存后数据丢失 | 用户体验差 |
| 无用户系统，数据不隔离 | 无法支持多用户场景 |

### 1.2 迁移目标

1. **数据云端化**: 使用 Supabase PostgreSQL 存储所有数据
2. **多用户支持**: 实现用户认证和数据隔离
3. **离线支持**: 保留本地缓存，支持离线编辑
4. **平滑迁移**: 支持从旧系统导入数据

---

## 2. 现有架构分析

### 2.1 当前数据库表结构

#### players 表
```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### player_skills 表
```sql
CREATE TABLE player_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL UNIQUE,
  two_point_shot INTEGER DEFAULT 50 CHECK(two_point_shot BETWEEN 1 AND 99),
  three_point_shot INTEGER DEFAULT 50 CHECK(three_point_shot BETWEEN 1 AND 99),
  free_throw INTEGER DEFAULT 50 CHECK(free_throw BETWEEN 1 AND 99),
  passing INTEGER DEFAULT 50 CHECK(passing BETWEEN 1 AND 99),
  ball_control INTEGER DEFAULT 50 CHECK(ball_control BETWEEN 1 AND 99),
  court_vision INTEGER DEFAULT 50 CHECK(court_vision BETWEEN 1 AND 99),
  perimeter_defense INTEGER DEFAULT 50 CHECK(perimeter_defense BETWEEN 1 AND 99),
  interior_defense INTEGER DEFAULT 50 CHECK(interior_defense BETWEEN 1 AND 99),
  steals INTEGER DEFAULT 50 CHECK(steals BETWEEN 1 AND 99),
  blocks INTEGER DEFAULT 50 CHECK(blocks BETWEEN 1 AND 99),
  offensive_rebound INTEGER DEFAULT 50 CHECK(offensive_rebound BETWEEN 1 AND 99),
  defensive_rebound INTEGER DEFAULT 50 CHECK(defensive_rebound BETWEEN 1 AND 99),
  speed INTEGER DEFAULT 50 CHECK(speed BETWEEN 1 AND 99),
  strength INTEGER DEFAULT 50 CHECK(strength BETWEEN 1 AND 99),
  stamina INTEGER DEFAULT 50 CHECK(stamina BETWEEN 1 AND 99),
  vertical INTEGER DEFAULT 50 CHECK(vertical BETWEEN 1 AND 99),
  basketball_iq INTEGER DEFAULT 50 CHECK(basketball_iq BETWEEN 1 AND 99),
  teamwork INTEGER DEFAULT 50 CHECK(teamwork BETWEEN 1 AND 99),
  clutch INTEGER DEFAULT 50 CHECK(clutch BETWEEN 1 AND 99),
  overall INTEGER DEFAULT 50,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

#### grouping_history 表
```sql
CREATE TABLE grouping_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mode TEXT CHECK(mode IN ('5v5', '3v3', 'custom')),
  team_count INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  balance_score REAL,
  data TEXT NOT NULL,  -- JSON string
  note TEXT
);
```

### 2.2 现有服务架构

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
├─────────────────────────────────────────────────────────┤
│  Components ───> Repository Pattern ───> Services       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Database Service (Single Source)            │
├─────────────────────────────────────────────────────────┤
│  ┌───────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │  SQLite   │──>│ IndexedDB    │──>│ LocalStorage │   │
│  │ (sql.js)  │   │  (持久化)    │   │  (降级方案)  │   │
│  └───────────┘   └──────────────┘   └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Supabase 数据库设计

### 3.1 核心表结构 (PostgreSQL DDL)

#### 3.1.1 启用 UUID 扩展

```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### 3.1.2 用户配置表 (user_profiles)

```sql
-- 用户配置表
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'zh-CN',
  theme TEXT DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_display_name ON public.user_profiles(display_name);
```

#### 3.1.3 球员表 (players)

```sql
-- 球员表
CREATE TABLE public.players (
  id TEXT NOT NULL,  -- 保持与现有系统兼容的 TEXT ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 复合主键和约束
  PRIMARY KEY (user_id, id),
  CONSTRAINT unique_player_name_per_user UNIQUE (user_id, name)
);

-- 创建索引
CREATE INDEX idx_players_user_id ON public.players(user_id);
CREATE INDEX idx_players_position ON public.players(user_id, position);
CREATE INDEX idx_players_name_search ON public.players USING gin(to_tsvector('simple', name));
CREATE INDEX idx_players_is_active ON public.players(user_id, is_active);
CREATE INDEX idx_players_created_at ON public.players(user_id, created_at DESC);

-- 添加全文搜索功能
ALTER TABLE public.players ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED;
```

#### 3.1.4 球员能力表 (player_skills)

```sql
-- 球员能力表
CREATE TABLE public.player_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  two_point_shot INTEGER DEFAULT 50 CHECK(two_point_shot BETWEEN 1 AND 99),
  three_point_shot INTEGER DEFAULT 50 CHECK(three_point_shot BETWEEN 1 AND 99),
  free_throw INTEGER DEFAULT 50 CHECK(free_throw BETWEEN 1 AND 99),
  passing INTEGER DEFAULT 50 CHECK(passing BETWEEN 1 AND 99),
  ball_control INTEGER DEFAULT 50 CHECK(ball_control BETWEEN 1 AND 99),
  court_vision INTEGER DEFAULT 50 CHECK(court_vision BETWEEN 1 AND 99),
  perimeter_defense INTEGER DEFAULT 50 CHECK(perimeter_defense BETWEEN 1 AND 99),
  interior_defense INTEGER DEFAULT 50 CHECK(interior_defense BETWEEN 1 AND 99),
  steals INTEGER DEFAULT 50 CHECK(steals BETWEEN 1 AND 99),
  blocks INTEGER DEFAULT 50 CHECK(blocks BETWEEN 1 AND 99),
  offensive_rebound INTEGER DEFAULT 50 CHECK(offensive_rebound BETWEEN 1 AND 99),
  defensive_rebound INTEGER DEFAULT 50 CHECK(defensive_rebound BETWEEN 1 AND 99),
  speed INTEGER DEFAULT 50 CHECK(speed BETWEEN 1 AND 99),
  strength INTEGER DEFAULT 50 CHECK(strength BETWEEN 1 AND 99),
  stamina INTEGER DEFAULT 50 CHECK(stamina BETWEEN 1 AND 99),
  vertical INTEGER DEFAULT 50 CHECK(vertical BETWEEN 1 AND 99),
  basketball_iq INTEGER DEFAULT 50 CHECK(basketball_iq BETWEEN 1 AND 99),
  teamwork INTEGER DEFAULT 50 CHECK(teamwork BETWEEN 1 AND 99),
  clutch INTEGER DEFAULT 50 CHECK(clutch BETWEEN 1 AND 99),
  overall INTEGER DEFAULT 50,
  version INTEGER DEFAULT 1,  -- 用于乐观并发控制
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 外键约束
  FOREIGN KEY (user_id, player_id) REFERENCES players(user_id, id) ON DELETE CASCADE,
  UNIQUE (user_id, player_id)
);

-- 创建索引
CREATE INDEX idx_player_skills_user_id ON public.player_skills(user_id);
CREATE INDEX idx_player_skills_player_id ON public.player_skills(user_id, player_id);
CREATE INDEX idx_player_skills_overall ON public.player_skills(user_id, overall DESC);
```

#### 3.1.5 分组历史表 (grouping_history)

```sql
-- 分组历史表
CREATE TABLE public.grouping_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('5v5', '3v3', 'custom')),
  team_count INTEGER NOT NULL CHECK(team_count > 0),
  player_count INTEGER NOT NULL CHECK(player_count > 0),
  balance_score REAL CHECK(balance_score >= 0 AND balance_score <= 100),
  data JSONB NOT NULL,  -- 使用 JSONB 替代 TEXT
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_grouping_history_user_id ON public.grouping_history(user_id);
CREATE INDEX idx_grouping_history_created_at ON public.grouping_history(user_id, created_at DESC);
CREATE INDEX idx_grouping_history_mode ON public.grouping_history(user_id, mode);
CREATE INDEX idx_grouping_history_is_favorite ON public.grouping_history(user_id, is_favorite);
CREATE INDEX idx_grouping_history_tags ON public.grouping_history USING gin(tags);
```

#### 3.1.6 数据同步表 (sync_status) - 可选

```sql
-- 数据同步状态表（用于离线同步）
CREATE TABLE public.sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('players', 'skills', 'history')),
  entity_id TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK(sync_status IN ('pending', 'synced', 'conflict')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_version TEXT,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (user_id, entity_type, entity_id)
);

-- 创建索引
CREATE INDEX idx_sync_status_user_id ON public.sync_status(user_id);
CREATE INDEX idx_sync_status_status ON public.sync_status(user_id, sync_status);
```

### 3.2 数据库触发器和函数

#### 3.2.1 自动更新 updated_at

```sql
-- 创建通用的 updated_at 触发函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为各表添加触发器
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_skills_updated_at BEFORE UPDATE ON public.player_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 3.2.2 自动创建用户配置

```sql
-- 用户注册时自动创建配置
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.3 Row Level Security (RLS) 策略

#### 3.3.1 启用 RLS

```sql
-- 为所有表启用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grouping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
```

#### 3.3.2 用户配置表 RLS

```sql
-- 用户配置表策略
CREATE POLICY "用户可以查看自己的配置"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的配置"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的配置"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### 3.3.3 球员表 RLS

```sql
-- 球员表策略
CREATE POLICY "用户可以查看自己的球员"
  ON public.players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的球员"
  ON public.players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的球员"
  ON public.players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的球员"
  ON public.players FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3.3.4 球员能力表 RLS

```sql
-- 球员能力表策略
CREATE POLICY "用户可以查看自己球员的能力"
  ON public.player_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己球员的能力"
  ON public.player_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己球员的能力"
  ON public.player_skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己球员的能力"
  ON public.player_skills FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3.3.5 分组历史表 RLS

```sql
-- 分组历史表策略
CREATE POLICY "用户可以查看自己的分组历史"
  ON public.grouping_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入分组历史"
  ON public.grouping_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的分组历史"
  ON public.grouping_history FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3.3.6 同步状态表 RLS

```sql
-- 同步状态表策略
CREATE POLICY "用户可以查看自己的同步状态"
  ON public.sync_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以管理自己的同步状态"
  ON public.sync_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.4 数据库视图和辅助函数

#### 3.4.1 球员完整信息视图

```sql
-- 球员完整信息视图（JOIN 球员和能力）
CREATE OR REPLACE VIEW player_full_info AS
SELECT
  p.user_id,
  p.id,
  p.name,
  p.position,
  p.is_active,
  p.created_at,
  p.updated_at,
  s.id AS skill_id,
  s.two_point_shot,
  s.three_point_shot,
  s.free_throw,
  s.passing,
  s.ball_control,
  s.court_vision,
  s.perimeter_defense,
  s.interior_defense,
  s.steals,
  s.blocks,
  s.offensive_rebound,
  s.defensive_rebound,
  s.speed,
  s.strength,
  s.stamina,
  s.vertical,
  s.basketball_iq,
  s.teamwork,
  s.clutch,
  s.overall,
  s.version AS skill_version
FROM players p
LEFT JOIN player_skills s ON p.user_id = s.user_id AND p.id = s.player_id;

-- 为视图创建策略
ALTER VIEW player_full_info SET (security_barrier = true);
```

#### 3.4.2 统计聚合函数

```sql
-- 按位置统计球员数量
CREATE OR REPLACE FUNCTION count_players_by_position(user_id_param UUID)
RETURNS TABLE (position TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT position, COUNT(*)::BIGINT
  FROM players
  WHERE user_id = user_id_param AND is_active = TRUE
  GROUP BY position;
END;
$$ LANGUAGE plpgsql;

-- 计算球员的平均能力
CREATE OR REPLACE FUNCTION avg_skills_by_position(user_id_param UUID, position_param TEXT)
RETURNS TABLE (
  avg_overall NUMERIC,
  avg_two_point NUMERIC,
  avg_three_point NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(ps.overall)::NUMERIC, 2),
    ROUND(AVG(ps.two_point_shot)::NUMERIC, 2),
    ROUND(AVG(ps.three_point_shot)::NUMERIC, 2)
  FROM player_skills ps
  JOIN players p ON ps.user_id = p.user_id AND ps.player_id = p.id
  WHERE ps.user_id = user_id_param AND p.position = position_param;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. 认证方案设计

### 4.1 认证方式选择

| 方式 | 优先级 | 说明 |
|------|--------|------|
| Email + Password | 主 | 基础认证，简单易用 |
| Google OAuth | 次要 | 快速登录，提升体验 |
| 匿名用户 | 备选 | 允许未登录用户使用 |

### 4.2 认证流程设计

#### 4.2.1 注册/登录流程

```
┌─────────────────┐
│   用户访问应用   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 检查本地 Token   │────▶│ Token 有效?     │
└────────┬────────┘     └────────┬────────┘
         │                      │
         ├─▶ 有效 ──────────────┘
         │        ▼
         │   ┌─────────────────┐
         │   │   恢复会话      │
         │   └─────────────────┘
         │
         └─▶ 无效
                  ▼
         ┌─────────────────┐
         │   显示登录页面   │
         └────────┬────────┘
                  │
                  ├─▶ Email/Password
                  │
                  └─▶ Google OAuth
```

#### 4.2.2 会话管理

```typescript
// 认证状态管理接口
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

interface Session {
  accessToken: string;
  expiresAt: number;
}
```

### 4.3 认证服务设计

```typescript
/**
 * 认证服务接口
 */
interface IAuthService {
  // 登录/注册
  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signOut(): Promise<void>;

  // 会话管理
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<void>;

  // 密码管理
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;

  // 认证状态
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void;
}

type AuthChangeEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
  session?: Session;
}
```

### 4.4 匿名用户支持（可选）

```typescript
/**
 * 游客模式接口
 */
interface GuestModeService {
  // 创建匿名用户
  createAnonymousSession(): Promise<void>;

  // 升级为正式用户
  upgradeToRegisteredUser(email: string, password: string): Promise<void>;

  // 导出游客数据
  exportGuestData(): Promise<GuestData>;

  // 导入游客数据
  importGuestData(data: GuestData): Promise<void>;
}
```

---

## 5. API 服务层架构

### 5.1 服务层分层设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (Components: PlayerList, PlayerForm, GroupingPanel, ...)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Pattern                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │PlayerRepo    │  │SkillRepo     │  │HistoryRepo   │      │
│  │              │  │              │  │              │      │
│  │ - CRUD       │  │ - CRUD       │  │ - CRUD       │      │
│  │ - Search     │  │ - Aggregation│  │ - Favorites  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Abstraction                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         DatabaseAdapter (Abstract)                     │ │
│  │  - Query<T>                                             │ │
│  │  - Mutate<T>                                           │ │
│  │  - Transaction                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                              │
│         ┌────────────────────┼────────────────────┐        │
│         │                    │                    │        │
│         ▼                    ▼                    ▼        │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐   │
│  │Supabase  │         │IndexedDB │         │LocalStorage│ │
│  │Adapter   │         │Adapter   │         │Adapter   │   │
│  │(Primary) │         │(Cache)   │         │(Fallback)│   │
│  └──────────┘         └──────────┘         └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 数据库适配器接口

```typescript
/**
 * 数据库适配器抽象接口
 */
interface IDatabaseAdapter {
  // 查询操作
  query<T>(table: string, options?: QueryOptions): Promise<T[]>;
  queryById<T>(table: string, id: string): Promise<T | null>;
  queryOne<T>(table: string, filter: Record<string, any>): Promise<T | null>;

  // 变更操作
  insert<T>(table: string, data: Partial<T>): Promise<T>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<void>;
  upsert<T>(table: string, data: Partial<T>): Promise<T>;

  // 批量操作
  batchInsert<T>(table: string, data: Partial<T>[]): Promise<T[]>;
  batchDelete(table: string, ids: string[]): Promise<void>;

  // 事务
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  // 订阅（实时）
  subscribe<T>(
    table: string,
    filter: Record<string, any>,
    callback: (payload: SubscriptionPayload<T>) => void
  ): () => void;

  // 健康检查
  healthCheck(): Promise<HealthStatus>;
}

interface QueryOptions {
  select?: string;
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: string;  // 全文搜索
}

interface SubscriptionPayload<T> {
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old: T | null;
  new: T | null;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}
```

### 5.3 Supabase 适配器实现

```typescript
/**
 * Supabase 适配器
 */
class SupabaseAdapter implements IDatabaseAdapter {
  private supabase: SupabaseClient;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL = 30000; // 30秒

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey);
    this.cache = new Map();
  }

  async query<T>(table: string, options: QueryOptions = {}): Promise<T[]> {
    let query = this.supabase.from(table).select(options.select || '*');

    // 应用过滤条件
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // 全文搜索
    if (options.search) {
      query = query.textSearch('search_vector', options.search);
    }

    // 排序
    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    // 分页
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new DatabaseError(`Query failed: ${error.message}`, 'QUERY_ERROR');
    }

    return data as T[];
  }

  async insert<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Insert failed: ${error.message}`, 'INSERT_ERROR');
    }

    // 清除缓存
    this.invalidateCache(table);

    return result as T;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Update failed: ${error.message}`, 'UPDATE_ERROR');
    }

    // 清除缓存
    this.invalidateCache(table);

    return result as T;
  }

  // ... 其他方法实现
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}
```

### 5.4 本地缓存适配器（IndexedDB）

```typescript
/**
 * IndexedDB 缓存适配器
 */
class IndexedDBCacheAdapter implements IDatabaseAdapter {
  private db: IDBPDatabase | null = null;
  private dbName = 'player-grouping-cache';
  private version = 1;

  async init(): Promise<void> {
    this.db = await openDB(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('players')) {
          db.createObjectStore('players', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('skills')) {
          db.createObjectStore('skills', { keyPath: 'player_id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
        // 元数据存储
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }

  async query<T>(table: string, options: QueryOptions = {}): Promise<T[]> {
    if (!this.db) await this.init();

    const store = this.db!.transaction(table, 'readonly').store;
    const results: T[] = [];

    for await (const item of store.values()) {
      results.push(item as T);
    }

    return results;
  }

  async insert<T>(table: string, data: Partial<T>): Promise<T> {
    if (!this.db) await this.init();

    await this.db!.add(table, data);
    return data as T;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    if (!this.db) await this.init();

    await this.db!.put(table, { ...data, id });
    return data as T;
  }

  // ... 其他方法实现
}
```

### 5.5 Repository 层设计

```typescript
/**
 * 球员 Repository
 */
class PlayerRepository {
  constructor(private db: IDatabaseAdapter) {}

  // 查询所有球员
  async findAll(userId: string, options?: PlayerQueryOptions): Promise<PlayerWithSkills[]> {
    return this.db.query<PlayerWithSkills>('player_full_info', {
      filter: { user_id: userId },
      ...options,
    });
  }

  // 按位置查询
  async findByPosition(userId: string, position: BasketballPosition): Promise<PlayerWithSkills[]> {
    return this.db.query<PlayerWithSkills>('player_full_info', {
      filter: { user_id: userId, position },
      orderBy: { column: 'updated_at', ascending: false },
    });
  }

  // 搜索球员
  async search(userId: string, keyword: string): Promise<PlayerWithSkills[]> {
    return this.db.query<PlayerWithSkills>('player_full_info', {
      filter: { user_id: userId },
      search: keyword,
    });
  }

  // 创建球员
  async create(player: CreatePlayerDto): Promise<PlayerWithSkills> {
    return this.db.transaction(async () => {
      const newPlayer = await this.db.insert('players', player);
      const defaultSkills = createDefaultSkills(player.id);
      const skills = await this.db.insert('player_skills', defaultSkills);

      return { ...newPlayer, ...skills };
    });
  }

  // 更新球员
  async update(id: string, updates: UpdatePlayerDto): Promise<PlayerWithSkills> {
    await this.db.update('players', id, updates);
    return this.findById(id);
  }

  // 删除球员
  async delete(id: string): Promise<void> {
    await this.db.delete('players', id);
    // skills 会通过级联删除自动删除
  }

  // 批量导入
  async import(players: CreatePlayerDto[]): Promise<PlayerWithSkills[]> {
    const playerResults = await this.db.batchInsert('players', players);
    const skills = players.map(p => createDefaultSkills(p.id));
    const skillResults = await this.db.batchInsert('player_skills', skills);

    return playerResults.map(p => ({
      ...p,
      ...skillResults.find(s => s.player_id === p.id),
    }));
  }
}

/**
 * 球员能力 Repository
 */
class SkillRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByPlayerId(playerId: string): Promise<PlayerSkillRow | null> {
    return this.db.queryOne('player_skills', { player_id: playerId });
  }

  async update(playerId: string, skills: Partial<PlayerSkillRow>): Promise<PlayerSkillRow> {
    return this.db.update('player_skills', playerId, {
      ...skills,
      version: sql`version + 1`,  // 乐观锁
    });
  }

  async batchUpdate(updates: Array<{ playerId: string; skills: Partial<PlayerSkillRow> }>): Promise<void> {
    for (const update of updates) {
      await this.update(update.playerId, update.skills);
    }
  }
}

/**
 * 分组历史 Repository
 */
class GroupingHistoryRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findAll(userId: string, options?: HistoryQueryOptions): Promise<GroupingHistoryRow[]> {
    return this.db.query('grouping_history', {
      filter: { user_id: userId },
      orderBy: { column: 'created_at', ascending: false },
      ...options,
    });
  }

  async findFavorites(userId: string): Promise<GroupingHistoryRow[]> {
    return this.db.query('grouping_history', {
      filter: { user_id: userId, is_favorite: true },
      orderBy: { column: 'created_at', ascending: false },
    });
  }

  async create(history: CreateGroupingHistoryDto): Promise<GroupingHistoryRow> {
    return this.db.insert('grouping_history', history);
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.db.update('grouping_history', id, { is_favorite: isFavorite });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete('grouping_history', id);
  }
}
```

---

## 6. 数据迁移策略

### 6.1 迁移架构

```
┌─────────────────────────────────────────────────────────┐
│                   数据导出阶段                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  IndexedDB / LocalStorage Data Exporter         │   │
│  │  - players                                      │   │
│  │  - skills                                       │   │
│  │  - grouping_history                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   数据转换阶段                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Data Transformer                              │   │
│  │  - 添加 user_id                                │   │
│  │  - 转换数据类型                                │   │
│  │  - 数据验证                                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   数据导入阶段                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Supabase Data Importer (Batch)                 │   │
│  │  - 分批导入 (每批 100 条)                       │   │
│  │  - 错误重试机制                                │   │
│  │  - 进度追踪                                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   数据验证阶段                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Data Validator                                 │   │
│  │  - 数据完整性检查                              │   │
│  │  - 数量对比                                    │   │
│  │  - 采样验证                                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6.2 迁移数据结构

```typescript
/**
 * 迁移数据接口
 */
interface MigrationData {
  version: number;
  timestamp: string;
  source: 'indexeddb' | 'localstorage' | 'both';
  players: ExportedPlayer[];
  skills: Record<string, ExportedSkill>;
  groupingHistory: ExportedGroupingHistory[];
}

interface ExportedPlayer {
  id: string;
  name: string;
  position: string;
  created_at: string;
  updated_at: string;
}

interface ExportedSkill {
  player_id: string;
  two_point_shot: number;
  three_point_shot: number;
  free_throw: number;
  passing: number;
  ball_control: number;
  court_vision: number;
  perimeter_defense: number;
  interior_defense: number;
  steals: number;
  blocks: number;
  offensive_rebound: number;
  defensive_rebound: number;
  speed: number;
  strength: number;
  stamina: number;
  vertical: number;
  basketball_iq: number;
  teamwork: number;
  clutch: number;
  overall: number;
}

interface ExportedGroupingHistory {
  id: number;
  created_at: string;
  mode: '5v5' | '3v3' | 'custom';
  team_count: number;
  player_count: number;
  balance_score: number | null;
  data: string;
  note: string | null;
}
```

### 6.3 迁移服务实现

```typescript
/**
 * 数据迁移服务
 */
class DataMigrationService {
  constructor(
    private localDb: DatabaseService,
    private supabase: SupabaseAdapter
  ) {}

  /**
   * 导出本地数据
   */
  async exportLocalData(): Promise<MigrationData> {
    const players = this.localDb.exec(SQL.SELECT_ALL_PLAYERS);
    const history = this.localDb.exec('SELECT * FROM grouping_history ORDER BY created_at DESC');

    return {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      source: 'indexeddb',
      players: this.transformPlayers(players),
      skills: this.transformSkills(players),
      groupingHistory: this.transformHistory(history),
    };
  }

  /**
   * 迁移数据到 Supabase
   */
  async migrateToSupabase(userId: string, data: MigrationData): Promise<MigrationResult> {
    const batch = new SupabaseMigrationBatch(this.supabase, userId);

    try {
      // 迁移球员
      const playerResults = await batch.migratePlayers(data.players);

      // 迁移能力
      const skillResults = await batch.migrateSkills(data.skills);

      // 迁移历史
      const historyResults = await batch.migrateHistory(data.groupingHistory);

      return {
        success: true,
        playersMigrated: playerResults.length,
      };
    } catch (error) {
      // 回滚已迁移的数据
      await batch.rollback();
      throw error;
    }
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(userId: string, originalCount: number): Promise<ValidationResult> {
    const migratedPlayers = await this.supabase.query('players', {
      filter: { user_id: userId },
    });

    return {
      success: migratedPlayers.length === originalCount,
      originalCount,
      migratedCount: migratedPlayers.length,
      missingCount: Math.max(0, originalCount - migratedPlayers.length),
    };
  }
}

/**
 * Supabase 批量迁移
 */
class SupabaseMigrationBatch {
  private migratedPlayerIds: string[] = [];

  constructor(private supabase: SupabaseAdapter, private userId: string) {}

  async migratePlayers(players: ExportedPlayer[]): Promise<PlayerRow[]> {
    const BATCH_SIZE = 50;
    const results: PlayerRow[] = [];

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      const transformed = batch.map(p => this.transformPlayer(p));

      const { data, error } = await this.supabase
        .from('players')
        .insert(transformed)
        .select();

      if (error) throw error;
      results.push(...data);
      this.migratedPlayerIds.push(...data.map((p: any) => p.id));
    }

    return results;
  }

  async migrateSkills(skills: Record<string, ExportedSkill>): Promise<PlayerSkillRow[]> {
    const BATCH_SIZE = 50;
    const skillArray = Object.values(skills);

    // 只迁移已迁移的球员的技能
    const relevantSkills = skillArray.filter(s => this.migratedPlayerIds.includes(s.player_id));

    const results: PlayerSkillRow[] = [];

    for (let i = 0; i < relevantSkills.length; i += BATCH_SIZE) {
      const batch = relevantSkills.slice(i, i + BATCH_SIZE);
      const transformed = batch.map(s => this.transformSkill(s));

      const { data, error } = await this.supabase
        .from('player_skills')
        .insert(transformed)
        .select();

      if (error) throw error;
      results.push(...data);
    }

    return results;
  }

  async migrateHistory(history: ExportedGroupingHistory[]): Promise<GroupingHistoryRow[]> {
    const BATCH_SIZE = 20;
    const results: GroupingHistoryRow[] = [];

    for (let i = 0; i < history.length; i += BATCH_SIZE) {
      const batch = history.slice(i, i + BATCH_SIZE);
      const transformed = batch.map(h => this.transformHistory(h));

      const { data, error } = await this.supabase
        .from('grouping_history')
        .insert(transformed)
        .select();

      if (error) throw error;
      results.push(...data);
    }

    return results;
  }

  async rollback(): Promise<void> {
    // 删除已迁移的球员（技能会级联删除）
    await this.supabase.batchDelete('players', this.migratedPlayerIds);
  }

  private transformPlayer(player: ExportedPlayer): any {
    return {
      user_id: this.userId,
      id: player.id,
      name: player.name,
      position: player.position,
      created_at: player.created_at,
      updated_at: player.updated_at,
    };
  }

  private transformSkill(skill: ExportedSkill): any {
    return {
      user_id: this.userId,
      player_id: skill.player_id,
      ...this.omitPlayerId(skill),
    };
  }

  private transformHistory(history: ExportedGroupingHistory): any {
    return {
      user_id: this.userId,
      mode: history.mode,
      team_count: history.team_count,
      player_count: history.player_count,
      balance_score: history.balance_score,
      data: history.data,
      note: history.note,
      created_at: history.created_at,
    };
  }

  private omitPlayerId(skill: ExportedSkill): Omit<ExportedSkill, 'player_id'> {
    const { player_id, ...rest } = skill;
    return rest;
  }
}
```

### 6.4 离线同步策略

```typescript
/**
 * 离线同步服务
 */
class OfflineSyncService {
  private syncQueue: SyncOperation[] = [];
  private isOnline = true;

  constructor(
    private localDb: IndexedDBCacheAdapter,
    private supabase: SupabaseAdapter
  ) {
    this.initNetworkListeners();
  }

  /**
   * 监听网络状态
   */
  private initNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * 记录离线变更
   */
  async recordOfflineChange(operation: SyncOperation): Promise<void> {
    this.syncQueue.push(operation);
    await this.localDb.insert('sync_queue', operation);
  }

  /**
   * 同步待处理的变更
   */
  async syncPendingChanges(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, error: 'Offline', syncedCount: 0 };
    }

    const pending = await this.localDb.query<SyncOperation>('sync_queue');
    let syncedCount = 0;

    for (const operation of pending) {
      try {
        await this.applyOperation(operation);
        await this.localDb.delete('sync_queue', operation.id);
        syncedCount++;
      } catch (error) {
        console.error('Sync failed:', error);
        // 保留失败的操作，稍后重试
      }
    }

    return { success: true, syncedCount };
  }

  /**
   * 应用同步操作
   */
  private async applyOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'INSERT':
        await this.supabase.insert(operation.table, operation.data);
        break;
      case 'UPDATE':
        await this.supabase.update(operation.table, operation.id, operation.data);
        break;
      case 'DELETE':
        await this.supabase.delete(operation.table, operation.id);
        break;
    }
  }
}

interface SyncOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data?: any;
  idField?: string;
  timestamp: string;
}

interface SyncResult {
  success: boolean;
  error?: string;
  syncedCount: number;
}
```

---

## 7. 迁移实施步骤

### 7.1 阶段一：环境准备（1-2天）

| 步骤 | 任务 | 输出 |
|------|------|------|
| 1.1 | 创建 Supabase 项目 | Project URL, Anon Key |
| 1.2 | 配置环境变量 | `.env` 文件 |
| 1.3 | 安装依赖包 | `@supabase/supabase-js` |
| 1.4 | 执行数据库 Schema | PostgreSQL 表结构 |

### 7.2 阶段二：后端集成（3-4天）

| 步骤 | 任务 | 输出 |
|------|------|------|
| 2.1 | 实现认证服务 | `AuthService.ts` |
| 2.2 | 实现 Supabase 适配器 | `SupabaseAdapter.ts` |
| 2.3 | 实现 Repository 层 | `PlayerRepository.ts`, `SkillRepository.ts`, `HistoryRepository.ts` |
| 2.4 | 添加类型定义 | Supabase 类型 |

### 7.3 阶段三：UI 集成（3-4天）

| 步骤 | 任务 | 输出 |
|------|------|------|
| 3.1 | 添加登录/注册页面 | `LoginPage.tsx`, `RegisterPage.tsx` |
| 3.2 | 添加用户设置页面 | `SettingsPage.tsx` |
| 3.3 | 更新现有组件使用新服务 | 组件适配 |
| 3.4 | 添加认证状态提示 | AuthContext |

### 7.4 阶段四：数据迁移（2-3天）

| 步骤 | 任务 | 输出 |
|------|------|------|
| 4.1 | 实现数据导出功能 | `MigrationExporter.ts` |
| 4.2 | 实现数据导入功能 | `MigrationImporter.ts` |
| 4.3 | 添加迁移 UI | `MigrationPage.tsx` |
| 4.4 | 测试迁移流程 | 迁移测试用例 |

### 7.5 阶段五：测试与优化（2-3天）

| 步骤 | 任务 | 输出 |
|------|------|------|
| 5.1 | 单元测试 | Repository, Service 测试 |
| 5.2 | 集成测试 | 端到端测试 |
| 5.3 | 性能优化 | 查询优化, 缓存策略 |
| 5.4 | 错误处理完善 | 错误边界, 重试机制 |

### 7.6 阶段六：发布与监控（1-2天）

| 步骤 | 任务 | 输出 |
|------|------|------|
| 6.1 | 用户文档更新 | README, 迁移指南 |
| 6.2 | 发布上线 | 生产部署 |
| 6.3 | 监控告警配置 | Supabase Dashboard |
| 6.4 | 用户反馈收集 | 反馈渠道 |

---

## 8. 风险评估与应对

### 8.1 技术风险

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据迁移失败 | 中 | 高 | 1. 执行前完整备份<br>2. 分批迁移, 逐批验证<br>3. 提供回滚机制 |
| 性能下降 | 中 | 中 | 1. 优化查询和索引<br>2. 实现分页加载<br>3. 使用本地缓存 |
| RLS 策略错误 | 低 | 高 | 1. 充分测试权限<br>2. 使用测试账号验证<br>3. 逐步开放功能 |
| 离线功能受限 | 高 | 中 | 1. 保留本地存储降级<br>2. 实现变更队列<br>3. 显示同步状态 |

### 8.2 业务风险

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 用户迁移阻力 | 中 | 中 | 1. 提供简便的迁移工具<br>2. 保留本地模式作为选项<br>3. 充分的用户教育 |
| 数据隐私担忧 | 中 | 高 | 1. 明确隐私政策<br>2. 实施数据删除功能<br>3. 支持数据导出 |
| 成本增加 | 低 | 低 | 1. 监控使用量<br>2. 优化查询频率<br>3. 设置告警阈值 |

### 8.3 回滚计划

```typescript
/**
 * 回滚服务
 */
class RollbackService {
  /**
   * 回滚到本地存储
   */
  async rollbackToLocal(backupData: BackupData): Promise<RollbackResult> {
    // 1. 停止 Supabase 同步
    // 2. 恢复本地数据
    // 3. 清除认证状态
    // 4. 验证数据完整性
  }

  /**
   * 创建迁移前备份
   */
  async createPreMigrationBackup(): Promise<string> {
    const data = await this.exportFullData();
    const backupId = await this.saveToCloudStorage(data);
    await this.saveToLocalStorage(data);
    return backupId;
  }
}
```

---

## 9. 技术栈变更

### 9.1 新增依赖

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "zustand": "^4.4.0"  // 认证状态管理
  }
}
```

### 9.2 环境变量

```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 9.3 文件结构变更

```
src/
├── services/
│   ├── database.ts              # 保留（本地适配器）
│   ├── supabase/
│   │   ├── client.ts            # Supabase 客户端初始化
│   │   ├── adapter.ts           # Supabase 适配器
│   │   └── migrations.ts        # 数据迁移服务
│   ├── auth/
│   │   ├── AuthService.ts       # 认证服务
│   │   └── AuthContext.tsx      # 认证上下文
│   ├── repositories/
│   │   ├── PlayerRepository.ts
│   │   ├── SkillRepository.ts
│   │   └── HistoryRepository.ts
│   └── sync/
│       └── OfflineSyncService.ts
├── types/
│   ├── database.ts              # 扩展 Supabase 类型
│   ├── auth.ts                  # 认证类型
│   └── sync.ts                  # 同步类型
└── pages/
    ├── LoginPage.tsx            # 新增
    ├── RegisterPage.tsx        # 新增
    ├── SettingsPage.tsx        # 新增
    └── MigrationPage.tsx        # 新增
```

---

## 附录

### A. Supabase 配置检查清单

- [ ] 创建 Supabase 项目
- [ ] 获取 Project URL 和 Anon Key
- [ ] 配置 .env 文件
- [ ] 执行数据库 Schema DDL
- [ ] 配置 RLS 策略
- [ ] 设置用户认证方式
- [ ] 配置 OAuth Provider (Google)
- [ ] 设置存储 Bucket (如需要)
- [ ] 配置实时订阅

### B. 迁移后数据验证脚本

```sql
-- 验证表结构
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 验证 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- 验证索引
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### C. 常见问题 FAQ

**Q: 如果用户不想迁移到云端怎么办？**
A: 保留本地存储模式作为选项，用户可以选择使用本地或云端模式。

**Q: 离线时如何使用？**
A: 实现离线队列，记录变更，网络恢复后自动同步。

**Q: 如何处理数据冲突？**
A: 使用乐观并发控制（version 字段），冲突时提示用户解决。

**Q: 数据安全性如何保障？**
A: 1. 使用 HTTPS 通信<br>2. RLS 策略隔离用户数据<br>3. 定期备份<br>4. 支持用户主动删除数据

---

**文档结束**
