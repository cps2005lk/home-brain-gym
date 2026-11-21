# AGENTS.md

Home Brain Gym: short brain games for two kids. React + Vite + TypeScript
(strict), Supabase, deployed by Vercel.

## Commands

- Check everything before you finish: `scripts/check.sh` (build with
  type-check, tests, lint, format). `npm test` alone is not enough: Vitest
  strips types, so type errors hide behind green tests.
- Once per clone, turn on the git hooks: `.factory/guardrails/setup-hooks.sh`
- `.claude/settings.json` checks every shell command an agent runs (factory
  kit). A block is a stop sign: tell the user, don't work around it.
  They block commits on `main`, secrets, and pushes that fail `scripts/check.sh`.

## Rules

- Never push to `main`. Every push to `main` deploys to the live app.
- Kids' data: only nickname, avatar, level and scores. No birthdates, photos,
  tracking or analytics. Ask before adding any field about a kid.
- A kid is only ever compared with their own best, never with a sibling.
- A game that has started always finishes and always counts.
- Game rules are plain TypeScript with no React. Randomness comes from `Rng`,
  time from the event's `atMs`, never from the clock inside the rules.
- A "day" is an `Asia/Colombo` day. Use `dayKey()`, never the device's date.
- Database changes: add a new file in `supabase/migrations/`. A human runs it
  by hand; never run SQL against the live project. Then `npm run types:gen`.

## Surprises

- RLS policies run as the caller, so `authenticated` needs `EXECUTE` on any
  function a policy calls.
- React StrictMode runs effects twice: "check then create" makes duplicates.
  Fix it in SQL, and cache the promise, not the result.
- Ids sent to Postgres must be real uuids.
- `oxlint` finds real React bugs. Fix them; don't silence them.
- `npx supabase login` doesn't work in an agent session (it needs a terminal).

## Read on demand

Project knowledge is in `docs/brain/README.md`. Read the file that fits the task.
