-- ============================================================
-- 0046_per_group_token_reward.sql
-- Per-group token reward for match settlement.
--
-- Problem: settle_match() previously used matches.token_reward (a single
-- value shared across all groups) to award tokens to every correct predictor.
-- This meant one group's admin could change ALL groups' rewards by bulk-updating
-- the matches table via updatePredictionTokenRewardAction.
--
-- Fix: settle_match() now reads each player's group's
-- activities.settings->>'prediction_token_reward' and awards that amount.
-- Falls back to matches.token_reward if no active worldcup_prediction
-- activity is found for the player's group (migration safety net).
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

  -- For non-scoring results (draw with no token distribution) just close the match.
  IF p_result NOT IN ('home', 'away') THEN
    UPDATE matches
       SET status     = 'finished',
           result     = p_result,
           settled_at = now()
     WHERE id = p_match_id;
    RETURN;
  END IF;

  -- ── Step 1: Mark every prediction correct / wrong ─────────────────────────
  UPDATE predictions
     SET is_correct = (pick::text = p_result::text),
         awarded    = 0           -- will be filled in per-group below
   WHERE match_id = p_match_id;

  -- ── Step 2: Fill in per-group reward for winning predictions ──────────────
  -- Look up each winner's group's worldcup_prediction activity setting.
  -- Falls back to matches.token_reward if the activity is not found.
  UPDATE predictions pred
     SET awarded = COALESCE(
           (
             SELECT (a.settings->>'prediction_token_reward')::int
               FROM activities a
               JOIN profiles p ON p.group_id = a.group_id
              WHERE p.user_id = pred.player_id
                AND a.type   = 'worldcup_prediction'
                AND a.is_active = TRUE
              LIMIT 1
           ),
           v_reward   -- fallback: match's own token_reward column
         )
   WHERE pred.match_id = p_match_id
     AND pred.is_correct = TRUE;

  -- ── Step 3: Insert token transactions using per-player awarded amounts ─────
  INSERT INTO token_transactions (player_id, delta, reason, match_id, note)
  SELECT player_id, awarded, 'match_win', p_match_id, 'Correct prediction'
    FROM predictions
   WHERE match_id  = p_match_id
     AND is_correct = TRUE
     AND awarded   > 0;

  -- ── Step 4: Close the match ───────────────────────────────────────────────
  UPDATE matches
     SET status     = 'finished',
         result     = p_result,
         settled_at = now()
   WHERE id = p_match_id;
END $$;
