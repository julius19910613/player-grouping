-- ============================================================================
-- Supabase Migration for Player Grouping Application
-- Phase 1: Matches, Player Match Stats, Skill Adjustments, Player Videos
-- ============================================================================

-- ============================================================================
-- 1. matches 表 - 比赛记录
-- ============================================================================

/**
 * matches 表 - 比赛记录
 */
CREATE TABLE IF NOT EXISTS matches (
  -- 主键：使用 UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用户关联
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 比赛基本信息
  match_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  venue TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('5v5', '3v3', 'custom')),
  
  -- 比赛结果
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  winner TEXT CHECK (winner IN ('team_a', 'team_b', 'draw')),
  
  -- 比赛数据
  team_a_players UUID[] DEFAULT '{}',
  team_b_players UUID[] DEFAULT '{}',
  
  -- 备注
  note TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE matches IS '比赛记录表';
COMMENT ON COLUMN matches.id IS '比赛唯一标识（UUID）';
COMMENT ON COLUMN matches.user_id IS '所属用户 ID（关联 auth.users）';
COMMENT ON COLUMN matches.match_date IS '比赛日期';
COMMENT ON COLUMN matches.venue IS '比赛地点';
COMMENT ON COLUMN matches.mode IS '比赛模式：5v5/3v3/custom';
COMMENT ON COLUMN matches.team_a_score IS 'A队得分';
COMMENT ON COLUMN matches.team_b_score IS 'B队得分';
COMMENT ON COLUMN matches.winner IS '获胜方：team_a/team_b/draw';
COMMENT ON COLUMN matches.team_a_players IS 'A队球员ID数组';
COMMENT ON COLUMN matches.team_b_players IS 'B队球员ID数组';
COMMENT ON COLUMN matches.note IS '备注信息';
COMMENT ON COLUMN matches.created_at IS '创建时间';
COMMENT ON COLUMN matches.updated_at IS '最后更新时间';

-- ============================================================================
-- 2. player_match_stats 表 - 球员比赛表现
-- ============================================================================

/**
 * player_match_stats 表 - 球员比赛表现统计
 */
CREATE TABLE IF NOT EXISTS player_match_stats (
  -- 主键：使用 UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  
  -- 所在队伍
  team TEXT NOT NULL CHECK (team IN ('team_a', 'team_b')),
  
  -- 比赛统计数据
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
  
  -- 高级数据
  plus_minus INTEGER DEFAULT 0,
  efficiency_rating REAL,
  
  -- 备注
  note TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：每场比赛每个球员只有一条记录
  UNIQUE(match_id, player_id)
);

COMMENT ON TABLE player_match_stats IS '球员比赛表现统计表';
COMMENT ON COLUMN player_match_stats.id IS '记录唯一标识（UUID）';
COMMENT ON COLUMN player_match_stats.match_id IS '比赛 ID（外键）';
COMMENT ON COLUMN player_match_stats.player_id IS '球员 ID（外键）';
COMMENT ON COLUMN player_match_stats.team IS '所在队伍：team_a/team_b';
COMMENT ON COLUMN player_match_stats.points IS '得分';
COMMENT ON COLUMN player_match_stats.rebounds IS '篮板';
COMMENT ON COLUMN player_match_stats.assists IS '助攻';
COMMENT ON COLUMN player_match_stats.steals IS '抢断';
COMMENT ON COLUMN player_match_stats.blocks IS '盖帽';
COMMENT ON COLUMN player_match_stats.turnovers IS '失误';
COMMENT ON COLUMN player_match_stats.fouls IS '犯规';
COMMENT ON COLUMN player_match_stats.minutes_played IS '上场时间（分钟）';
COMMENT ON COLUMN player_match_stats.field_goals_made IS '投篮命中数';
COMMENT ON COLUMN player_match_stats.field_goals_attempted IS '投篮出手数';
COMMENT ON COLUMN player_match_stats.three_pointers_made IS '三分命中数';
COMMENT ON COLUMN player_match_stats.three_pointers_attempted IS '三分出手数';
COMMENT ON COLUMN player_match_stats.free_throws_made IS '罚球命中数';
COMMENT ON COLUMN player_match_stats.free_throws_attempted IS '罚球出手数';
COMMENT ON COLUMN player_match_stats.plus_minus IS '正负值';
COMMENT ON COLUMN player_match_stats.efficiency_rating IS '效率值';
COMMENT ON COLUMN player_match_stats.note IS '备注';
COMMENT ON COLUMN player_match_stats.created_at IS '创建时间';
COMMENT ON COLUMN player_match_stats.updated_at IS '最后更新时间';

-- ============================================================================
-- 3. skill_adjustments 表 - 能力调整记录
-- ============================================================================

/**
 * skill_adjustments 表 - 球员能力调整记录
 */
