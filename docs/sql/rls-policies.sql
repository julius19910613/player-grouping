-- Supabase RLS (Row Level Security) Policies
--
-- These policies enforce read-only access for anonymous users,
-- preventing unauthorized modifications while allowing read access.
--
-- Security Model:
-- - All queries use SUPABASE_ANON_KEY (not service_role)
-- - RLS policies enforce server-side access control
-- - Anonymous users can only SELECT data
-- - No INSERT/UPDATE/DELETE operations allowed for anonymous users
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Players Table Policies
-- ============================================================================

-- Allow anonymous users to read all player data
CREATE POLICY "Allow anonymous read players" ON players
  FOR SELECT
  TO anon
  USING (true);

-- Deny anonymous users from inserting player data
CREATE POLICY "Deny anonymous insert players" ON players
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from updating player data
CREATE POLICY "Deny anonymous update players" ON players
  FOR UPDATE
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from deleting player data
CREATE POLICY "Deny anonymous delete players" ON players
  FOR DELETE
  TO anon
  WITH CHECK (false);

-- ============================================================================
-- Player Skills Table Policies
-- ============================================================================

-- Allow anonymous users to read skill data for existing players only
-- This prevents reading orphaned skill records
CREATE POLICY "Allow anonymous read player_skills" ON player_skills
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
    )
  );

-- Deny anonymous users from inserting skill data
CREATE POLICY "Deny anonymous insert player_skills" ON player_skills
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from updating skill data
CREATE POLICY "Deny anonymous update player_skills" ON player_skills
  FOR UPDATE
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from deleting skill data
CREATE POLICY "Deny anonymous delete player_skills" ON player_skills
  FOR DELETE
  TO anon
  WITH CHECK (false);

-- ============================================================================
-- Matches Table Policies
-- ============================================================================

-- Allow anonymous users to read all match data
CREATE POLICY "Allow anonymous read matches" ON matches
  FOR SELECT
  TO anon
  USING (true);

-- Deny anonymous users from inserting match data
CREATE POLICY "Deny anonymous insert matches" ON matches
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from updating match data
CREATE POLICY "Deny anonymous update matches" ON matches
  FOR UPDATE
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from deleting match data
CREATE POLICY "Deny anonymous delete matches" ON matches
  FOR DELETE
  TO anon
  WITH CHECK (false);

-- ============================================================================
-- Player Match Stats Table Policies
-- ============================================================================

-- Allow anonymous users to read stats data for existing players only
CREATE POLICY "Allow anonymous read player_match_stats" ON player_match_stats
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_match_stats.player_id
    )
  );

-- Deny anonymous users from inserting stats data
CREATE POLICY "Deny anonymous insert player_match_stats" ON player_match_stats
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from updating stats data
CREATE POLICY "Deny anonymous update player_match_stats" ON player_match_stats
  FOR UPDATE
  TO anon
  WITH CHECK (false);

-- Deny anonymous users from deleting stats data
CREATE POLICY "Deny anonymous delete player_match_stats" ON player_match_stats
  FOR DELETE
  TO anon
  WITH CHECK (false);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND relrowsecurity = true;

-- Verify policies exist for each table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- Grant Schema Access
-- ============================================================================

-- Ensure anon role has USAGE access to the public schema
GRANT USAGE ON SCHEMA public TO anon;

-- Grant SELECT access on all tables to anon
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Allow anonymous read players" ON players IS
  'Allows anonymous users (accessing via anon key) to read player data. Write operations are blocked.';

COMMENT ON POLICY "Allow anonymous read player_skills" ON player_skills IS
  'Allows anonymous users to read skill data only for existing players. Prevents access to orphaned records.';

COMMENT ON POLICY "Allow anonymous read matches" ON matches IS
  'Allows anonymous users to read match data. Write operations are blocked.';

COMMENT ON POLICY "Allow anonymous read player_match_stats" ON player_match_stats IS
  'Allows anonymous users to read stats data only for existing players. Write operations are blocked.';
