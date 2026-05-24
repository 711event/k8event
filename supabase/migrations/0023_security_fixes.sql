-- ============================================================
-- 0023_security_fixes.sql
-- Security hardening based on audit findings:
--   1. available_prediction_chances: restrict to auth.uid() only
--   2. request_redemption RPC: add group_id ownership check
--   3. RLS on reward_items: add group_id filter for player reads
--   4. RLS on activities: add group_id filter for member reads
--   5. quick_replies: add group_id column + per-group RLS
--   6. chat_retention_settings: add group_id column + seed per-group rows
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. available_prediction_chances: only callable for self
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION available_prediction_chances(p_player uuid)
  RETURNS integer
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Prevent querying another player's chances (information disclosure)
  IF p_player IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN GREATEST(0,
    (SELECT COUNT(*)::integer FROM daily_recharge
      WHERE player_id = p_player AND amount >= 500)
    -
    (SELECT COUNT(*)::integer FROM predictions
      WHERE player_id = p_player)
  );
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. request_redemption: verify item belongs to player's group
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION request_redemption(p_item uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player        uuid := auth.uid();
  v_player_group  uuid;
  v_cost          int;
  v_stock         int;
  v_active        boolean;
  v_item_group    uuid;
  v_balance       int;
  v_redemption_id uuid;
BEGIN
  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the player's group
  SELECT group_id INTO v_player_group FROM profiles WHERE user_id = v_player;

  SELECT cost, stock, is_active, group_id
    INTO v_cost, v_stock, v_active, v_item_group
    FROM reward_items
   WHERE id = p_item
   FOR UPDATE;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  -- Cross-group redemption guard
  IF v_item_group IS DISTINCT FROM v_player_group THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'Item is not available';
  END IF;
  IF v_stock = 0 THEN
    RAISE EXCEPTION 'Item out of stock';
  END IF;

  SELECT balance INTO v_balance FROM token_balances WHERE player_id = v_player;
  IF COALESCE(v_balance, 0) < v_cost THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  -- Decrement stock unless unlimited
  IF v_stock > 0 THEN
    UPDATE reward_items SET stock = stock - 1 WHERE id = p_item;
  END IF;

  v_redemption_id := gen_random_uuid();
  INSERT INTO redemption_requests (id, player_id, item_id, cost_at_request, status)
  VALUES (v_redemption_id, v_player, p_item, v_cost, 'pending');

  INSERT INTO token_transactions (player_id, delta, reason, redemption_id, note)
  VALUES (v_player, -v_cost, 'redeem', v_redemption_id, 'Redemption requested');

  RETURN v_redemption_id;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. RLS on reward_items: scope player reads to their group
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "items read active" ON reward_items;
CREATE POLICY "items read active" ON reward_items FOR SELECT USING (
  (
    is_active
    AND group_id = (SELECT group_id FROM profiles WHERE user_id = auth.uid())
  )
  OR auth_role() = 'admin'
);


-- ────────────────────────────────────────────────────────────
-- 4. RLS on activities: scope member reads to their group
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members view active visible" ON activities;
CREATE POLICY "members view active visible" ON activities FOR SELECT USING (
  (
    is_active
    AND is_visible
    AND group_id = (SELECT group_id FROM profiles WHERE user_id = auth.uid())
  )
  OR auth_role() = 'admin'
);


-- ────────────────────────────────────────────────────────────
-- 5. quick_replies: add group_id + per-group isolation
-- ────────────────────────────────────────────────────────────
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id);

-- Assign existing rows to the Test group
UPDATE quick_replies
   SET group_id = 'a0000000-0000-0000-0000-000000000001'
 WHERE group_id IS NULL;

-- Enforce not-null going forward
ALTER TABLE quick_replies ALTER COLUMN group_id SET NOT NULL;

-- Replace RLS policies to scope reads/writes per group
DROP POLICY IF EXISTS "qr agent read"  ON quick_replies;
DROP POLICY IF EXISTS "qr admin write" ON quick_replies;

CREATE POLICY "qr agent read" ON quick_replies FOR SELECT USING (
  auth_role() IN ('agent', 'admin')
  AND group_id = (SELECT group_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "qr admin write" ON quick_replies FOR ALL USING (
  auth_role() = 'admin'
  AND group_id = (SELECT group_id FROM profiles WHERE user_id = auth.uid())
) WITH CHECK (
  auth_role() = 'admin'
  AND group_id = (SELECT group_id FROM profiles WHERE user_id = auth.uid())
);


-- ────────────────────────────────────────────────────────────
-- 6. chat_retention_settings: add group_id + seed per-group rows
-- ────────────────────────────────────────────────────────────
ALTER TABLE chat_retention_settings ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id);

-- Assign existing (single) row to Test group
UPDATE chat_retention_settings
   SET group_id = 'a0000000-0000-0000-0000-000000000001'
 WHERE group_id IS NULL;

-- Seed FW group row if it doesn't exist yet
INSERT INTO chat_retention_settings (
  group_id, message_retention_days, media_retention_days,
  archive_closed_threads_after_days, warn_after_minutes, critical_after_minutes
)
SELECT
  'a0000000-0000-0000-0000-000000000002', 90, 30, 7, 5, 8
WHERE NOT EXISTS (
  SELECT 1 FROM chat_retention_settings
  WHERE group_id = 'a0000000-0000-0000-0000-000000000002'
);
