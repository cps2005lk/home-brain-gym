# Conventions

`AGENTS.md` has the short rules. This file has the reasons, and the lessons
that taught them.

- **TypeScript strict everywhere.** The type-checker finds bugs the tests miss.
  Vitest strips types before running, so `npm test` can be green while the
  code doesn't compile. Always run `npm run build` (it type-checks) too.
- **Game logic has no React, no clock and no `Math.random()`.** Time arrives as
  `atMs` with each event, and randomness through the `Rng` interface. That
  makes every game a pure function, so tests can feed exact numbers and run
  in under a second.
- **A new game is one folder plus two registry lines.** See [games.md](games.md).
  Nothing else in the app should need to change; if it does, the design has a gap.
- **Fix race conditions where the data lives.** "Check, then create" across a
  network is a race. React StrictMode runs effects twice in development, and
  that created duplicate families. The fix went into SQL (`create_family`
  returns the existing family, migration 0004). In the app, cache the
  _promise_, not the result.
- **RLS policies run with the caller's rights.** A policy that calls a
  function needs `grant execute ... to authenticated` (migration 0003).
- **Ids written to Postgres are real uuids.** `"kid-1"` worked in localStorage
  and was refused by Postgres.
- **Don't silence `oxlint`.** It has caught impure renders, `setState` inside
  effects and refs read during render. Fix the code instead.
- **Security-definer functions for anything that crosses families.** Creating a
  family and accepting an invite run as `security definer`, because the caller
  is not yet a member. Keep them small and check every input.
