-- ============================================================
-- P13 Step 1 — Activities table (generic activity management)
-- World Cup Prediction becomes one activity type among many.
-- ============================================================

CREATE TYPE activity_type AS ENUM (
  'worldcup_prediction',
  'daily_checkin',
  'lucky_draw',
  'spin_wheel',
  'deposit_mission',
  'referral_mission'
);

CREATE TABLE activities (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type        activity_type NOT NULL,
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  description TEXT,
  banner_url  TEXT,
  rules       TEXT,
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  is_visible  BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  settings    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage activities"
  ON activities FOR ALL
  USING (auth_role() = 'admin');

CREATE POLICY "members view active visible"
  ON activities FOR SELECT
  USING (is_active AND is_visible);

-- Seed the existing World Cup Prediction activity
INSERT INTO activities (type, name, slug, description, is_active, is_visible, sort_order, settings)
VALUES (
  'worldcup_prediction',
  'World Cup 2026 竞猜',
  'worldcup-2026',
  '竞猜 2026 FIFA 世界杯比赛结果，预测正确赢取 Token',
  TRUE,
  TRUE,
  1,
  '{"token_reward": 10}'
);
