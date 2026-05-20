-- ============================================================
-- 0010_fix_chat_rls.sql
-- Fix "stack depth limit exceeded" caused by player_id = auth.uid()
-- inside RLS subqueries in 0008.
--
-- The player_id lookup is done SERVER-SIDE via the service-role API
-- route which always keeps guest_session in sync with the current
-- cookie.  Browser clients only need the cookie-based (x-guest-token)
-- RLS check — no player_id clause needed in the policy itself.
-- ============================================================

-- Restore simple cookie-only guest read policy on chat_threads
DROP POLICY IF EXISTS "threads guest read" ON chat_threads;
CREATE POLICY "threads guest read" ON chat_threads FOR SELECT
  USING (
    guest_session = (current_setting('request.headers', true)::json ->> 'x-guest-token')
  );

-- Restore simple cookie-only guest read policy on chat_messages
DROP POLICY IF EXISTS "msgs guest read" ON chat_messages;
CREATE POLICY "msgs guest read" ON chat_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM chat_threads
       WHERE guest_session = (current_setting('request.headers', true)::json ->> 'x-guest-token')
    )
  );
