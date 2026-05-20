-- Add 'pending' status to chat_threads for escalated / follow-up cases.
-- New flow: open/claimed → pending → closed
-- Pending threads stay pending even when guest sends new messages.
ALTER TABLE chat_threads DROP CONSTRAINT IF EXISTS chat_threads_status_check;
ALTER TABLE chat_threads ADD CONSTRAINT chat_threads_status_check
  CHECK (status IN ('open', 'claimed', 'pending', 'closed'));
