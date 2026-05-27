-- Add share_message column to referral_settings
-- Allows each group admin to customize the WhatsApp/Telegram share text

ALTER TABLE referral_settings
  ADD COLUMN IF NOT EXISTS share_message TEXT;
