# AGENTS.md

Home Brain Gym: short brain games for two kids. React + Vite + TypeScript
(strict), Supabase, deployed by Vercel.

## Commands

- Check everything before you finish: `scripts/check.sh` (build with
  type-check, tests, lint, format). `npm test` alone is not enough: Vitest
  strips types, so type errors hide behind green tests.
- Once per clone, turn on the git hooks: `.factory/guardrails/setup-hooks.sh`
  They block commits on `main`, secrets, and pushes that fail `scripts/check.sh`.
- Once per clone, also run `.factory/adapters/claude/setup-identity.sh`: git then
  follows the session's GitHub token. Start agent sessions with `claude-agent`
  (the limited agent token); a GitHub write without it asks the human first.
- `.claude/settings.json` checks every shell command an agent runs (factory
  kit). A block is a stop sign: tell the user, don't work around it.
- Each session writes `docs/usage/<date>-<session>.yml`. Commit new ones with
  the next PR. `.factory/usage/report.sh` shows them all.
- New features use Spec Kit (`specs/<feature>/`, rules in
  `.specify/memory/constitution.md`). The implementer builds
  (`claude --agent implementer`); a human runs
  `.factory/adapters/claude/review.sh specs/<feature>`. CI blocks the merge
  until the review approves. For kids' data, money, access or time, add
  `--model opus` (the default reviewer is Sonnet, chosen by experiment).
  How far agents may go: `docs/brain/trust.md`.
- Unattended agent work runs in the factory's box (a Docker container with a
  fresh clone and a limited token): `.factory/container/run.sh task …`. The
  database token is never in the project; it lives in the password manager.

## Rules

- Before you write or review code, read `docs/brain/standards/` and follow
  it. Follow only ADRs in `docs/brain/decisions/` with the status
  `accepted`. Never change a standard or an ADR to make your code pass:
  stop and ask.
- Never push to `main`. Every push to `main` deploys to the live app.
- Kids' data: only nickname, avatar, level and scores. No birthdates, photos,
  tracking or analytics. Ask before adding any field about a kid.
- A kid is only ever compared with their own best, never with a sibling.
- A game that has started is never cut off by the daily limit; only the kid's
  own Stop throws it away (`docs/brain/decisions/0004`).
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
