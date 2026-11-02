-- Fix for a mistake in 0002.
--
-- 0002 revoked EXECUTE on is_family_member() from PUBLIC. But every Row Level
-- Security policy calls that function, and a policy is evaluated with the
-- privileges of the person making the request. Without EXECUTE, a signed-in
-- parent would get "permission denied for function is_family_member" on every
-- single query.
--
-- Give the right back to signed-in users only. Visitors (anon) still have none.
--
-- Run this in the Supabase SQL editor, after 0002_lock_out_anon.sql.

grant execute on function public.is_family_member(uuid) to authenticated;
