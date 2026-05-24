-- ============================================================
-- 0017_groups.sql
-- Multi-tenant: groups table + group_id on profiles/activities/reward_items
-- Existing data → "Test" group; new "FW" group seeded with copies.
-- ============================================================

-- 1. groups table
CREATE TABLE groups (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  slug       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage groups" ON groups FOR ALL    USING (auth_role() = 'admin');
CREATE POLICY "public read groups"   ON groups FOR SELECT USING (true);

-- 2. Seed two groups with fixed IDs so env vars can reference them
INSERT INTO groups (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Test', 'test'),
  ('a0000000-0000-0000-0000-000000000002', 'FW',   'fw');

-- 3. profiles → add group_id, assign all existing to Test
ALTER TABLE profiles ADD COLUMN group_id UUID REFERENCES groups(id);
UPDATE profiles SET group_id = 'a0000000-0000-0000-0000-000000000001';

-- 4. activities → add group_id, existing → Test, copy to FW (inactive)
ALTER TABLE activities ADD COLUMN group_id UUID REFERENCES groups(id);
UPDATE activities SET group_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO activities
  (type, name, slug, description, banner_url, rules,
   is_active, is_visible, sort_order, settings, group_id)
SELECT
  type, name, slug || '-fw', description, banner_url, rules,
  FALSE, is_visible, sort_order, settings,
  'a0000000-0000-0000-0000-000000000002'
FROM activities
WHERE group_id = 'a0000000-0000-0000-0000-000000000001';

-- 5. reward_items → add group_id, existing → Test, copy to FW (inactive)
ALTER TABLE reward_items ADD COLUMN group_id UUID REFERENCES groups(id);
UPDATE reward_items SET group_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO reward_items
  (name, description, image_url, cost, stock, is_active, group_id)
SELECT
  name, description, image_url, cost, stock, FALSE,
  'a0000000-0000-0000-0000-000000000002'
FROM reward_items
WHERE group_id = 'a0000000-0000-0000-0000-000000000001';
