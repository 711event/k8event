-- Add optional image attachment to quick_replies
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS image_url TEXT;
