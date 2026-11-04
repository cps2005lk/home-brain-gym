-- Fix: create_family() must never make a second family for the same parent.
--
-- The app can call it twice at almost the same moment (React runs effects
-- twice in development, and two devices can sign in together). Both calls saw
-- "no family yet" and both made one. The database is the only place that can
-- settle this, so the function now returns the family the parent already has.
--
-- Run this in the Supabase SQL editor, after 0003.

create or replace function public.create_family(family_name text default 'My family')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing   uuid;
  new_family uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  -- Already in a family? Give that one back and change nothing.
  select m.family_id
    into existing
    from public.family_members m
   where m.user_id = auth.uid()
   order by m.created_at
   limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.families (name)
  values (coalesce(nullif(trim(family_name), ''), 'My family'))
  returning id into new_family;

  insert into public.family_members (family_id, user_id, role)
  values (new_family, auth.uid(), 'parent');

  return new_family;
end;
$$;

revoke all on function public.create_family(text) from anon, public;
grant execute on function public.create_family(text) to authenticated;