CREATE TABLE IF NOT EXISTS skill_adjustments (
  -- 主键：使用 UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  -- 调整类型
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('match_performance', 'manual', 'ai_analysis', 'video_analysis')),
  
  -- 调整前后的能力值（JSONB 格式）
  skills_before JSONB NOT NULL,
  skills_after JSONB NOT NULL,
  
  -- 调整原因
  reason TEXT,
  
  -- 调整幅度（可选，用于快速查看）
  overall_change INTEGER DEFAULT 0,
  
  -- 审核状态
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- 审核人
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE skill_adjustments IS '球员能力调整记录表';
COMMENT ON COLUMN skill_adjustments.id IS '记录唯一标识（UUID）';
COMMENT ON COLUMN skill_adjustments.player_id IS '球员 ID（外键）';
COMMENT ON COLUMN skill_adjustments.match_id IS '关联比赛 ID（可选）';
COMMENT ON COLUMN skill_adjustments.adjustment_type IS '调整类型：match_performance/manual/ai_analysis/video_analysis';
COMMENT ON COLUMN skill_adjustments.skills_before IS '调整前的能力值（JSONB）';
COMMENT ON COLUMN skill_adjustments.skills_after IS '调整后的能力值（JSONB）';
COMMENT ON COLUMN skill_adjustments.reason IS '调整原因';
COMMENT ON COLUMN skill_adjustments.overall_change IS 'overall 变化值';
COMMENT ON COLUMN skill_adjustments.status IS '审核状态：pending/approved/rejected';
COMMENT ON COLUMN skill_adjustments.reviewed_by IS '审核人 ID';
COMMENT ON COLUMN skill_adjustments.reviewed_at IS '审核时间';
COMMENT ON COLUMN skill_adjustments.created_at IS '创建时间';
COMMENT ON COLUMN skill_adjustments.updated_at IS '最后更新时间';

-- ============================================================================
-- 4. player_videos 表 - 球员视频
-- ============================================================================

/**
 * player_videos 表 - 球员视频记录
 */
CREATE TABLE IF NOT EXISTS player_videos (
  -- 主键：使用 UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  -- 用户关联
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 视频信息
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,  -- 视频时长（秒）
  
  -- 视频类型
  video_type TEXT NOT NULL CHECK (video_type IN ('match', 'training', 'highlight', 'analysis')),
  
  -- 视频状态
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  
  -- AI 分析结果（JSONB 格式）
  ai_analysis JSONB,
  
  -- 标签
  tags TEXT[] DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE player_videos IS '球员视频记录表';
COMMENT ON COLUMN player_videos.id IS '视频唯一标识（UUID）';
COMMENT ON COLUMN player_videos.player_id IS '球员 ID（外键）';
COMMENT ON COLUMN player_videos.match_id IS '关联比赛 ID（可选）';
COMMENT ON COLUMN player_videos.user_id IS '所属用户 ID';
COMMENT ON COLUMN player_videos.title IS '视频标题';
COMMENT ON COLUMN player_videos.description IS '视频描述';
COMMENT ON COLUMN player_videos.video_url IS '视频 URL';
COMMENT ON COLUMN player_videos.thumbnail_url IS '缩略图 URL';
COMMENT ON COLUMN player_videos.duration IS '视频时长（秒）';
COMMENT ON COLUMN player_videos.video_type IS '视频类型：match/training/highlight/analysis';
COMMENT ON COLUMN player_videos.status IS '视频状态：pending/processing/ready/error';
COMMENT ON COLUMN player_videos.ai_analysis IS 'AI 分析结果（JSONB）';
COMMENT ON COLUMN player_videos.tags IS '标签数组';
COMMENT ON COLUMN player_videos.created_at IS '创建时间';
COMMENT ON COLUMN player_videos.updated_at IS '最后更新时间';

-- ============================================================================
-- 5. Indexes
-- ============================================================================

-- matches 表索引
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_mode ON matches(mode);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner);

COMMENT ON INDEX idx_matches_user_id IS '按用户查询比赛';
COMMENT ON INDEX idx_matches_match_date IS '按比赛日期倒序查询';
COMMENT ON INDEX idx_matches_mode IS '按比赛模式查询';
COMMENT ON INDEX idx_matches_winner IS '按获胜方查询';

-- player_match_stats 表索引
CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON player_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_player_id ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_team ON player_match_stats(team);

COMMENT ON INDEX idx_player_match_stats_match_id IS '按比赛查询统计数据';
COMMENT ON INDEX idx_player_match_stats_player_id IS '按球员查询统计数据';
COMMENT ON INDEX idx_player_match_stats_team IS '按队伍查询统计数据';

