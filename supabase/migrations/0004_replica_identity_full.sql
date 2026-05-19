-- 0004: set REPLICA IDENTITY FULL on chat tables so Realtime broadcasts work
--
-- Background: even after 0003 added chat_messages / chat_threads to the
-- supabase_realtime publication, postgres_changes events were never delivered
-- in production. Realtime Messages counter stayed at 0 despite live websocket
-- subscribers. Setting REPLICA IDENTITY to FULL forces Postgres to write the
-- complete row to the WAL on changes; Supabase Realtime then has the full
-- payload it needs to evaluate RLS per-subscriber and broadcast the event.
-- Without this, INSERT events may silently never propagate.
--
-- Apply once via Supabase SQL Editor on project xrlqqxqgumomyvelylrt. Safe to
-- re-run (idempotent — ALTER TABLE ... REPLICA IDENTITY is the same DDL each time).

alter table public.chat_messages replica identity full;
alter table public.chat_threads  replica identity full;

-- Verify (returns 2 rows, both 'full'):
-- select relname,
--        case relreplident
--          when 'd' then 'default'
--          when 'n' then 'nothing'
--          when 'f' then 'full'
--          when 'i' then 'index'
--        end as replica_identity
--   from pg_class
--  where relname in ('chat_messages','chat_threads');
