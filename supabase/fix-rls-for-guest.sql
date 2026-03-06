-- ============================================================================
-- 修复 RLS 策略：支持游客模式访问公共数据
-- ============================================================================

-- ============================================================================
-- 1. 删除旧的 players 表 RLS 策略
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own players" ON players;
DROP POLICY IF EXISTS "Users can insert own players" ON players;
DROP POLICY IF EXISTS "Users can update own players" ON players;
DROP POLICY IF EXISTS "Users can delete own players" ON players;

-- ============================================================================
-- 2. 创建新的 players 表 RLS 策略（支持游客模式）
-- ============================================================================

-- 策略 1: 所有人可以查看公共球员（user_id=null）或自己的球员
CREATE POLICY "Users can view public or own players"
  ON players
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

COMMENT ON POLICY "Users can view public or own players" ON players IS
'游客和用户可以查看公共球员（user_id=null）或自己的球员数据';

-- 策略 2: 认证用户可以插入球员（user_id 自动设为当前用户）
CREATE POLICY "Users can insert own players"
  ON players
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

COMMENT ON POLICY "Users can insert own players" ON players IS
'认证用户插入球员时，user_id 必须与当前用户一致，或为 null（公共数据）';

-- 策略 3: 用户只能更新自己的球员
CREATE POLICY "Users can update own players"
  ON players
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update own players" ON players IS
'用户只能更新 user_id 匹配的球员数据';

-- 策略 4: 用户只能删除自己的球员
CREATE POLICY "Users can delete own players"
  ON players
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own players" ON players IS
'用户只能删除 user_id 匹配的球员数据';

-- ============================================================================
-- 3. player_skills 表 RLS 策略（同样支持游客模式）
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own player skills" ON player_skills;
DROP POLICY IF EXISTS "Users can insert own player skills" ON player_skills;
DROP POLICY IF EXISTS "Users can update own player skills" ON player_skills;
DROP POLICY IF EXISTS "Users can delete own player skills" ON player_skills;

-- 策略 1: 所有人可以查看公共或自己的球员技能
CREATE POLICY "Users can view public or own player skills"
  ON player_skills
  FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players 
      WHERE user_id IS NULL OR auth.uid() = user_id
    )
  );

COMMENT ON POLICY "Users can view public or own player skills" ON player_skills IS
'游客和用户可以查看公共球员或自己球员的技能数据';

-- 策略 2: 认证用户可以插入球员技能
CREATE POLICY "Users can insert own player skills"
  ON player_skills
  FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE auth.uid() = user_id
    )
  );

-- 策略 3: 用户只能更新自己的球员技能
CREATE POLICY "Users can update own player skills"
  ON player_skills
  FOR UPDATE
  USING (
    player_id IN (
      SELECT id FROM players WHERE auth.uid() = user_id
    )
  )
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE auth.uid() = user_id
    )
  );

-- 策略 4: 用户只能删除自己的球员技能
CREATE POLICY "Users can delete own player skills"
  ON player_skills
  FOR DELETE
  USING (
    player_id IN (
      SELECT id FROM players WHERE auth.uid() = user_id
    )
  );

-- ============================================================================
-- 4. 其他表的 RLS 策略（同样支持游客模式查看公共数据）
-- ============================================================================

-- matches 表
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view public or own matches"
  ON matches
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- player_match_stats 表
DROP POLICY IF EXISTS "Users can view own player match stats" ON player_match_stats;
CREATE POLICY "Users can view public or own player match stats"
  ON player_match_stats
  FOR SELECT
  USING (
    match_id IN (
      SELECT id FROM matches 
      WHERE user_id IS NULL OR auth.uid() = user_id
    )
  );

-- skill_adjustments 表
DROP POLICY IF EXISTS "Users can view own skill adjustments" ON skill_adjustments;
CREATE POLICY "Users can view public or own skill adjustments"
  ON skill_adjustments
  FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players 
      WHERE user_id IS NULL OR auth.uid() = user_id
    )
  );

-- player_videos 表
DROP POLICY IF EXISTS "Users can view own player videos" ON player_videos;
CREATE POLICY "Users can view public or own player videos"
  ON player_videos
  FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players 
      WHERE user_id IS NULL OR auth.uid() = user_id
    )
  );

-- grouping_history 表
DROP POLICY IF EXISTS "Users can view own grouping history" ON grouping_history;
CREATE POLICY "Users can view public or own grouping history"
  ON grouping_history
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- ============================================================================
-- 完成
-- ============================================================================

-- 验证策略
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('players', 'player_skills', 'matches', 'player_match_stats', 'skill_adjustments', 'player_videos', 'grouping_history')
ORDER BY tablename, policyname;
