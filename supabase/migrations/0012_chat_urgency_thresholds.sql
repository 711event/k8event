-- ============================================================
-- 0012_chat_urgency_thresholds.sql
-- Add warn_after_minutes / critical_after_minutes to
-- chat_retention_settings so admins can configure inbox colour
-- thresholds from the UI instead of hardcoded values.
-- ============================================================

ALTER TABLE chat_retention_settings
  ADD COLUMN IF NOT EXISTS warn_after_minutes     INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS critical_after_minutes INTEGER NOT NULL DEFAULT 8;

-- Update the single existing row with defaults
UPDATE chat_retention_settings
   SET warn_after_minutes     = 5,
       critical_after_minutes = 8
 WHERE warn_after_minutes IS NULL OR critical_after_minutes IS NULL;
