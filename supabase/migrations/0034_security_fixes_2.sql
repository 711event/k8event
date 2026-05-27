-- 0034_security_fixes_2.sql
-- Second pass security hardening: tighten function grants.
-- Remove EXECUTE grants from anon role for RPCs that must never
-- be called by unauthenticated users. Auth guards inside SECURITY DEFINER
-- functions are defence-in-depth, but anon callers should not reach them.

-- settle_match: admin-only RPC — anon should never call it
REVOKE EXECUTE ON FUNCTION settle_match(uuid, match_winner) FROM anon;

-- decide_redemption: admin-only RPC — anon should never call it
REVOKE EXECUTE ON FUNCTION decide_redemption(uuid, redemption_status) FROM anon;

-- request_redemption: requires auth.uid() — anon call always fails anyway,
-- but revoke for clean least-privilege posture
REVOKE EXECUTE ON FUNCTION request_redemption(uuid) FROM anon;

-- perform_checkin: requires auth.uid() — anon call always fails,
-- revoke for least privilege
REVOKE EXECUTE ON FUNCTION perform_checkin(uuid) FROM anon;

-- auth_role: helper that reads profiles; anon users have no profile row,
-- always returns NULL, but still unnecessary surface area
REVOKE EXECUTE ON FUNCTION auth_role() FROM anon;

-- available_prediction_chances: auth guard inside already blocks cross-user
-- calls, but anon cannot have chances — revoke for least privilege
REVOKE EXECUTE ON FUNCTION available_prediction_chances(uuid) FROM anon;
