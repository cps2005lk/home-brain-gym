# Runbook: change the database

**When:** a change needs a new table, column, policy or function.
**Needs:** a parent's Supabase dashboard login (a human step), and
`SUPABASE_ACCESS_TOKEN` in `.env.local` for the types.

## Steps

1. Add the next numbered file in `supabase/migrations/`, for example
   `0007_short_name.sql`. Never edit a file that is already applied.
2. Add or update rule tests in `supabase/tests/rls.sql`.
3. **A human** opens Supabase → **SQL Editor**, pastes the file and runs it.
   Agents never run SQL against the live project.
   Check: run a read-only query that looks for the new objects, for example
   `select to_regclass('public.<new_table>');`
4. Regenerate the types: `npm run types:gen`.
   Check: `src/data/database.types.ts` shows the change, and `npm run build` passes.
5. Update "Applied" in the table below, and `architecture.md` if the data
   model changed.

## If it goes wrong

Write a new migration that undoes the change. Don't edit the applied file.

## Live project facts

| Thing       | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| Project ref | `dcrijjdfkecvtvwxvfkg`                                                |
| URL         | `https://dcrijjdfkecvtvwxvfkg.supabase.co` (no `/rest/v1` on the end) |
| Keys        | Publishable `sb_publishable_…` in `.env.local` (git-ignored)          |
| Applied     | 0001–0006 (checked 2026-11-15)                                        |

First-time setup: [supabase-setup.md](supabase-setup.md) and
[google-signin-setup.md](google-signin-setup.md).
