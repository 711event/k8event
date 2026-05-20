-- Add 'pending' status to chat_threads for escalated / follow-up cases.
-- New flow: open/claimed → pending → closed
-- Pending threads stay pending even when guest sends new messages.
-- Note: status is an ENUM type (chat_thread_status), not a text CHECK constraint.
ALTER TYPE chat_thread_status ADD VALUE IF NOT EXISTS 'pending';
