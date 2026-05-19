-- 0002: relax quick_replies for mixed-case + non-button templates
--
-- Background: P10 reshaped 快速回复 management to mirror the BO reference UX:
--   - Title may be any string (with or without "++" prefix). "++" prefix flags
--     the item as a "快速按钮" rendered in the chat composer; non-prefixed items
--     are saved templates only.
--   - Items can be enabled / disabled without deleting them.
--
-- Apply once via Supabase SQL Editor (production project xrlqqxqgumomyvelylrt).

-- Drop the uppercase-only check (auto-named quick_replies_title_check).
alter table public.quick_replies drop constraint if exists quick_replies_title_check;

-- Soft-enable flag (default on so existing rows keep working).
alter table public.quick_replies
  add column if not exists is_active boolean not null default true;

-- Helpful index when chat composer filters by active + sort_order.
create index if not exists quick_replies_active_sort_idx
  on public.quick_replies (is_active, sort_order);
