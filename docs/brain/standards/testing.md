# Testing standards

Rules for writing and running tests in Brain Gym. How to write and change a
rule: [README.md](README.md). "Test first" (a `Red:` commit with tests only,
then `Green:`) is principle III of the
[constitution](../../../.specify/memory/constitution.md); it is not repeated
here.

### STD-009 (must): Green means `scripts/check.sh`, not `npm test`

Run the whole check (build with type-check, tests, lint, format) before you
finish.

Why: Vitest strips types before running, so `npm test` can be green while the
code doesn't compile.
Checked by: `check.sh` (the pre-push hook and CI run it)
