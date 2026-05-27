-- Add auto_approve flag to referral_settings.
-- When enabled, new join requests are approved automatically
-- and credentials are sent directly to the applicant's chat thread.
ALTER TABLE referral_settings
  ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN NOT NULL DEFAULT FALSE;
