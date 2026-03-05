-- ============================================================================
-- Supabase Schema for Player Grouping Application
-- Phase 1: Database Tables, Indexes, and Triggers
-- ============================================================================

-- ============================================================================
-- 1. Helper Functions
-- ============================================================================

/**
 * 自动更新 updated_at 字段的触发器函数
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS
'自动更新 updated_at 字段为当前时间';

/**
 * 根据位置自动计算 overall（总体能力值）的触发器函数
 * 使用位置加权算法，模拟 NBA 2K 系列的 OVR 计算逻辑
 */
CREATE OR REPLACE FUNCTION calculate_overall()
RETURNS TRIGGER AS $$
DECLARE
  position TEXT;
  weighted_sum REAL := 0;
  weight_sum REAL := 0;
BEGIN
  -- 获取球员位置
  SELECT p.position INTO position
  FROM players p
  WHERE p.id = NEW.player_id;

  -- 根据位置计算加权 overall
  CASE position
    WHEN 'PG' THEN
      -- 控卫：传球、控球、视野、三分权重高
      weighted_sum := NEW.passing * 1.5 + NEW.ball_control * 1.3 + NEW.court_vision * 1.3 +
                      NEW.three_point_shot * 1.2 + NEW.two_point_shot * 1.0 +
                      NEW.speed * 1.2 + NEW.steals * 1.1 + NEW.basketball_iq * 1.2 +
                      NEW.free_throw * 0.8 + NEW.perimeter_defense * 1.0 +
                      NEW.interior_defense * 0.6 + NEW.blocks * 0.5 +
                      NEW.offensive_rebound * 0.6 + NEW.defensive_rebound * 0.7 +
                      NEW.strength * 0.8 + NEW.stamina * 0.9 + NEW.vertical * 0.8 +
                      NEW.teamwork * 1.1 + NEW.clutch * 1.0;
      weight_sum := 20.4;

    WHEN 'SG' THEN
      -- 得分后卫：投篮、三分、速度权重高
      weighted_sum := NEW.three_point_shot * 1.4 + NEW.two_point_shot * 1.3 +
                      NEW.free_throw * 1.1 + NEW.speed * 1.2 + NEW.vertical * 1.1 +
                      NEW.perimeter_defense * 1.1 + NEW.steals * 1.0 +
                      NEW.ball_control * 1.0 + NEW.passing * 0.9 +
                      NEW.court_vision * 0.9 + NEW.basketball_iq * 1.0 +
                      NEW.interior_defense * 0.7 + NEW.blocks * 0.7 +
                      NEW.offensive_rebound * 0.6 + NEW.defensive_rebound * 0.7 +
                      NEW.strength * 0.8 + NEW.stamina * 0.9 + NEW.teamwork * 0.9 +
                      NEW.clutch * 1.2;
      weight_sum := 20.7;

    WHEN 'SF' THEN
      -- 小前锋：全面型，各能力均衡
      weighted_sum := NEW.two_point_shot * 1.2 + NEW.three_point_shot * 1.1 +
                      NEW.speed * 1.1 + NEW.strength * 1.1 + NEW.vertical * 1.1 +
                      NEW.perimeter_defense * 1.1 + NEW.interior_defense * 1.0 +
                      NEW.steals * 1.0 + NEW.blocks * 1.0 +
                      NEW.offensive_rebound * 0.9 + NEW.defensive_rebound * 1.0 +
                      NEW.passing * 0.9 + NEW.ball_control * 1.0 +
                      NEW.court_vision * 0.9 + NEW.basketball_iq * 1.1 +
                      NEW.free_throw * 0.9 + NEW.stamina * 0.9 +
                      NEW.teamwork * 1.0 + NEW.clutch * 1.1;
      weight_sum := 21.3;

    WHEN 'PF' THEN
      -- 大前锋：篮板、内线、力量权重高
      weighted_sum := NEW.offensive_rebound * 1.4 + NEW.defensive_rebound * 1.4 +
                      NEW.interior_defense * 1.3 + NEW.blocks * 1.2 +
                      NEW.strength * 1.3 + NEW.vertical * 1.1 +
                      NEW.two_point_shot * 1.1 + NEW.perimeter_defense * 0.9 +
                      NEW.steals * 0.8 + NEW.speed * 0.9 +
                      NEW.passing * 0.8 + NEW.ball_control * 0.8 +
                      NEW.court_vision * 0.8 + NEW.three_point_shot * 0.8 +
                      NEW.free_throw * 0.8 + NEW.stamina * 0.9 +
                      NEW.basketball_iq * 1.0 + NEW.teamwork * 1.0 + NEW.clutch * 1.0;
      weight_sum := 21.3;

    WHEN 'C' THEN
      -- 中锋：篮板、盖帽、内线、力量权重高
      weighted_sum := NEW.offensive_rebound * 1.5 + NEW.defensive_rebound * 1.5 +
                      NEW.blocks * 1.4 + NEW.interior_defense * 1.4 +
                      NEW.strength * 1.4 + NEW.vertical * 1.2 +
                      NEW.two_point_shot * 1.1 + NEW.perimeter_defense * 0.7 +
                      NEW.steals * 0.6 + NEW.speed * 0.7 +
                      NEW.passing * 0.7 + NEW.ball_control * 0.7 +
                      NEW.court_vision * 0.7 + NEW.three_point_shot * 0.6 +
                      NEW.free_throw * 0.7 + NEW.stamina * 0.9 +
                      NEW.basketball_iq * 1.0 + NEW.teamwork * 1.0 + NEW.clutch * 1.0;
      weight_sum := 20.8;

    ELSE
      -- UTILITY 或默认：简单平均
      weighted_sum := NEW.two_point_shot + NEW.three_point_shot + NEW.free_throw +
                      NEW.passing + NEW.ball_control + NEW.court_vision +
                      NEW.perimeter_defense + NEW.interior_defense + NEW.steals + NEW.blocks +
                      NEW.offensive_rebound + NEW.defensive_rebound +
                      NEW.speed + NEW.strength + NEW.stamina + NEW.vertical +
                      NEW.basketball_iq + NEW.teamwork + NEW.clutch;
      weight_sum := 19.0;
  END CASE;

  -- 计算加权平均并四舍五入到整数
  NEW.overall := ROUND(weighted_sum / weight_sum);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_overall() IS
