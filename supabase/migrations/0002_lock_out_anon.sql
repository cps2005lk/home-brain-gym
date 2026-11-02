-- Shut the door completely for visitors who are not signed in.
--
-- Supabase gives new tables in the "public" schema to the `anon` role by
-- default. Row Level Security already made those requests return nothing, but
-- "nothing" is still an answer. After this file, the API refuses them outright.
--
-- Run this in the Supabase SQL editor, after 0001_init.sql.

revoke all on public.families       from anon;
revoke all on public.family_members from anon;
revoke all on public.kids           from anon;
revoke all on public.sessions       from anon;

revoke execute on function public.create_family(text)     from anon, public;
revoke execute on function public.is_family_member(uuid)  from anon, public;

grant execute on function public.create_family(text) to authenticated;

-- Tables made later in this schema will not be handed to anon either.
alter default privileges in schema public revoke all on tables from anon;
