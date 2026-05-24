-- ============================================================
-- 0021_chat_player_rls.sql
--
-- Re-add player_id-based RLS for logged-in members.
--
-- 0010 removed this due to a "stack depth limit exceeded" error caused
-- by auth.uid() inside a subquery that itself was under RLS. We avoid
-- recursion by:
--   1. Adding a separate SELECT policy on chat_threads (no subquery).
--   2. Using a SECURITY DEFINER function for the chat_messages policy
--      so that the inner SELECT on chat_threads bypasses RLS.
--
-- Multiple SELECT policies are OR-ed together by Postgres, so guests
-- still access via the existing cookie-based policies and logged-in
-- players ALSO get access via their JWT (auth.uid()).
-- ============================================================

-- 1. Allow logged-in players to read their own thread row.
DROP POLICY IF EXISTS "threads player read" ON chat_threads;
CREATE POLICY "threads player read" ON chat_threads
  FOR SELECT
  USING (player_id IS NOT NULL AND player_id = auth.uid());

-- 2. Helper: returns the IDs of all chat_threads owned by the calling player.
--    SECURITY DEFINER bypasses RLS on chat_threads inside this function,
--    preventing the recursive RLS stack-depth error seen in migration 0008.
CREATE OR REPLACE FUNCTION get_my_chat_thread_ids()
  RETURNS SETOF UUID
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT id FROM chat_threads WHERE player_id = auth.uid();
$$;

-- 3. Allow logged-in players to read messages from their threads.
DROP POLICY IF EXISTS "msgs player read" ON chat_messages;
CREATE POLICY "msgs player read" ON chat_messages
  FOR SELECT
  USING (thread_id IN (SELECT get_my_chat_thread_ids()));
