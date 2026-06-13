-- 0048_prediction_chances_per_amount.sql
-- Change prediction-chance accrual from "qualify once → fixed N chances" to
-- "floor(daily deposit / per_unit), capped by daily_cap", summed across days.
--
-- Field reinterpretation (same JSONB keys, new meaning):
--   min_recharge_amount  -> per_unit:  RM needed for 1 chance (the divisor)
--   chances_per_recharge -> daily_cap: max chances earnable in a single day
--   max_chances          -> total holdable cap (unchanged; 0 = unlimited)
--
-- Example (per_unit=50, daily_cap=8): RM300 → 6, RM400 → 8, RM500 → 8.
CREATE OR REPLACE FUNCTION available_prediction_chances(p_player uuid)
  RETURNS integer
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_group_id    uuid;
  v_per_unit    integer;
  v_daily_cap   integer;
  v_max_chances integer;
  v_earned      integer;
  v_used        integer;
  v_available   integer;
BEGIN
  -- Auth guard: only callable for self
  IF p_player IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT group_id INTO v_group_id FROM profiles WHERE user_id = p_player;

  SELECT
    COALESCE((settings->>'min_recharge_amount')::integer,  500),
    COALESCE((settings->>'chances_per_recharge')::integer, 1),
    COALESCE((settings->>'max_chances')::integer,          0)
  INTO v_per_unit, v_daily_cap, v_max_chances
  FROM activities
  WHERE type = 'worldcup_prediction'
    AND group_id = v_group_id
  LIMIT 1;

  IF v_per_unit IS NULL THEN
    v_per_unit := 500; v_daily_cap := 1; v_max_chances := 0;
  END IF;
  -- Guard against divide-by-zero / nonsensical config
  IF v_per_unit < 1 THEN v_per_unit := 1; END IF;
  IF v_daily_cap < 0 THEN v_daily_cap := 0; END IF;

  -- For each day the player deposited at least per_unit:
  --   chances_that_day = LEAST( floor(amount / per_unit), daily_cap )
  -- Sum across all such days.
  SELECT COALESCE(SUM(LEAST(FLOOR(amount / v_per_unit)::integer, v_daily_cap)), 0)::integer
    INTO v_earned
    FROM daily_recharge
   WHERE player_id = p_player
     AND amount >= v_per_unit;

  -- Predictions already used
  SELECT COUNT(*)::integer INTO v_used
    FROM predictions WHERE player_id = p_player;

  v_available := GREATEST(0, v_earned - v_used);

  -- Total holdable cap (0 = unlimited)
  IF v_max_chances > 0 THEN
    v_available := LEAST(v_available, v_max_chances);
  END IF;

  RETURN v_available;
END $$;
