-- 0035_staff_group_binding.sql
-- Bind all existing admin/agent accounts to the Test group.
-- Going forward, createStaffAction sets group_id at creation time,
-- and login enforces group_id === GROUP_ID env var.

UPDATE profiles
SET group_id = 'a0000000-0000-0000-0000-000000000001'
WHERE role IN ('admin', 'agent')
  AND group_id IS NULL;
