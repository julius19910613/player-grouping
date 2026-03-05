-- ============================================
-- Supabase 数据库架构 - 篮球球员分组应用
-- ============================================
-- 版本: 1.0.0
-- 模式: 游客模式（匿名用户）
-- 创建日期: 2026-03-04
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. players 表 - 球员基本信息
-- ============================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- 匿名用户 UUID（从 localStorage 获取）
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK(position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_players_user_id ON public.players(user_id);
CREATE INDEX idx_players_user_active ON public.players(user_id, is_active);
CREATE INDEX idx_players_position ON public.players(position);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 2. player_skills 表 - 球员能力数据
-- ============================================
CREATE TABLE IF NOT EXISTS public.player_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- 用于 RLS 快速查询
  version INTEGER DEFAULT 1,

  -- 投篮能力
  two_point_shot INTEGER DEFAULT 50 CHECK(two_point_shot BETWEEN 1 AND 99),
  three_point_shot INTEGER DEFAULT 50 CHECK(three_point_shot BETWEEN 1 AND 99),
  free_throw INTEGER DEFAULT 50 CHECK(free_throw BETWEEN 1 AND 99),

  -- 组织能力
  passing INTEGER DEFAULT 50 CHECK(passing BETWEEN 1 AND 99),
  ball_control INTEGER DEFAULT 50 CHECK(ball_control BETWEEN 1 AND 99),
  court_vision INTEGER DEFAULT 50 CHECK(court_vision BETWEEN 1 AND 99),

  -- 防守能力
  perimeter_defense INTEGER DEFAULT 50 CHECK(perimeter_defense BETWEEN 1 AND 99),
  interior_defense INTEGER DEFAULT 50 CHECK(interior_defense BETWEEN 1 AND 99),
  steals INTEGER DEFAULT 50 CHECK(steals BETWEEN 1 AND 99),
  blocks INTEGER DEFAULT 50 CHECK(blocks BETWEEN 1 AND 99),

  -- 篮板能力
  offensive_rebound INTEGER DEFAULT 50 CHECK(offensive_rebound BETWEEN 1 AND 99),
  defensive_rebound INTEGER DEFAULT 50 CHECK(defensive_rebound BETWEEN 1 AND 99),

  -- 身体素质
  speed INTEGER DEFAULT 50 CHECK(speed BETWEEN 1 AND 99),
  strength INTEGER DEFAULT 50 CHECK(strength BETWEEN 1 AND 99),
  stamina INTEGER DEFAULT 50 CHECK(stamina BETWEEN 1 AND 99),
  vertical INTEGER DEFAULT 50 CHECK(vertical BETWEEN 1 AND 99),

  -- 篮球智商
  basketball_iq INTEGER DEFAULT 50 CHECK(basketball_iq BETWEEN 1 AND 99),
  teamwork INTEGER DEFAULT 50 CHECK(teamwork BETWEEN 1 AND 99),
  clutch INTEGER DEFAULT 50 CHECK(clutch BETWEEN 1 AND 99),

  -- 计算字段
  overall INTEGER DEFAULT 50,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_id, user_id)
);

-- 索引优化
CREATE INDEX idx_player_skills_player_id ON public.player_skills(player_id);
CREATE INDEX idx_player_skills_user_id ON public.player_skills(user_id);
CREATE INDEX idx_player_skills_overall ON public.player_skills(overall);

-- 更新 overall 计算逻辑的函数
CREATE OR REPLACE FUNCTION public.calculate_overall_skill()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall = (
    NEW.two_point_shot +
    NEW.three_point_shot +
    NEW.free_throw +
    NEW.passing +
    NEW.ball_control +
    NEW.court_vision +
    NEW.perimeter_defense +
    NEW.interior_defense +
    NEW.steals +
    NEW.blocks +
    NEW.offensive_rebound +
    NEW.defensive_rebound +
    NEW.speed +
    NEW.strength +
    NEW.stamina +
    NEW.vertical +
    NEW.basketball_iq +
    NEW.teamwork +
    NEW.clutch
  ) / 20;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_skills_calculate_overall
  BEFORE INSERT OR UPDATE ON public.player_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_overall_skill();

CREATE TRIGGER player_skills_updated_at
  BEFORE UPDATE ON public.player_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 3. grouping_history 表 - 分组历史记录
-- ============================================
CREATE TABLE IF NOT EXISTS public.grouping_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- 匿名用户 UUID

  -- 分组配置
  team_count INTEGER NOT NULL,
  strategy TEXT NOT NULL,
  players_per_team INTEGER,

  -- 分组结果数据（JSONB）
  data JSONB NOT NULL,

  -- 元数据
  player_count INTEGER NOT NULL,
  balance_score NUMERIC(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_grouping_history_user_id ON public.grouping_history(user_id);
CREATE INDEX idx_grouping_history_created_at ON public.grouping_history(created_at DESC);

-- ============================================
-- 4. Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grouping_history ENABLE ROW LEVEL SECURITY;

-- players 表的 RLS 策略
CREATE POLICY "用户可以查看自己的球员"
  ON public.players FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建球员"
  ON public.players FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以更新自己的球员"
  ON public.players FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的球员"
  ON public.players FOR DELETE
  USING (user_id = current_user_id());

-- player_skills 表的 RLS 策略
CREATE POLICY "用户可以查看自己的球员技能"
  ON public.player_skills FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建球员技能"
  ON public.player_skills FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以更新自己的球员技能"
  ON public.player_skills FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的球员技能"
  ON public.player_skills FOR DELETE
  USING (user_id = current_user_id());

-- grouping_history 表的 RLS 策略
CREATE POLICY "用户可以查看自己的分组历史"
  ON public.grouping_history FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "用户可以创建分组历史"
  ON public.grouping_history FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "用户可以删除自己的分组历史"
  ON public.grouping_history FOR DELETE
  USING (user_id = current_user_id());

-- ============================================
-- 5. 游客模式支持函数
-- ============================================

-- 自定义函数：获取当前用户 ID（用于匿名用户场景）
-- 注意：这是临时方案，实际使用中应该通过 Supabase Auth 实现
-- 此函数需要在前端调用时传递 user_id 参数，或者使用 Supabase Auth 的匿名用户功能

-- ============================================
-- 6. 数据验证辅助函数
-- ============================================

-- 验证技能值范围
CREATE OR REPLACE FUNCTION public.validate_skill_range(skill_value INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN skill_value BETWEEN 1 AND 99;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. 实施检查清单
-- ============================================
--
-- [ ] 1. 在 Supabase Dashboard 的 SQL Editor 中执行此文件
-- [ ] 2. 验证所有表已创建：检查 Table viewer
-- [ ] 3. 验证 RLS 策略已启用：检查 Authentication > Policies
-- [ ] 4. 测试连接：在前端应用中尝试插入测试数据
--
-- ============================================

-- 完成
SELECT 'Supabase schema created successfully!' AS status;
