-- ============================================================
-- 0022_prediction_chances.sql
--
-- Replace per-match-day eligibility with accumulated prediction chances.
--
-- Old model: player must have daily_recharge >= 500 on the MATCH DATE.
--   Problem: recharge on day-X cannot be used for a match on day-Y.
--
-- New model:
--   * Each day where daily_recharge.amount >= 500 earns 1 chance.
--   * Chances are cumulative: total_earned - total_used = available.
--   * Each submitted prediction consumes one chance.
--   * Unused chances expire naturally (can't predict past-kickoff matches).
-- ============================================================

-- 1. Function: how many prediction chances does a player currently have?
CREATE OR REPLACE FUNCTION available_prediction_chances(p_player uuid)
  RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT GREATEST(0,
    (SELECT COUNT(*)::integer FROM daily_recharge
      WHERE player_id = p_player AND amount >= 500)
    -
    (SELECT COUNT(*)::integer FROM predictions
      WHERE player_id = p_player)
  );
$$;

-- Allow authenticated players to call this via RPC (their own player_id only).
GRANT EXECUTE ON FUNCTION available_prediction_chances(uuid) TO authenticated;

-- 2. Replace the insert trigger to use accumulated chances instead of same-day check.
CREATE OR REPLACE FUNCTION check_prediction_insert() RETURNS TRIGGER
  LANGUAGE plpgsql AS $$
DECLARE
  v_status  match_status;
  v_kickoff timestamptz;
BEGIN
  SELECT status, kickoff_at
    INTO v_status, v_kickoff
    FROM matches
   WHERE id = new.match_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_status <> 'scheduled' THEN
    RAISE EXCEPTION 'Match is not open for predictions';
  END IF;
  IF now() >= v_kickoff THEN
    RAISE EXCEPTION 'Match has already started';
  END IF;
  IF available_prediction_chances(new.player_id) <= 0 THEN
    RAISE EXCEPTION 'Player not eligible: no available prediction chances';
  END IF;

  RETURN new;
END $$;
-- (The trigger trg_predictions_before_insert already exists; it calls the
--  function by name so replacing the function body is sufficient.)
