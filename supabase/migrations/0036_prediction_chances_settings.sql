-- ============================================================
-- 0036_prediction_chances_settings.sql
--
-- Make prediction chance conditions configurable per group.
-- Settings are stored in the worldcup_prediction activity's
-- settings JSONB under each group's activity row.
--
-- New settings keys:
--   min_recharge_amount   integer  default 500   (RM threshold)
--   chances_per_recharge  integer  default 1     (chances per qualifying day)
--   max_chances           integer  default 0     (0 = unlimited)
--
-- The available_prediction_chances() function is updated to
-- read these values from the player's group activity settings.
-- ============================================================

CREATE OR REPLACE FUNCTION available_prediction_chances(p_player uuid)
  RETURNS integer
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_group_id            uuid;
  v_min_recharge        integer;
  v_chances_per_day     integer;
  v_max_chances         integer;
  v_earned              integer;
  v_used                integer;
  v_available           integer;
BEGIN
  -- Auth guard: only callable for self
  IF p_player IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Get player's group
  SELECT group_id INTO v_group_id
    FROM profiles WHERE user_id = p_player;

  -- Read settings from the worldcup_prediction activity for this group
  -- Falls back to defaults if no activity found or settings not set
  SELECT
    COALESCE((settings->>'min_recharge_amount')::integer,  500),
    COALESCE((settings->>'chances_per_recharge')::integer, 1),
    COALESCE((settings->>'max_chances')::integer,          0)
  INTO v_min_recharge, v_chances_per_day, v_max_chances
  FROM activities
  WHERE type = 'worldcup_prediction'
    AND group_id = v_group_id
  LIMIT 1;

  -- If no activity found, use defaults
  IF v_min_recharge IS NULL THEN
    v_min_recharge    := 500;
    v_chances_per_day := 1;
    v_max_chances     := 0;
  END IF;

  -- Count qualifying recharge days × chances_per_day
  SELECT COUNT(*)::integer INTO v_earned
    FROM daily_recharge
   WHERE player_id = p_player
     AND amount >= v_min_recharge;

  v_earned := v_earned * v_chances_per_day;

  -- Count predictions used
  SELECT COUNT(*)::integer INTO v_used
    FROM predictions WHERE player_id = p_player;

  v_available := GREATEST(0, v_earned - v_used);

  -- Apply max_chances cap (0 = no cap)
  IF v_max_chances > 0 THEN
    v_available := LEAST(v_available, v_max_chances);
  END IF;

  RETURN v_available;
END $$;