'根据球员位置自动计算 overall（总体能力值），使用位置加权算法';

-- ============================================================================
-- 2. Tables
-- ============================================================================

/**
 * players 表 - 球员基础信息
 */
CREATE TABLE IF NOT EXISTS players (
  -- 主键：使用 UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用户关联（游客模式下由匿名认证生成）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 球员基本信息
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C', 'UTILITY')),
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE players IS '球员基础信息表';
COMMENT ON COLUMN players.id IS '球员唯一标识（UUID）';
COMMENT ON COLUMN players.user_id IS '所属用户 ID（关联 auth.users）';
COMMENT ON COLUMN players.name IS '球员姓名';
COMMENT ON COLUMN players.position IS '位置：PG/SG/SF/PF/C/UTILITY';
COMMENT ON COLUMN players.created_at IS '创建时间';
COMMENT ON COLUMN players.updated_at IS '最后更新时间';

/**
 * player_skills 表 - 球员能力值（19 项 + overall）
 */
CREATE TABLE IF NOT EXISTS player_skills (
  -- 主键：关联到 players 表
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,

  -- 投篮能力（4 项）
  two_point_shot INTEGER DEFAULT 50 CHECK (two_point_shot BETWEEN 1 AND 99),
  three_point_shot INTEGER DEFAULT 50 CHECK (three_point_shot BETWEEN 1 AND 99),
  free_throw INTEGER DEFAULT 50 CHECK (free_throw BETWEEN 1 AND 99),

  -- 组织能力（3 项）
  passing INTEGER DEFAULT 50 CHECK (passing BETWEEN 1 AND 99),
  ball_control INTEGER DEFAULT 50 CHECK (ball_control BETWEEN 1 AND 99),
  court_vision INTEGER DEFAULT 50 CHECK (court_vision BETWEEN 1 AND 99),

  -- 防守能力（4 项）
  perimeter_defense INTEGER DEFAULT 50 CHECK (perimeter_defense BETWEEN 1 AND 99),
  interior_defense INTEGER DEFAULT 50 CHECK (interior_defense BETWEEN 1 AND 99),
  steals INTEGER DEFAULT 50 CHECK (steals BETWEEN 1 AND 99),
  blocks INTEGER DEFAULT 50 CHECK (blocks BETWEEN 1 AND 99),

  -- 篮板能力（2 项）
  offensive_rebound INTEGER DEFAULT 50 CHECK (offensive_rebound BETWEEN 1 AND 99),
  defensive_rebound INTEGER DEFAULT 50 CHECK (defensive_rebound BETWEEN 1 AND 99),

  -- 身体素质（4 项）
  speed INTEGER DEFAULT 50 CHECK (speed BETWEEN 1 AND 99),
  strength INTEGER DEFAULT 50 CHECK (strength BETWEEN 1 AND 99),
  stamina INTEGER DEFAULT 50 CHECK (stamina BETWEEN 1 AND 99),
  vertical INTEGER DEFAULT 50 CHECK (vertical BETWEEN 1 AND 99),

  -- 篮球智商（3 项）
  basketball_iq INTEGER DEFAULT 50 CHECK (basketball_iq BETWEEN 1 AND 99),
  teamwork INTEGER DEFAULT 50 CHECK (teamwork BETWEEN 1 AND 99),
  clutch INTEGER DEFAULT 50 CHECK (clutch BETWEEN 1 AND 99),

  -- 总体能力（自动计算）
  overall INTEGER DEFAULT 50 CHECK (overall BETWEEN 1 AND 99),

  -- 时间戳
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE player_skills IS '球员能力值表（19 项能力 + overall）';
COMMENT ON COLUMN player_skills.player_id IS '球员 ID（外键关联 players.id）';
COMMENT ON COLUMN player_skills.overall IS '总体能力值（自动计算，基于位置加权）';
COMMENT ON COLUMN player_skills.updated_at IS '最后更新时间';

/**
 * grouping_history 表 - 分组历史记录
 */
CREATE TABLE IF NOT EXISTS grouping_history (
  -- 主键：使用 BIGSERIAL
  id BIGSERIAL PRIMARY KEY,
  
  -- 用户关联
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 分组信息
  mode TEXT NOT NULL CHECK (mode IN ('5v5', '3v3', 'custom')),
  team_count INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  balance_score REAL,
  
  -- 分组数据（JSONB 格式）
  data JSONB NOT NULL,
  
  -- 备注
  note TEXT
);

COMMENT ON TABLE grouping_history IS '分组历史记录表';
COMMENT ON COLUMN grouping_history.id IS '记录唯一标识（自增）';
COMMENT ON COLUMN grouping_history.user_id IS '所属用户 ID（关联 auth.users）';
COMMENT ON COLUMN grouping_history.mode IS '分组模式：5v5/3v3/custom';
COMMENT ON COLUMN grouping_history.team_count IS '队伍数量';
COMMENT ON COLUMN grouping_history.player_count IS '球员数量';
COMMENT ON COLUMN grouping_history.balance_score IS '平衡度评分（0-100）';
COMMENT ON COLUMN grouping_history.data IS '分组详细数据（JSONB 格式）';
COMMENT ON COLUMN grouping_history.note IS '备注信息';

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- players 表索引
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at DESC);

COMMENT ON INDEX idx_players_user_id IS '按用户查询球员';
COMMENT ON INDEX idx_players_created_at IS '按创建时间倒序查询';

-- player_skills 表索引
-- player_id 已是主键，自带索引

-- grouping_history 表索引
CREATE INDEX IF NOT EXISTS idx_grouping_history_user_id ON grouping_history(user_id);
CREATE INDEX IF NOT EXISTS idx_grouping_history_created_at ON grouping_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grouping_history_mode ON grouping_history(mode);

COMMENT ON INDEX idx_grouping_history_user_id IS '按用户查询分组历史';
COMMENT ON INDEX idx_grouping_history_created_at IS '按创建时间倒序查询';
COMMENT ON INDEX idx_grouping_history_mode IS '按分组模式查询';

-- ============================================================================
-- 4. Triggers
-- ============================================================================

-- players 表：自动更新 updated_at
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_players_updated_at ON players IS
'更新 players 表时自动设置 updated_at = NOW()';

-- player_skills 表：自动更新 updated_at
DROP TRIGGER IF EXISTS update_player_skills_updated_at ON player_skills;
CREATE TRIGGER update_player_skills_updated_at
  BEFORE UPDATE ON player_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_player_skills_updated_at ON player_skills IS
'更新 player_skills 表时自动设置 updated_at = NOW()';

-- player_skills 表：自动计算 overall
DROP TRIGGER IF EXISTS calculate_player_overall ON player_skills;
CREATE TRIGGER calculate_player_overall
  BEFORE INSERT OR UPDATE ON player_skills
  FOR EACH ROW
  EXECUTE FUNCTION calculate_overall();

COMMENT ON TRIGGER calculate_player_overall ON player_skills IS
'插入或更新 player_skills 时自动计算 overall（基于位置加权）';

-- ============================================================================
-- 5. 初始化数据（可选）
-- ============================================================================

-- 无需初始化数据，所有数据由用户创建

-- ============================================================================
-- Schema 创建完成
-- ============================================================================
