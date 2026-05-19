-- ============================================================
-- 0008_chat_player.sql
-- LiveChat persistence: link threads to player accounts + pagination
-- indexes + retention settings table.
-- ============================================================

-- 1. player_id on chat_threads so logged-in members always find the same thread
ALTER TABLE chat_threads
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL;

-- 2. Index: fast lookup of a player's active thread
CREATE INDEX IF NOT EXISTS chat_threads_player_idx
  ON chat_threads(player_id) WHERE player_id IS NOT NULL;

-- 3. Better composite index for admin inbox (status + recency)
DROP INDEX IF EXISTS chat_threads_status_idx;
CREATE INDEX IF NOT EXISTS chat_threads_status_last_msg_idx
  ON chat_threads(status, last_message_at DESC NULLS LAST);

-- 4. Better messages index for cursor-based pagination (DESC for "load older")
DROP INDEX IF EXISTS chat_messages_thread_idx;
CREATE INDEX IF NOT EXISTS chat_messages_thread_created_idx
  ON chat_messages(thread_id, created_at DESC);

-- 5. read_at: track when agent/player read a message (future unread-count feature)
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 6. RLS: players can also read their own thread via player_id (in addition to cookie)
DROP POLICY IF EXISTS "threads guest read" ON chat_threads;
CREATE POLICY "threads guest read" ON chat_threads FOR SELECT
  USING (
    guest_session = (current_setting('request.headers', true)::json ->> 'x-guest-token')
    OR (player_id IS NOT NULL AND player_id = auth.uid())
  );

-- 7. RLS: players can read messages from threads they own via player_id
DROP POLICY IF EXISTS "msgs guest read" ON chat_messages;
CREATE POLICY "msgs guest read" ON chat_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM chat_threads
       WHERE guest_session = (current_setting('request.headers', true)::json ->> 'x-guest-token')
          OR (player_id IS NOT NULL AND player_id = auth.uid())
    )
  );

-- 8. Retention settings (admin UI only for now — no auto-delete job yet)
CREATE TABLE IF NOT EXISTS chat_retention_settings (
  id                                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_retention_days            INTEGER     NOT NULL DEFAULT 90,
  media_retention_days              INTEGER     NOT NULL DEFAULT 30,
  archive_closed_threads_after_days INTEGER     NOT NULL DEFAULT 7,
  updated_by                        UUID        REFERENCES profiles(user_id),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO chat_retention_settings (message_retention_days, media_retention_days, archive_closed_threads_after_days)
VALUES (90, 30, 7)
ON CONFLICT DO NOTHING;

ALTER TABLE chat_retention_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage retention" ON chat_retention_settings
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');
