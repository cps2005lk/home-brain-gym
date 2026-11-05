-- Tests for the security rules: who can see and change what.
--
-- Run the WHOLE file in the Supabase SQL editor. It makes its own test users,
-- families, kids and scores, checks the rules, and then ROLLS BACK, so your
-- real data is never touched and nothing is left behind.
--
-- Expect to see a list of "ok 1 ... ok 13" and no "not ok".
--
-- Why not Vitest: these rules live inside Postgres. The only honest way to
-- test them is to be a user and try.

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- ------------------------------------------------------------ the cast
--
-- Four people: two parents of family A (the second joins by invite),
-- one parent of family B, and one outsider.

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'parent.a@test.local'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'parent.b@test.local'),
  ('cccccccc-0000-4000-8000-000000000003', 'wife@test.local'),
  ('dddddddd-0000-4000-8000-000000000004', 'stranger@test.local');

insert into public.families (id, name) values
  ('f0000000-0000-4000-8000-00000000000a', 'Family A'),
  ('f0000000-0000-4000-8000-00000000000b', 'Family B');

insert into public.family_members (family_id, user_id, role, email) values
  ('f0000000-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-000000000001', 'parent', 'parent.a@test.local'),
  ('f0000000-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-000000000002', 'parent', 'parent.b@test.local');

insert into public.kids (id, family_id, name, level, avatar, color) values
  ('c0000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-00000000000a', 'Kid A', 'junior', '🐢', 'sun'),
  ('c0000000-0000-4000-8000-00000000000b', 'f0000000-0000-4000-8000-00000000000b', 'Kid B', 'teen', '🚀', 'sky');

insert into public.sessions (id, family_id, kid_id, game_id, level, score, detail, duration_ms) values
  ('50000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-00000000000a',
   'c0000000-0000-4000-8000-00000000000a', 'color-clash', 'junior', 12, '', 45000),
  ('50000000-0000-4000-8000-00000000000b', 'f0000000-0000-4000-8000-00000000000b',
   'c0000000-0000-4000-8000-00000000000b', 'color-clash', 'teen', 30, '', 30000);

-- Invites made by hand, so we can test the ones that must be refused.
insert into public.family_invites (id, family_id, code, email, invited_by, expires_at, revoked_at) values
  ('10000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000000a',
   'EXPIRED1', null, 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '1 day', null),
  ('10000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-00000000000a',
   'REVOKED1', null, 'aaaaaaaa-0000-4000-8000-000000000001', now() + interval '7 days', now()),
  ('10000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-00000000000a',
   'FORWIFE1', 'wife@test.local', 'aaaaaaaa-0000-4000-8000-000000000001', now() + interval '7 days', null);

-- Become a signed-in user: set the claims Supabase reads, then drop to the
-- role a real request uses. `set local` undoes itself when we roll back.
create or replace function pg_temp.act_as(user_id uuid, user_email text)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'email', user_email, 'role', 'authenticated')::text,
    true);
  execute 'set local role authenticated';
end;
$$;

-- ------------------------------------------------------------ seeing data

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001', 'parent.a@test.local');

select is((select count(*) from public.kids)::int, 1,
          'a parent sees their own family''s kid');

select is((select count(*) from public.sessions)::int, 1,
          'a parent sees their own family''s scores');

reset role;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002', 'parent.b@test.local');

select is((select count(*) from public.kids
            where family_id = 'f0000000-0000-4000-8000-00000000000a')::int, 0,
          'a parent of another family sees nothing of this one');

reset role;
set local role anon;

select throws_ok(
  'select count(*) from public.kids',
  '42501',
  null,
  'a visitor who is not signed in is refused');

-- ------------------------------------------------------------ invites

reset role;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001', 'parent.a@test.local');

select set_config('test.code', public.create_invite('wife@test.local'), true);

reset role;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003', 'wife@test.local');

select is(public.accept_invite(current_setting('test.code')),
          'f0000000-0000-4000-8000-00000000000a'::uuid,
          'the invited parent joins the right family');

select is((select count(*) from public.kids)::int, 1,
          'the second parent now sees the family''s kid');

reset role;
select pg_temp.act_as('dddddddd-0000-4000-8000-000000000004', 'stranger@test.local');

select throws_ok(
  format('select public.accept_invite(%L)', current_setting('test.code')),
  'that invite was already used',
  'a code cannot be used twice');

select throws_ok(
  'select public.accept_invite(''EXPIRED1'')',
  'that invite has expired',
  'an expired code is refused');

select throws_ok(
  'select public.accept_invite(''REVOKED1'')',
  'that invite was cancelled',
  'a cancelled code is refused');

select throws_ok(
  'select public.accept_invite(''FORWIFE1'')',
  'that invite was made for a different email address',
  'a code locked to an email only works for that email');

-- ------------------------------------------------------------ parents

reset role;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002', 'parent.b@test.local');

select throws_ok(
  'delete from public.family_members where user_id = ''bbbbbbbb-0000-4000-8000-000000000002''',
  'a family must keep at least one parent',
  'the last parent of a family cannot be removed');

reset role;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001', 'parent.a@test.local');

delete from public.family_members
 where user_id = 'cccccccc-0000-4000-8000-000000000003';

select is((select count(*) from public.family_members)::int, 1,
          'with two parents, one of them can be removed');

select is((select count(*) from public.family_invites
            where family_id = 'f0000000-0000-4000-8000-00000000000b')::int, 0,
          'a parent cannot see another family''s invites');

-- ------------------------------------------------------------ done

reset role;
select * from finish();

rollback;
