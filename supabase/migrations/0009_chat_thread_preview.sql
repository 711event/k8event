-- ============================================================
-- 0009_chat_thread_preview.sql
-- Add last_message_body / kind / sender to chat_threads so the
-- admin inbox can show a message preview without an extra query.
-- The existing trigger is updated to populate these columns.
-- ============================================================

ALTER TABLE chat_threads
  ADD COLUMN IF NOT EXISTS last_message_body   TEXT,
  ADD COLUMN IF NOT EXISTS last_message_kind   chat_kind,
  ADD COLUMN IF NOT EXISTS last_message_sender chat_sender;

-- Backfill from existing messages (DISTINCT ON = latest per thread)
UPDATE chat_threads t
   SET last_message_body   = m.body,
       last_message_kind   = m.kind,
       last_message_sender = m.sender
  FROM (
    SELECT DISTINCT ON (thread_id)
           thread_id, body, kind, sender
      FROM chat_messages
     ORDER BY thread_id, created_at DESC
  ) m
 WHERE t.id = m.thread_id;

-- Update trigger to also write preview columns on every new message
CREATE OR REPLACE FUNCTION touch_thread_last_message() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_threads
     SET last_message_at     = NEW.created_at,
         last_message_body   = NEW.body,
         last_message_kind   = NEW.kind,
         last_message_sender = NEW.sender
   WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;