-- skill_adjustments 表索引
CREATE INDEX IF NOT EXISTS idx_skill_adjustments_player_id ON skill_adjustments(player_id);
CREATE INDEX IF NOT EXISTS idx_skill_adjustments_match_id ON skill_adjustments(match_id);
CREATE INDEX IF NOT EXISTS idx_skill_adjustments_type ON skill_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_skill_adjustments_status ON skill_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_skill_adjustments_created_at ON skill_adjustments(created_at DESC);

COMMENT ON INDEX idx_skill_adjustments_player_id IS '按球员查询调整记录';
COMMENT ON INDEX idx_skill_adjustments_match_id IS '按比赛查询调整记录';
COMMENT ON INDEX idx_skill_adjustments_type IS '按调整类型查询';
COMMENT ON INDEX idx_skill_adjustments_status IS '按审核状态查询';
COMMENT ON INDEX idx_skill_adjustments_created_at IS '按创建时间倒序查询';

-- player_videos 表索引
CREATE INDEX IF NOT EXISTS idx_player_videos_player_id ON player_videos(player_id);
CREATE INDEX IF NOT EXISTS idx_player_videos_match_id ON player_videos(match_id);
CREATE INDEX IF NOT EXISTS idx_player_videos_user_id ON player_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_player_videos_video_type ON player_videos(video_type);
CREATE INDEX IF NOT EXISTS idx_player_videos_status ON player_videos(status);
CREATE INDEX IF NOT EXISTS idx_player_videos_created_at ON player_videos(created_at DESC);

COMMENT ON INDEX idx_player_videos_player_id IS '按球员查询视频';
COMMENT ON INDEX idx_player_videos_match_id IS '按比赛查询视频';
COMMENT ON INDEX idx_player_videos_user_id IS '按用户查询视频';
COMMENT ON INDEX idx_player_videos_video_type IS '按视频类型查询';
COMMENT ON INDEX idx_player_videos_status IS '按视频状态查询';
COMMENT ON INDEX idx_player_videos_created_at IS '按创建时间倒序查询';

-- ============================================================================
-- 6. Triggers
-- ============================================================================

-- matches 表：自动更新 updated_at
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_matches_updated_at ON matches IS
'更新 matches 表时自动设置 updated_at = NOW()';

-- player_match_stats 表：自动更新 updated_at
DROP TRIGGER IF EXISTS update_player_match_stats_updated_at ON player_match_stats;
CREATE TRIGGER update_player_match_stats_updated_at
  BEFORE UPDATE ON player_match_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_player_match_stats_updated_at ON player_match_stats IS
'更新 player_match_stats 表时自动设置 updated_at = NOW()';

-- skill_adjustments 表：自动更新 updated_at
DROP TRIGGER IF EXISTS update_skill_adjustments_updated_at ON skill_adjustments;
CREATE TRIGGER update_skill_adjustments_updated_at
  BEFORE UPDATE ON skill_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_skill_adjustments_updated_at ON skill_adjustments IS
'更新 skill_adjustments 表时自动设置 updated_at = NOW()';

-- player_videos 表：自动更新 updated_at
DROP TRIGGER IF EXISTS update_player_videos_updated_at ON player_videos;
CREATE TRIGGER update_player_videos_updated_at
  BEFORE UPDATE ON player_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_player_videos_updated_at ON player_videos IS
'更新 player_videos 表时自动设置 updated_at = NOW()';

-- ============================================================================
-- 7. RLS (Row Level Security) Policies
-- ============================================================================

-- 启用 RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_videos ENABLE ROW LEVEL SECURITY;

-- matches 表 RLS 策略
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own matches" ON matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches" ON matches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches" ON matches
  FOR DELETE USING (auth.uid() = user_id);

-- player_match_stats 表 RLS 策略
CREATE POLICY "Users can view their own player stats" ON player_match_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches WHERE matches.id = player_match_stats.match_id AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own player stats" ON player_match_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches WHERE matches.id = player_match_stats.match_id AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own player stats" ON player_match_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matches WHERE matches.id = player_match_stats.match_id AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own player stats" ON player_match_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matches WHERE matches.id = player_match_stats.match_id AND matches.user_id = auth.uid()
    )
  );

-- skill_adjustments 表 RLS 策略
CREATE POLICY "Users can view their own skill adjustments" ON skill_adjustments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = skill_adjustments.player_id AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own skill adjustments" ON skill_adjustments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = skill_adjustments.player_id AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own skill adjustments" ON skill_adjustments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = skill_adjustments.player_id AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own skill adjustments" ON skill_adjustments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = skill_adjustments.player_id AND players.user_id = auth.uid()
    )
  );

-- player_videos 表 RLS 策略
CREATE POLICY "Users can view their own videos" ON player_videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON player_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON player_videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON player_videos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Migration 创建完成
-- ============================================================================
