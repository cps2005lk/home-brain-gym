# Brain Gym constitution

**Version**: 1.0.0 | **Ratified**: 2026-11-22 | **Last amended**: 2026-11-22

Spec Kit checks every spec, plan and task list against this file. It
**links** to the project's rules instead of copying them: one fact, one
place. If this file and a linked file disagree, the linked file wins and this
file is fixed.

## Principles

### I. Project rules

Every rule in [`AGENTS.md`](../../AGENTS.md) applies, and the knowledge in
[`docs/brain/`](../../docs/brain/README.md) is the background. Read them
before planning.

### II. Games

A game follows [`docs/brain/games.md`](../../docs/brain/games.md): the folder
layout, and the "Rules that apply to every game". Game logic has no React and
is fully tested.

### III. Test first (non-negotiable)

Every change in behaviour starts with a test that fails, for the right
reason, before the code exists. The `Red:` commit holds tests only; the
`Green:` commit follows. A test that passes at once proves nothing.

### IV. Green means `scripts/check.sh`

Build, tests, lint, format and the factory checks: all must pass. `npm test`
alone is not enough.

### V. Kids come first

Kids' data stays minimal, and a kid is only ever compared with their own
best (see `AGENTS.md` and `games.md`).

## Governance

- A change to this file is a pull request with a new version number and a
  reason, approved by the human owner. A wrong rule is changed in the open,
  never read differently.
- The factory's roles and review gate apply to every feature
  (`.factory/playbooks/task-loop.md`).
