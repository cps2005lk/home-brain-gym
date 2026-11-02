-- Home Brain Gym - first schema
-- Run this once in the Supabase SQL editor.
--
-- Shape:  families  ->  kids  ->  sessions (one row per finished game)
-- A parent signs in; kids are rows under that parent's family, with no login.
-- Row Level Security makes sure one family can never read another family's rows.

-- ---------------------------------------------------------------- types

-- A Postgres enum, the twin of our TypeScript union "junior" | "teen".
-- The generated TypeScript types will say exactly that.
create type public.level_id as enum ('junior', 'teen');

-- ---------------------------------------------------------------- tables

create table public.families (
  id         uuid primary key default gen_random_uuid(),   -- like NEWID() in SQL Server
  name       text not null default 'My family',
  created_at timestamptz not null default now()            -- like datetimeoffset
);

-- Which signed-in user belongs to which family. One parent today, more later.
-- auth.users is Supabase's own table of logins; we never store passwords.
create table public.family_members (
  family_id  uuid not null references public.families (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'parent',
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.kids (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families (id) on delete cascade,
  name                text not null check (char_length(trim(name)) between 1 and 24),
  level               public.level_id not null default 'junior',
  avatar              text not null default '🐢',
  color               text not null default 'sun',
  -- null means "no limit set yet". Used from Milestone 8.
  daily_limit_minutes int check (daily_limit_minutes is null or daily_limit_minutes between 1 and 600),
  created_at          timestamptz not null default now()
);

create table public.sessions (
  -- The id is made by the app when a play ends, so sending the same play twice
  -- updates one row instead of adding a second one.
  id          uuid primary key,
  family_id   uuid not null references public.families (id) on delete cascade,
  kid_id      uuid not null references public.kids (id) on delete cascade,
  game_id     text not null,
  level       public.level_id not null,
  score       int not null check (score >= 0),
  detail      text not null default '',
  played_at   timestamptz not null default now(),
  duration_ms int not null default 0 check (duration_ms >= 0)
);

-- Indexes for the two questions we ask most: "this kid's history" and
-- "everything for this family".
create index kids_family_idx on public.kids (family_id);
create index sessions_kid_played_idx on public.sessions (kid_id, played_at desc);
create index sessions_family_idx on public.sessions (family_id);

-- ---------------------------------------------------------------- security

-- Is the person making this request a member of that family?
-- "security definer" lets it read family_members even though the caller cannot,
-- like EXECUTE AS OWNER in SQL Server. It is the only way in.
create or replace function public.is_family_member(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members m
    where m.family_id = target_family
      and m.user_id = auth.uid()
  );
$$;

-- Row Level Security: with this on, a table returns NOTHING unless a policy
-- below says otherwise. Same feature and same name as in SQL Server.
alter table public.families      enable row level security;
alter table public.family_members enable row level security;
alter table public.kids          enable row level security;
alter table public.sessions      enable row level security;

create policy "read own family" on public.families
  for select using (public.is_family_member(id));

create policy "rename own family" on public.families
  for update using (public.is_family_member(id))
  with check (public.is_family_member(id));

-- Checked directly against the user id: a policy that called
-- is_family_member() here would ask this same table again, forever.
create policy "read own membership" on public.family_members
  for select using (user_id = auth.uid());

create policy "kids belong to the family" on public.kids
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "scores belong to the family" on public.sessions
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---------------------------------------------------------------- sign-up

-- Called once, right after a parent's first sign-in: makes the family and the
-- membership together. A plain insert cannot do this, because the policies
-- above only allow writing rows for a family you are already a member of.
create or replace function public.create_family(family_name text default 'My family')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  insert into public.families (name)
  values (coalesce(nullif(trim(family_name), ''), 'My family'))
  returning id into new_family;

  insert into public.family_members (family_id, user_id, role)
  values (new_family, auth.uid(), 'parent');

  return new_family;
end;
$$;

-- ---------------------------------------------------------------- grants

-- Signed-in parents may use these tables (the policies still decide which rows).
-- Visitors who are not signed in (the "anon" role) get nothing at all.
grant select, insert, update, delete on public.families, public.kids, public.sessions to authenticated;
grant select on public.family_members to authenticated;

revoke all on function public.create_family(text) from public;
grant execute on function public.create_family(text) to authenticated;
