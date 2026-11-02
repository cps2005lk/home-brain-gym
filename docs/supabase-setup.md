# Supabase setup (Milestone 5)

You do these steps once, in your browser. I cannot create the account for you.
Everything here stays inside the free plan.

## 1. Create the project

1. Go to <https://supabase.com> and sign up (GitHub sign-in is the quickest).
2. **New project**:
   - Name: `home-brain-gym`
   - Database password: let the page generate one, then **save it in your
     password manager**. You will rarely need it, but it cannot be shown again.
   - Region: pick the closest one to Sri Lanka - **Singapore** or **Mumbai**.
     This only changes speed, not price.
3. Wait about two minutes while the database starts.

## 2. Create the tables

1. Open **SQL Editor** in the left menu, then **New query**.
2. Open `supabase/migrations/0001_init.sql` from this repository, copy
   everything, paste it into the editor.
3. Press **Run**. You should see "Success. No rows returned".
4. Open **Table Editor**: you should now see `families`, `family_members`,
   `kids` and `sessions`, each with a green **RLS enabled** badge.

If you ever need to start again, run this first, then run the file again:

```sql
drop table if exists public.sessions, public.kids, public.family_members, public.families cascade;
drop function if exists public.create_family(text);
drop function if exists public.is_family_member(uuid);
drop type if exists public.level_id;
```

## 3. Copy the two keys

1. **Project Settings → API**.
2. Copy **Project URL** and the **anon / public** key.
3. In the project folder, copy `.env.example` to `.env.local` and paste both
   values in.

```bash
cp .env.example .env.local
```

`.env.local` is in `.gitignore`, so it never reaches GitHub.

**Is the anon key a secret?** No. It is made to sit in the browser. It only
says "a request is coming from this project". What a request may actually read
or write is decided by the Row Level Security policies. The key that _is_
secret is the `service_role` key - never put that in the app, and never commit
it.

## 4. Later, in Milestone 5b

- Turn on **Google** sign-in under _Authentication → Providers_ (I will give
  you those steps when we get there).
- Generate TypeScript types from the real database:

```bash
npx supabase login
npx supabase gen types typescript --project-id YOUR-PROJECT-REF > src/data/database.types.ts
```

## What the schema does

| Table            | What it holds                                                                     |
| ---------------- | --------------------------------------------------------------------------------- |
| `families`       | one row per family (the tenant)                                                   |
| `family_members` | which signed-in parent belongs to which family                                    |
| `kids`           | nickname, level, avatar, colour, daily limit. No email, no password, no birthdate |
| `sessions`       | one row per finished game: kid, game, level, score, detail, time, duration        |

Every table has **Row Level Security** on. A request can only see rows whose
`family_id` belongs to the signed-in parent, so adding other families later
needs no change to the app code.

`sessions.id` is created by the app when a play ends, so sending the same play
twice updates one row instead of adding a second one.
