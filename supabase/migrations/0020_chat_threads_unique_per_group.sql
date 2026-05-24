-- Drop old global unique constraint (one cookie = one thread across all groups)
ALTER TABLE chat_threads DROP CONSTRAINT IF EXISTS chat_threads_guest_session_key;

-- Add composite unique: one thread per (cookie, group) pair
-- This lets the same browser cookie have one thread in Test and one in FW
ALTER TABLE chat_threads ADD CONSTRAINT chat_threads_guest_session_group_key
  UNIQUE (guest_session, group_id);
