-- ============================================================
-- 0016_admin_roles.sql
-- Custom admin roles with granular module permissions
-- ============================================================

-- Table: admin_roles
CREATE TABLE admin_roles (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  permissions JSONB       NOT NULL DEFAULT '{}',
  is_system   BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage admin_roles" ON admin_roles FOR ALL USING (auth_role() = 'admin');

-- Add admin_role_id to profiles (nullable — null means unrestricted for existing admins)
ALTER TABLE profiles ADD COLUMN admin_role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL;

-- Seed default system roles
INSERT INTO admin_roles (name, slug, permissions, is_system, sort_order) VALUES
(
  '超级管理员', 'super_admin',
  '{"overview":true,"players":true,"recharge":true,"activities":true,"rewards":true,"redemptions":true,"checkins":true,"chat":true,"quick_replies":true,"roles":true,"staff":true}',
  TRUE, 1
),
(
  '组管理员', 'group_admin',
  '{"overview":true,"players":true,"recharge":true,"activities":true,"rewards":true,"redemptions":true,"checkins":true,"chat":true,"quick_replies":true,"roles":false,"staff":false}',
  TRUE, 2
),
(
  '组客服', 'group_agent',
  '{"overview":false,"players":false,"recharge":false,"activities":false,"rewards":false,"redemptions":false,"checkins":false,"chat":true,"quick_replies":true,"roles":false,"staff":false}',
  TRUE, 3
);
