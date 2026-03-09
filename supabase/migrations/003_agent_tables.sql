-- Phase 1: Basketball Agent 数据库表
-- 创建时间: 2026-03-09
-- 描述: 添加比赛历史、球员比赛数据和媒体上传记录表

-- ============================================================================
-- matches 表（比赛历史）
-- ============================================================================
-- 用于存储每场比赛的基本信息、分组结果和比赛结果
CREATE TABLE IF NOT EXISTS matches (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 比赛基本信息
  date DATE NOT NULL,
  venue TEXT,
  mode TEXT CHECK (mode IN ('5v5', '3v3', 'custom')),

  -- 分组信息（JSONB）
  -- 存储格式: { "team1": ["player1", "player2"], "team2": ["player3", "player4"] }
  teams JSONB NOT NULL,

  -- 比赛结果（JSONB）
  -- 存储格式: { "team1_score": 21, "team2_score": 18, "winner": "team1" }
  result JSONB,

  -- 备注
  notes TEXT,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_mode ON matches(mode);

-- 添加注释
COMMENT ON TABLE matches IS '比赛历史记录表';
COMMENT ON COLUMN matches.date IS '比赛日期';
COMMENT ON COLUMN matches.venue IS '比赛场地';
COMMENT ON COLUMN matches.mode IS '比赛模式：5v5、3v3 或自定义';
COMMENT ON COLUMN matches.teams IS '球队分组信息（JSONB）';
COMMENT ON COLUMN matches.result IS '比赛结果（JSONB）';
COMMENT ON COLUMN matches.notes IS '比赛备注说明';

-- ============================================================================
-- player_match_stats 表（球员比赛数据）
-- ============================================================================
-- 用于存储每名球员在每场比赛中的详细统计数据
CREATE TABLE IF NOT EXISTS player_match_stats (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外键关联
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- 基础数据
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  rebounds INTEGER DEFAULT 0 CHECK (rebounds >= 0),
  assists INTEGER DEFAULT 0 CHECK (assists >= 0),
  steals INTEGER DEFAULT 0 CHECK (steals >= 0),
  blocks INTEGER DEFAULT 0 CHECK (blocks >= 0),

  -- 高级数据
  turnovers INTEGER DEFAULT 0 CHECK (turnovers >= 0),
  fouls INTEGER DEFAULT 0 CHECK (fouls >= 0),
  minutes_played INTEGER DEFAULT 0 CHECK (minutes_played >= 0),

  -- 效率值（自动计算）
  efficiency_rating REAL DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 唯一约束：同一球员在同一比赛中只有一条记录
  UNIQUE(match_id, player_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON player_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_player_id ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_points ON player_match_stats(points DESC);

-- 添加注释
COMMENT ON TABLE player_match_stats IS '球员比赛统计数据表';
COMMENT ON COLUMN player_match_stats.match_id IS '关联的比赛ID';
COMMENT ON COLUMN player_match_stats.player_id IS '关联的球员ID';
COMMENT ON COLUMN player_match_stats.points IS '得分';
COMMENT ON COLUMN player_match_stats.rebounds IS '篮板';
COMMENT ON COLUMN player_match_stats.assists IS '助攻';
COMMENT ON COLUMN player_match_stats.steals IS '抢断';
COMMENT ON COLUMN player_match_stats.blocks IS '盖帽';
COMMENT ON COLUMN player_match_stats.turnovers IS '失误';
COMMENT ON COLUMN player_match_stats.fouls IS '犯规';
COMMENT ON COLUMN player_match_stats.minutes_played IS '上场时间（分钟）';
COMMENT ON COLUMN player_match_stats.efficiency_rating IS '效率值（自动计算）';

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- media_uploads 表（上传文件记录）
-- ============================================================================
-- 用于存储上传的媒体文件信息和多模态分析结果
CREATE TABLE IF NOT EXISTS media_uploads (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户标识（匿名用户 ID）
  user_id TEXT,

  -- 文件信息
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'video', 'document')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  file_url TEXT NOT NULL,

  -- 分析状态
  analysis_status TEXT CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  analysis_result JSONB,

  -- 关联数据（可选）
  related_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  related_player_id UUID REFERENCES players(id) ON DELETE SET NULL,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_file_type ON media_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_media_uploads_analysis_status ON media_uploads(analysis_status);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created_at ON media_uploads(created_at DESC);

-- 添加注释
COMMENT ON TABLE media_uploads IS '媒体文件上传记录表';
COMMENT ON COLUMN media_uploads.user_id IS '用户ID（匿名）';
COMMENT ON COLUMN media_uploads.file_name IS '文件名称';
COMMENT ON COLUMN media_uploads.file_type IS '文件类型：image、video 或 document';
COMMENT ON COLUMN media_uploads.file_size IS '文件大小（字节）';
COMMENT ON COLUMN media_uploads.file_url IS '文件存储 URL（Vercel Blob）';
COMMENT ON COLUMN media_uploads.analysis_status IS '分析状态：pending、processing、completed、failed';
COMMENT ON COLUMN media_uploads.analysis_result IS '分析结果（JSONB）';
COMMENT ON COLUMN media_uploads.related_match_id IS '关联的比赛ID（可选）';
COMMENT ON COLUMN media_uploads.related_player_id IS '关联的球员ID（可选）';

-- 创建触发器：自动更新 updated_at
CREATE TRIGGER update_media_uploads_updated_at
  BEFORE UPDATE ON media_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
