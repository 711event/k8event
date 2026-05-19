-- 0003: enable Supabase Realtime for live tables
--
-- The original 0001_init.sql left this step as a comment ("run separately in
-- Studio if alter publication is not allowed in migration"). That comment
-- never got executed, so chat_messages / chat_threads / matches /
-- redemption_requests never broadcast row changes — every realtime
-- subscription in the apps silently received zero events:
--   * BO sidebar 客服会话 unread badge never lit up
--   * BO inbox didn't auto-refresh on new messages
--   * BO AgentChat thread page didn't stream new guest messages
--   * Frontend LiveChat optimistic bubble never got the echo replacement
--
-- Apply once via Supabase SQL Editor on project xrlqqxqgumomyvelylrt.
-- Safe to re-run (errors on already-published tables are caught individually).

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_threads;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.redemption_requests;
  exception when duplicate_object then null;
  end;
end $$;

-- Verify (returns the 4 table names if all good):
-- select schemaname, tablename
--   from pg_publication_tables
--  where pubname = 'supabase_realtime'
--    and tablename in ('chat_messages','chat_threads','matches','redemption_requests');
