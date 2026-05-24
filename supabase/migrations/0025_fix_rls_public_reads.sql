-- ============================================================
-- 0025_fix_rls_public_reads.sql
-- Fix over-restrictive RLS on reward_items and activities.
-- 0023 required auth.uid() to match group_id, which blocked
-- unauthenticated frontend reads. Group filtering is handled
-- at the app layer via GROUP_ID env var; cross-group redemption
-- security is enforced inside the request_redemption() RPC.
-- ============================================================

-- reward_items: allow any unauthenticated read of active items
DROP POLICY IF EXISTS "items read active" ON reward_items;
CREATE POLICY "items read active" ON reward_items FOR SELECT USING (
  is_active = true
);

-- activities: allow any unauthenticated read of active+visible items
DROP POLICY IF EXISTS "members view active visible" ON activities;
CREATE POLICY "members view active visible" ON activities FOR SELECT USING (
  is_active = true AND is_visible = true
);
