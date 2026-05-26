-- ============================================================
-- Variable check-in cycle (7 / 14 / 21 / 28 days)
-- Replace hard-coded 7-day wrap with cycle_length from settings
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
  v_next_streak  INTEGER;
  v_tokens       INTEGER;
  cycle_length   INT;
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
  cycle_length  := COALESCE((v_activity.settings->>'cycle_length')::int, 7);

  -- Determine streak day
  SELECT * INTO v_prev
  FROM player_checkins
  WHERE player_id    = v_player_id
    AND activity_id  = p_activity_id
    AND checkin_date = v_yesterday;

  IF FOUND THEN
    -- Consecutive: increment streak, wrap at cycle_length → 1
    IF v_prev.streak_day >= cycle_length THEN
      v_next_streak := 1;
    ELSE
      v_next_streak := v_prev.streak_day + 1;
    END IF;
  ELSE
    -- Gap or first ever: reset to Day 1
    v_next_streak := 1;
  END IF;

  -- Token amount for this streak day
  v_tokens := (v_day_rewards->>(v_next_streak - 1))::INTEGER;

  -- Record check-in
  INSERT INTO player_checkins (player_id, activity_id, checkin_date, streak_day, tokens_awarded)
  VALUES (v_player_id, p_activity_id, v_today, v_next_streak, v_tokens);

  -- Award tokens
  INSERT INTO token_transactions (player_id, delta, reason, note)
  VALUES (v_player_id, v_tokens, 'daily_checkin', '每日签到 第 ' || v_next_streak || ' 天');

  RETURN json_build_object('streak_day', v_next_streak, 'tokens_awarded', v_tokens);
END;
$$;
