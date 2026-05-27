-- Replace single share_message with 3 per-locale fields
ALTER TABLE referral_settings
  DROP COLUMN IF EXISTS share_message,
  ADD COLUMN IF NOT EXISTS share_message_zh TEXT,
  ADD COLUMN IF NOT EXISTS share_message_en TEXT,
  ADD COLUMN IF NOT EXISTS share_message_ms TEXT;
