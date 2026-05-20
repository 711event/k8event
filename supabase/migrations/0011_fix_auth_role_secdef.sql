-- ============================================================
-- 0011_fix_auth_role_secdef.sql
-- Fix "stack depth limit exceeded" on chat_threads / chat_messages.
--
-- Root cause: auth_role() queries `profiles`, which has a "profiles admin all"
-- RLS policy that also calls auth_role() → infinite recursion for anon users
-- (auth.uid() = NULL, so "profiles self read" never matches and PostgreSQL
-- keeps re-evaluating the admin policy forever).
--
-- PostgreSQL 17 changed STABLE function caching in RLS evaluation, which
-- exposed this pre-existing design issue.
--
-- Fix: SECURITY DEFINER lets auth_role() execute with the function owner's
-- privileges, bypassing RLS on `profiles` entirely. This is the standard
-- Supabase pattern for helper functions used inside RLS policies.
-- ============================================================

CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$;
