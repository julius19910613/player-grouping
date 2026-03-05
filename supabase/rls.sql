-- ============================================================================
-- Supabase RLS (Row Level Security) Policies
-- Phase 1: Row-Level Security for Data Isolation
-- ============================================================================

-- ============================================================================
-- RLS 策略说明
-- ============================================================================
-- 
-- 核心原则：用户只能访问自己的数据
-- 
-- 认证模式：
-- - 游客模式（匿名认证）：Supabase 自动生成匿名用户 UUID
-- - auth.uid() 函数返回当前认证用户的 ID
-- 
-- 策略类型：
-- - SELECT: 查询权限（USING 子句）
-- - INSERT: 插入权限（WITH CHECK 子句）
-- - UPDATE: 更新权限（USING + WITH CHECK 子句）
-- - DELETE: 删除权限（USING 子句）
-- 
-- ============================================================================

-- ============================================================================
-- 1. players 表 RLS 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 策略 1: 用户只能查看自己的球员
CREATE POLICY "Users can view own players"
  ON players
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view own players" ON players IS
'用户只能查询 user_id 匹配的球员数据';

-- 策略 2: 用户只能插入自己的球员
CREATE POLICY "Users can insert own players"
  ON players
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can insert own players" ON players IS
'用户插入球员时，user_id 必须与当前认证用户一致';

-- 策略 3: 用户只能更新自己的球员
CREATE POLICY "Users can update own players"
  ON players
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update own players" ON players IS
'用户只能更新 user_id 匹配的球员数据，且不能修改 user_id';

-- 策略 4: 用户只能删除自己的球员
CREATE POLICY "Users can delete own players"
  ON players
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own players" ON players IS
'用户只能删除 user_id 匹配的球员数据';

-- ============================================================================
-- 2. player_skills 表 RLS 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;

-- 策略 1: 用户只能查看自己球员的能力值
CREATE POLICY "Users can view own player skills"
  ON player_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
      AND players.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view own player skills" ON player_skills IS
'用户只能查询属于自己球员的能力值（通过 players 表关联验证）';

-- 策略 2: 用户只能插入自己球员的能力值
CREATE POLICY "Users can insert own player skills"
  ON player_skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
      AND players.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can insert own player skills" ON player_skills IS
'用户插入能力值时，player_id 必须属于当前用户（通过 players 表验证）';

-- 策略 3: 用户只能更新自己球员的能力值
CREATE POLICY "Users can update own player skills"
  ON player_skills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
      AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
      AND players.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can update own player skills" ON player_skills IS
'用户只能更新属于自己球员的能力值（通过 players 表关联验证）';

-- 注意：player_skills 表的 DELETE 操作由 players 表的 ON DELETE CASCADE 自动处理
-- 无需单独的 DELETE 策略

-- ============================================================================
-- 3. grouping_history 表 RLS 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE grouping_history ENABLE ROW LEVEL SECURITY;

-- 策略 1: 用户只能查看自己的分组历史
CREATE POLICY "Users can view own grouping history"
  ON grouping_history
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view own grouping history" ON grouping_history IS
'用户只能查询 user_id 匹配的分组历史数据';

-- 策略 2: 用户只能插入自己的分组历史
CREATE POLICY "Users can insert own grouping history"
  ON grouping_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can insert own grouping history" ON grouping_history IS
'用户插入分组历史时，user_id 必须与当前认证用户一致';

-- 策略 3: 用户只能更新自己的分组历史
CREATE POLICY "Users can update own grouping history"
  ON grouping_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update own grouping history" ON grouping_history IS
'用户只能更新 user_id 匹配的分组历史数据，且不能修改 user_id';

-- 策略 4: 用户只能删除自己的分组历史
CREATE POLICY "Users can delete own grouping history"
  ON grouping_history
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own grouping history" ON grouping_history IS
'用户只能删除 user_id 匹配的分组历史数据';

-- ============================================================================
-- 4. RLS 策略验证（测试脚本）
-- ============================================================================
-- 
-- 使用方法：
-- 1. 切换到不同的用户身份
-- 2. 执行查询，验证是否只返回当前用户的数据
-- 
-- 示例：
-- 
-- -- 设置当前用户为 user-uuid-here
-- SET ROLE authenticated;
-- SET request.jwt.claims = '{"sub": "user-uuid-here"}';
-- 
-- -- 测试查询（应该只返回当前用户的数据）
-- SELECT * FROM players;
-- SELECT * FROM player_skills;
-- SELECT * FROM grouping_history;
-- 
-- -- 测试插入（应该成功）
-- INSERT INTO players (user_id, name, position)
-- VALUES ('user-uuid-here', '测试球员', 'PG');
-- 
-- -- 测试插入其他用户数据（应该失败）
-- INSERT INTO players (user_id, name, position)
-- VALUES ('other-user-uuid', '非法球员', 'SG');  -- 应该报错
-- 
-- ============================================================================

-- ============================================================================
-- RLS 策略创建完成
-- ============================================================================
