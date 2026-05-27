-- 0033_security_fixes.sql
-- Security hardening: drop player checkin INSERT bypass, add auth guard to settle_match,
-- add SET search_path to SECURITY DEFINER functions.

-- ============================================================
-- Fix A: Drop overly-permissive player_checkins INSERT policy
-- Players should never INSERT directly; all writes go through
-- perform_checkin SECURITY DEFINER RPC
-- ============================================================
DROP POLICY IF EXISTS "players insert own checkins" ON player_checkins;

-- ============================================================
-- Fix B: Add auth guard to settle_match
-- Only admin or service_role may call this function.
-- Also ensures SET search_path = public is present.
-- ============================================================
CREATE OR REPLACE FUNCTION settle_match(p_match_id uuid, p_result match_winner)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward int;
  v_status match_status;
BEGIN
  -- Auth guard: admin or service_role only
  IF auth_role() NOT IN ('admin', 'service_role') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT token_reward, status
    INTO v_reward, v_status
    FROM matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_status = 'finished' THEN
    RAISE EXCEPTION 'Match already settled';
  END IF;

  IF p_result NOT IN ('home', 'away') THEN
    UPDATE matches
       SET status = 'finished',
           result = p_result,
           settled_at = now()
     WHERE id = p_match_id;
    RETURN;
  END IF;

  UPDATE predictions
     SET is_correct = (pick::text = p_result::text),
         awarded    = CASE WHEN pick::text = p_result::text THEN v_reward ELSE 0 END
   WHERE match_id = p_match_id;

  INSERT INTO token_transactions (player_id, delta, reason, match_id, note)
  SELECT player_id, v_reward, 'match_win', p_match_id, 'Correct prediction'
    FROM predictions
   WHERE match_id = p_match_id
     AND is_correct;

  UPDATE matches
     SET status = 'finished',
         result = p_result,
         settled_at = now()
   WHERE id = p_match_id;
END $$;

-- ============================================================
-- Fix C: Add SET search_path to perform_checkin
-- Keeps all logic from 0032_checkin_cycle.sql exactly the same.
-- ============================================================
CREATE OR REPLACE FUNCTION perform_checkin(p_activity_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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
