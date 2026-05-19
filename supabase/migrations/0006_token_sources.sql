-- ============================================================
-- P13 Step 2 — Extend token_reason enum with daily_checkin
-- ============================================================

ALTER TYPE token_reason ADD VALUE 'daily_checkin';

-- Update token_earned view to include daily_checkin rewards
-- Drop first to allow changing column type from integer to bigint
DROP VIEW IF EXISTS token_earned;
CREATE VIEW token_earned AS
  SELECT player_id, COALESCE(SUM(delta), 0)::bigint AS earned
  FROM token_transactions
  WHERE reason IN ('match_win', 'admin_adjust', 'daily_checkin')
  GROUP BY player_id;
