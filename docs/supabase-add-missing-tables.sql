-- ============================================
-- Supabase 数据库架构补充 - 比赛相关表
-- ============================================
-- 用途：添加聊天 API 需要的缺失表
-- 创建日期: 2026-03-11
-- ============================================

-- ============================================
-- 1. matches 表 - 比赛记录
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,

  -- 比赛基本信息
  match_date DATE NOT NULL,
  venue TEXT,
  mode TEXT NOT NULL CHECK(mode IN ('5v5', '3v3', 'custom')),

  -- 比分
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  winner TEXT CHECK(winner IN ('team_a', 'team_b', 'draw')),

  -- 球员列表 (JSONB)
  team_a_players JSONB DEFAULT '[]'::jsonb,
  team_b_players JSONB DEFAULT '[]'::jsonb,

  -- 备注
  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_matches_user_id ON public.matches(user_id);
CREATE INDEX idx_matches_date ON public.matches(match_date DESC);
CREATE INDEX idx_matches_mode ON public.matches(mode);

-- 触发器：自动更新 updated_at
CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 2. player_match_stats 表 - 球员比赛表现统计
-- ============================================
CREATE TABLE IF NOT EXISTS public.player_match_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- 队伍信息
  team TEXT NOT NULL CHECK(team IN ('team_a', 'team_b')),

  -- 基本统计
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,

  -- 投篮统计
  field_goals_made INTEGER DEFAULT 0,
  field_goals_attempted INTEGER DEFAULT 0,
  three_pointers_made INTEGER DEFAULT 0,
  three_pointers_attempted INTEGER DEFAULT 0,
  free_throws_made INTEGER DEFAULT 0,
  free_throws_attempted INTEGER DEFAULT 0,

  -- 高级统计
  plus_minus INTEGER DEFAULT 0,
  efficiency_rating NUMERIC(10, 2),

  -- 备注
  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(match_id, player_id)
);

-- 索引
CREATE INDEX idx_player_match_stats_match_id ON public.player_match_stats(match_id);
CREATE INDEX idx_player_match_stats_player_id ON public.player_match_stats(player_id);
CREATE INDEX idx_player_match_stats_user_id ON public.player_match_stats(user_id);
CREATE INDEX idx_player_match_stats_points ON public.player_match_stats(points DESC);

-- 触发器：自动更新 updated_at
CREATE TRIGGER player_match_stats_updated_at
  BEFORE UPDATE ON public.player_match_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 3. skill_adjustments 表 - 能力调整记录
-- ============================================
CREATE TABLE IF NOT EXISTS public.skill_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,

  -- 调整类型
  adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('match_performance', 'manual', 'ai_analysis', 'video_analysis')),

  -- 技能变化 (JSONB)
  skills_before JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills_after JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 总体变化
  overall_change INTEGER DEFAULT 0,

  -- 审核信息
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  -- 原因
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_skill_adjustments_player_id ON public.skill_adjustments(player_id);
CREATE INDEX idx_skill_adjustments_match_id ON public.skill_adjustments(match_id);
CREATE INDEX idx_skill_adjustments_user_id ON public.skill_adjustments(user_id);
CREATE INDEX idx_skill_adjustments_status ON public.skill_adjustments(status);
CREATE INDEX idx_skill_adjustments_type ON public.skill_adjustments(adjustment_type);

-- 触发器：自动更新 updated_at
CREATE TRIGGER skill_adjustments_updated_at
  BEFORE UPDATE ON public.skill_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 4. player_videos 表 - 球员视频记录
-- ============================================
CREATE TABLE IF NOT EXISTS public.player_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,

  -- 视频基本信息
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- 秒

  -- 视频类型和状态
  video_type TEXT NOT NULL CHECK(video_type IN ('match', 'training', 'highlight', 'analysis')) DEFAULT 'match',
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'ready', 'error')) DEFAULT 'pending',

  -- AI 分析 (JSONB)
  ai_analysis JSONB DEFAULT '{}'::jsonb,

  -- 标签 (数组)
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_player_videos_player_id ON public.player_videos(player_id);
CREATE INDEX idx_player_videos_match_id ON public.player_videos(match_id);
CREATE INDEX idx_player_videos_user_id ON public.player_videos(user_id);
CREATE INDEX idx_player_videos_type ON public.player_videos(video_type);
CREATE INDEX idx_player_videos_status ON public.player_videos(status);
CREATE INDEX idx_player_videos_tags ON public.player_videos USING GIN(tags);

-- 触发器：自动更新 updated_at
CREATE TRIGGER player_videos_updated_at
  BEFORE UPDATE ON public.player_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_videos ENABLE ROW LEVEL SECURITY;

-- matches 表的 RLS 策略
CREATE POLICY "用户可以查看自己的比赛"
  ON public.matches FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建比赛"
  ON public.matches FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以更新自己的比赛"
  ON public.matches FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的比赛"
  ON public.matches FOR DELETE
  USING (user_id = current_user_id());

-- player_match_stats 表的 RLS 策略
CREATE POLICY "用户可以查看自己的比赛表现"
  ON public.player_match_stats FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建比赛表现"
  ON public.player_match_stats FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以更新自己的比赛表现"
  ON public.player_match_stats FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的比赛表现"
  ON public.player_match_stats FOR DELETE
  USING (user_id = current_user_id());

-- skill_adjustments 表的 RLS 策略
CREATE POLICY "用户可以查看自己的能力调整"
  ON public.skill_adjustments FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建能力调整"
  ON public.skill_adjustments FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以更新自己的能力调整"
  ON public.skill_adjustments FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的能力调整"
  ON public.skill_adjustments FOR DELETE
  USING (user_id = current_user_id());

-- player_videos 表的 RLS 策略
CREATE POLICY "用户可以查看自己的视频"
  ON public.player_videos FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建视频"
  ON public.player_videos FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以更新自己的视频"
  ON public.player_videos FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的视频"
  ON public.player_videos FOR DELETE
  USING (user_id = current_user_id());

-- ============================================
-- 完成
-- ============================================
SELECT 'Supabase schema updated with missing tables successfully!' AS status;
