-- Two parents (or more) in one family, joined by an invite code.
--
-- Nothing in kids or sessions is touched. This file only ADDS things, and it
-- is safe to run twice.
--
-- Run it in the Supabase SQL editor, after 0005. Export kids and sessions to
-- CSV first, and check that `select count(*)` for both is the same afterwards.

-- ------------------------------------------------------------ members

-- So the app can show who is in the family without reading auth.users,
-- which the API never exposes.
alter table public.family_members
  add column if not exists email text;

-- Fill it in for the people already here. This runs as the owner in the SQL
-- editor, which is the only place auth.users can be read.
update public.family_members m
   set email = u.email
  from auth.users u
 where u.id = m.user_id
   and m.email is distinct from u.email;

-- Every parent is equal. The column stays so a later version can add
-- something like 'viewer' without another redesign.
alter table public.family_members
  drop constraint if exists family_members_role_check;
alter table public.family_members
  add constraint family_members_role_check check (role in ('parent'));

/*
  A family must never lose its last parent: nobody could read its kids or
  scores again, and nobody could be invited back in.

  A policy cannot express this, because a policy judges one row at a time and
  this rule is about what is LEFT afterwards. A trigger can. It is the same
  job as a guard clause in a C# service method - except nothing can go around
  it, not even a hand-written SQL statement.
*/
create or replace function public.keep_one_parent()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.family_members
       where family_id = old.family_id) <= 1 then
    raise exception 'a family must keep at least one parent';
  end if;
  return old;
end;
$$;

drop trigger if exists keep_one_parent on public.family_members;
create trigger keep_one_parent
  before delete on public.family_members
  for each row execute function public.keep_one_parent();

-- Parents may now see each other (the old policy showed only your own row),
-- and any parent may remove a parent, including themselves. Inserting stays
-- impossible from outside: only the functions below add a member.
drop policy if exists "read own membership" on public.family_members;
drop policy if exists "read family members" on public.family_members;
create policy "read family members" on public.family_members
  for select using (public.is_family_member(family_id));

drop policy if exists "remove a parent" on public.family_members;
create policy "remove a parent" on public.family_members
  for delete using (public.is_family_member(family_id));

grant select, delete on public.family_members to authenticated;

-- ------------------------------------------------------------ invites

create table if not exists public.family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  code        text not null unique,
  -- When set, only that signed-in email may use the code.
  email       text,
  role        text not null default 'parent' check (role in ('parent')),
  invited_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at  timestamptz
);

create index if not exists family_invites_family_idx on public.family_invites (family_id);

alter table public.family_invites enable row level security;

-- Members can see their own family's invites. Nobody writes directly: the
-- three functions below are the only way in.
drop policy if exists "read family invites" on public.family_invites;
create policy "read family invites" on public.family_invites
  for select using (public.is_family_member(family_id));

grant select on public.family_invites to authenticated;
revoke all on public.family_invites from anon;

/*
  A short code that is easy to read out loud: no 0/O or 1/I to confuse.
  31 letters and digits, 8 characters - about 39 bits, which is plenty for an
  invite that lives 7 days, can be used once, and can be revoked.
*/
create or replace function public.new_invite_code()
returns text
language sql
volatile
as $$
  select string_agg(
           substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                  1 + floor(random() * 31)::int, 1), '')
    from generate_series(1, 8);
$$;

-- How many open invites a family may have at once.
create or replace function public.max_open_invites()
returns int language sql immutable as $$ select 5 $$;

create or replace function public.create_invite(invite_email text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  my_family uuid;
  fresh     text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select m.family_id into my_family
    from public.family_members m
   where m.user_id = auth.uid()
   order by m.created_at
   limit 1;

  if my_family is null then
    raise exception 'you are not in a family yet';
  end if;

  if (select count(*) from public.family_invites i
       where i.family_id = my_family
         and i.accepted_at is null
         and i.revoked_at is null
         and i.expires_at > now()) >= public.max_open_invites() then
    raise exception 'too many invites are already open';
  end if;

  -- Try a few codes in case of a collision; the unique index decides.
  for attempt in 1..5 loop
    begin
      fresh := public.new_invite_code();
      insert into public.family_invites (family_id, code, email, invited_by)
      values (my_family, fresh, nullif(lower(trim(invite_email)), ''), auth.uid());
      return fresh;
    exception when unique_violation then
      -- try again with another code
    end;
  end loop;

  raise exception 'could not make an invite code, please try again';
end;
$$;

create or replace function public.accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Not called "found": plpgsql already has a special variable with that
  -- name (set after every query), and shadowing it causes very confusing bugs.
  invite   public.family_invites;
  my_email text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  -- Already in a family? Version 1 gives each person one family.
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'you are already in a family';
  end if;

  select * into invite
    from public.family_invites
   where code = upper(trim(invite_code))
   limit 1;

  if invite.id is null then
    raise exception 'that code does not exist';
  end if;
  if invite.revoked_at is not null then
    raise exception 'that invite was cancelled';
  end if;
  if invite.accepted_at is not null then
    raise exception 'that invite was already used';
  end if;
  if invite.expires_at <= now() then
    raise exception 'that invite has expired';
  end if;

  my_email := lower(auth.jwt() ->> 'email');

  if invite.email is not null and invite.email <> my_email then
    raise exception 'that invite was made for a different email address';
  end if;

  insert into public.family_members (family_id, user_id, role, email)
  values (invite.family_id, auth.uid(), invite.role, my_email)
  on conflict (family_id, user_id) do nothing;

  update public.family_invites
     set accepted_at = now(), accepted_by = auth.uid()
   where id = invite.id;

  return invite.family_id;
end;
$$;

create or replace function public.revoke_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  update public.family_invites i
     set revoked_at = now()
   where i.id = invite_id
     and i.accepted_at is null
     and public.is_family_member(i.family_id);

  if not found then
    raise exception 'that invite cannot be cancelled';
  end if;
end;
$$;

-- ------------------------------------------------------------ grants

revoke all on function public.create_invite(text)  from anon, public;
revoke all on function public.accept_invite(text)  from anon, public;
revoke all on function public.revoke_invite(uuid)  from anon, public;
revoke all on function public.new_invite_code()    from anon, public;

grant execute on function public.create_invite(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;

-- Keep the email on file when a family is first made, so the parent list can
-- show it. Everything else about this function is unchanged from 0004.
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

  select m.family_id into existing
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

  insert into public.family_members (family_id, user_id, role, email)
  values (new_family, auth.uid(), 'parent', lower(auth.jwt() ->> 'email'));

  return new_family;
end;
$$;

revoke all on function public.create_family(text) from anon, public;
grant execute on function public.create_family(text) to authenticated;

-- ------------------------------------------------------------ check

-- These numbers must match what you noted before running the file.
select
  (select count(*) from public.kids)           as kids,
  (select count(*) from public.sessions)       as sessions,
  (select count(*) from public.family_members) as parents;
