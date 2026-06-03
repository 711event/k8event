-- ============================================================
-- 0045_security_hardening.sql
-- Security hardening — June 2026
--
-- Fix A: Restore group-scoped RLS on activities and reward_items
--        for authenticated users.
--        Unauthenticated reads remain permissive (public landing pages).
--        Supersedes 0025_fix_rls_public_reads.sql which relaxed all reads.
--
-- Fix B: Add group_id to admin_roles so custom roles are isolated
--        per group.  System roles (is_system = TRUE) keep group_id = NULL
--        and remain visible to all groups.  New custom roles created after
--        this migration are scoped to their creator's group.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Fix A: activities — scope authenticated reads to own group
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members view active visible" ON activities;

CREATE POLICY "members view active visible" ON activities FOR SELECT USING (
  is_active = true AND is_visible = true
  AND (
    -- Unauthenticated: allow (public landing page support)
    auth.uid() IS NULL
    -- Authenticated players: only their own group's activities
    OR group_id = (
      SELECT p.group_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  )
);


-- ────────────────────────────────────────────────────────────
-- Fix A: reward_items — scope authenticated reads to own group
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "items read active" ON reward_items;

CREATE POLICY "items read active" ON reward_items FOR SELECT USING (
  is_active = true
  AND (
    -- Unauthenticated: allow (public landing page support)
    auth.uid() IS NULL
    -- Authenticated players: only their own group's items
    OR group_id = (
      SELECT p.group_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  )
);


-- ────────────────────────────────────────────────────────────
-- Fix B: admin_roles — add group_id for per-group role isolation
-- ────────────────────────────────────────────────────────────

-- Add group_id column (nullable = global/system role)
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

-- System roles stay NULL (globally visible to all groups).
-- Existing custom roles (is_system = FALSE, group_id IS NULL) are assigned
-- to the Test group as a safe default. Admins can re-create them per group.
UPDATE admin_roles
   SET group_id = 'a0000000-0000-0000-0000-000000000001'
 WHERE is_system = FALSE AND group_id IS NULL;

-- Replace the single broad "admins manage admin_roles" policy with
-- split read/write policies that enforce group scoping.

DROP POLICY IF EXISTS "admins manage admin_roles" ON admin_roles;

-- READ: admins see global system roles (group_id IS NULL) + their own group's custom roles
CREATE POLICY "admins read admin_roles" ON admin_roles FOR SELECT USING (
  auth_role() = 'admin'
  AND (
    group_id IS NULL  -- system / global roles visible to all admin groups
    OR group_id = (
      SELECT p.group_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  )
);

-- INSERT: new roles must be created under the caller's group (app sets group_id)
CREATE POLICY "admins insert admin_roles" ON admin_roles FOR INSERT WITH CHECK (
  auth_role() = 'admin'
  AND is_system = FALSE
  AND group_id = (
    SELECT p.group_id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- UPDATE: only own group's non-system roles
CREATE POLICY "admins update admin_roles" ON admin_roles FOR UPDATE USING (
  auth_role() = 'admin'
  AND is_system = FALSE
  AND group_id = (
    SELECT p.group_id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- DELETE: only own group's non-system roles
CREATE POLICY "admins delete admin_roles" ON admin_roles FOR DELETE USING (
  auth_role() = 'admin'
  AND is_system = FALSE
  AND group_id = (
    SELECT p.group_id FROM profiles p WHERE p.user_id = auth.uid()
  )
);
