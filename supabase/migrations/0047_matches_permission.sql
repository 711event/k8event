-- ============================================================
-- 0047_matches_permission.sql
-- Add "matches" permission key to system roles.
--
-- matches is a global shared table; write operations (create, settle,
-- delete, set status) affect all groups simultaneously.
-- Restricting via the permissions system ensures that only admins
-- explicitly granted "matches" access can perform write ops.
--
-- Admins with NO role assigned (permissions = null) remain unrestricted
-- and keep full access — this migration only affects role-constrained admins.
-- ============================================================

-- super_admin and group_admin: grant matches write access
UPDATE admin_roles
   SET permissions = permissions || '{"matches": true}'::jsonb
 WHERE slug IN ('super_admin', 'group_admin')
   AND is_system = TRUE;

-- group_agent: explicitly deny (chat-only role)
UPDATE admin_roles
   SET permissions = permissions || '{"matches": false}'::jsonb
 WHERE slug = 'group_agent'
   AND is_system = TRUE;
