-- One-time cleanup after the duplicate-family bug.
--
-- It only removes rows that hold nothing: families with no kids and no scores,
-- plus the "Probe" kid row added while debugging. A family with real data is
-- never touched, so this is safe to run even later.
--
-- Run this in the Supabase SQL editor, after 0004.

-- 1. The debugging row.
delete from public.kids
where name = 'Probe';

-- 2. Families with no kids and no scores. Deleting a family also removes its
--    membership rows, because of "on delete cascade" in 0001.
delete from public.families f
where not exists (select 1 from public.kids k where k.family_id = f.id)
  and not exists (select 1 from public.sessions s where s.family_id = f.id);

-- 3. Check: this should now return one row per family you really use (zero,
--    if the app has not rebuilt it yet - the next page load will).
select f.id, f.name, (select count(*) from public.kids k where k.family_id = f.id) as kids
from public.families f;
