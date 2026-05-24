INSERT INTO groups (id, name, slug) VALUES ('a0000000-0000-0000-0000-000000000007', 'TM', 'tm') ON CONFLICT (id) DO NOTHING;

INSERT INTO activities (type, name, slug, description, banner_url, rules, is_active, is_visible, sort_order, settings, group_id)
SELECT type, name, slug || '-tm', description, banner_url, rules, is_active, is_visible, sort_order, settings, 'a0000000-0000-0000-0000-000000000007'
FROM activities WHERE group_id = 'a0000000-0000-0000-0000-000000000002' ON CONFLICT DO NOTHING;

INSERT INTO reward_items (name, description, image_url, cost, stock, is_active, group_id)
SELECT name, description, image_url, cost, stock, is_active, 'a0000000-0000-0000-0000-000000000007'
FROM reward_items WHERE group_id = 'a0000000-0000-0000-0000-000000000002';

INSERT INTO chat_retention_settings (group_id, message_retention_days, media_retention_days, archive_closed_threads_after_days, warn_after_minutes, critical_after_minutes)
SELECT 'a0000000-0000-0000-0000-000000000007', message_retention_days, media_retention_days, archive_closed_threads_after_days, warn_after_minutes, critical_after_minutes
FROM chat_retention_settings WHERE group_id = 'a0000000-0000-0000-0000-000000000002' LIMIT 1;
