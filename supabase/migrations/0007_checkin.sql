-- ============================================================
-- P13 Step 3 — Daily check-in table + perform_checkin RPC
-- ============================================================

CREATE TABLE IF NOT EXISTS player_checkins (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id      UUID        NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  activity_id    UUID        NOT NULL REFERENCES activities(id),
  checkin_date   DATE        NOT NULL,   -- stored as GMT+8 date
  streak_day     INTEGER     NOT NULL DEFAULT 1,  -- 1–7
  tokens_awarded INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, activity_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS player_checkins_player_idx ON player_checkins(player_id);
CREATE INDEX IF NOT EXISTS player_checkins_date_idx   ON player_checkins(checkin_date);

ALTER TABLE player_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "players see own checkins"
    ON player_checkins FOR SELECT
    USING (player_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "players insert own checkins"
    ON player_checkins FOR INSERT
    WITH CHECK (player_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins all checkins"
    ON player_checkins FOR ALL
    USING (auth_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- RPC: perform_checkin(p_activity_id UUID) → JSON
-- Returns: { streak_day, tokens_awarded }
-- Raises:  'activity_not_found' | 'already_checked_in'
-- ============================================================
CREATE OR REPLACE FUNCTION perform_checkin(p_activity_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_player_id    UUID := auth.uid();
  v_today        DATE := (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE;
  v_yesterday    DATE := v_today - INTERVAL '1 day';
  v_activity     activities%ROWTYPE;
  v_day_rewards  JSONB;
  v_prev         player_checkins%ROWTYPE;
  v_streak_day   INTEGER;
  v_tokens       INTEGER;
BEGIN
  -- Load activity (must be active daily_checkin)
  SELECT * INTO v_activity
  FROM activities
  WHERE id = p_activity_id
    AND type = 'daily_checkin'
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity_not_found';
  END IF;

  -- Guard: already checked in today
  IF EXISTS (
    SELECT 1 FROM player_checkins
    WHERE player_id = v_player_id
      AND activity_id = p_activity_id
      AND checkin_date = v_today
  ) THEN
    RAISE EXCEPTION 'already_checked_in';
  END IF;

  v_day_rewards := v_activity.settings->'day_rewards';

  -- Determine streak day
  SELECT * INTO v_prev
  FROM player_checkins
  WHERE player_id    = v_player_id
    AND activity_id  = p_activity_id
    AND checkin_date = v_yesterday;

  IF FOUND THEN
    -- Consecutive: increment streak, wrap 7 → 1
    v_streak_day := CASE WHEN v_prev.streak_day >= 7 THEN 1 ELSE v_prev.streak_day + 1 END;
  ELSE
    -- Gap or first ever: reset to Day 1
    v_streak_day := 1;
  END IF;

  -- Token amount for this streak day
  v_tokens := (v_day_rewards->>(v_streak_day - 1))::INTEGER;

  -- Record check-in
  INSERT INTO player_checkins (player_id, activity_id, checkin_date, streak_day, tokens_awarded)
  VALUES (v_player_id, p_activity_id, v_today, v_streak_day, v_tokens);

  -- Award tokens
  INSERT INTO token_transactions (player_id, delta, reason, note)
  VALUES (v_player_id, v_tokens, 'daily_checkin', '每日签到 第 ' || v_streak_day || ' 天');

  RETURN json_build_object('streak_day', v_streak_day, 'tokens_awarded', v_tokens);
END;
$$;
