# Coding standards

Rules for writing code in Brain Gym, and the lessons that taught them. How to
write and change a rule: [README.md](README.md). Rules for games are in
[games.md](../games.md) ("Rules that apply to every game"); `AGENTS.md` has
the short version of the most important ones.

### STD-001 (must): TypeScript strict everywhere

Why: the type-checker finds bugs the tests miss.
Checked by: `check.sh` (`npm run build` type-checks with `strict` on)

### STD-002 (must): Game logic has no React, no clock and no `Math.random()`

Time arrives as `atMs` with each event, and randomness through the `Rng`
interface.

Why: that makes every game a pure function, so tests can feed exact numbers
and run in under a second.
Checked by: review

### STD-003 (should): A new game is one folder plus two registry lines

See [games.md](../games.md).

Why: nothing else in the app should need to change; if it does, the design
has a gap.
Checked by: review

### STD-004 (must): Fix race conditions where the data lives

"Check, then create" across a network is a race. Fix it in SQL; in the app,
cache the _promise_, not the result.

Why: React StrictMode runs effects twice in development, and that created
duplicate families. The fix went into SQL (`create_family` returns the
existing family, migration 0004).
Checked by: review

### STD-005 (must): A function called by an RLS policy is granted to `authenticated`

Use `grant execute ... to authenticated`.

Why: RLS policies run with the caller's rights; without the grant the policy
fails (migration 0003).
Checked by: review

### STD-006 (must): Ids written to Postgres are real uuids

Why: `"kid-1"` worked in localStorage and was refused by Postgres.
Checked by: review

### STD-007 (must): Don't silence `oxlint`; fix the code instead

Why: it has caught impure renders, `setState` inside effects and refs read
during render.
Checked by: `check.sh` (`npm run lint`) for the findings; review for any
comment or setting that turns a rule off

### STD-008 (must): `security definer` only for actions that cross families

Creating a family and accepting an invite run as `security definer`, because
the caller is not yet a member. Keep these functions small and check every
input.

Why: they run with more rights than the caller, so every extra line is extra
risk.
Checked by: review
