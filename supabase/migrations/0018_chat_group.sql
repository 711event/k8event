-- Add group_id to chat_threads for per-group isolation
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

-- Assign all existing threads to the Test group
UPDATE chat_threads SET group_id = 'a0000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
