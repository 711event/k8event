-- ============================================================
-- 0024_ec_group.sql
-- Add EC group (a0000000-0000-0000-0000-000000000003)
-- Mirror FW: activities, reward_items, chat_retention_settings
-- ============================================================

INSERT INTO groups (id, name, slug)
VALUES ('a0000000-0000-0000-0000-000000000003', 'EC', 'ec')
ON CONFLICT (id) DO NOTHING;

-- Activities: copy from FW (keep is_active as-is)
INSERT INTO activities (type, name, slug, description, banner_url, rules, is_active, is_visible, sort_order, settings, group_id)
SELECT type, name, slug || '-ec', description, banner_url, rules, is_active, is_visible, sort_order, settings,
       'a0000000-0000-0000-0000-000000000003'
FROM activities
WHERE group_id = 'a0000000-0000-0000-0000-000000000002'
ON CONFLICT DO NOTHING;

-- Reward items: copy from FW (keep is_active as-is)
INSERT INTO reward_items (name, description, image_url, cost, stock, is_active, group_id)
SELECT name, description, image_url, cost, stock, is_active,
       'a0000000-0000-0000-0000-000000000003'
FROM reward_items
WHERE group_id = 'a0000000-0000-0000-0000-000000000002';

-- Chat retention settings
INSERT INTO chat_retention_settings (
  group_id, message_retention_days, media_retention_days,
  archive_closed_threads_after_days, warn_after_minutes, critical_after_minutes
)
SELECT
  'a0000000-0000-0000-0000-000000000003',
  message_retention_days, media_retention_days,
  archive_closed_threads_after_days, warn_after_minutes, critical_after_minutes
FROM chat_retention_settings
WHERE group_id = 'a0000000-0000-0000-0000-000000000002'
LIMIT 1;
