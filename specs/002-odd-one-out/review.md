# Review: specs/002-odd-one-out

Reviewer: `.claude/agents/reviewer.md` (read-only). Branch 002-odd-one-out, base main, 2026-11-23T02:12Z.

Reviewed-commit: 880c8b4597aec7842f4401221126b95990f52f95
Round: 2

## Findings

| # | Severity | Where | Problem | Why it matters | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | major | `specs/002-odd-one-out/review.md` (added in cb69bf1) | `scripts/check.sh` exits 1. Build and all 283 tests pass, but Prettier warns on this file: "Code style issues found". | Constitution Principle IV says green means `scripts/check.sh` passes. The pre-push hook and CI will block the push. A failing check is a finding. | Run `npx prettier --write specs/002-odd-one-out/review.md` and commit it. Re-run `scripts/check.sh` to confirm exit 0. |
| 2 | minor | `specs/002-odd-one-out/review.md` | It is the round-1 review, for commit d2a8adf, with a CHANGES NEEDED verdict. Its findings 1–3 are now closed by the latest commit, which ticks T014, T018, T020 and T025. | A stale CHANGES NEEDED file in the folder can confuse the CI gate or a reader. | Replace it with the new review output for this round. |
| 3 | minor | `view.test.tsx` (Teen draw test) | The test fixes the grid to the `no-dot` change, so only the dot drawing is proven. Nothing proves that `scale` or `turnDeg` change what is drawn. This was round-1 finding 4 and it is still there. | If the view ignored size or turn, no test would fail. FR-016 asks for "looks different as drawn" for every change. | Add fixed-roll cases for `bigger`, `smaller` and `turned`, each expecting exactly one differing drawing. |
| 4 | minor | `view.test.tsx` | No view-level test shows a Teen game ending at 30 s. | US2-3 is covered only by the logic test on `endsAtMs`. | Optional: add a Teen `PlayScreen` save test. |

## Requirements traced

| Requirement | Test | Code | OK? |
| --- | --- | --- | --- |
| FR-001/002, US1-1 | Junior `makeGrid` over 500 seeds; view shows 6 buttons with one differing drawing | `makeGrid`, `view.tsx` | OK |
| FR-003, US2-1/2 | Teen `makeGrid` over 500 seeds; view shows 16 buttons in 4 columns | `makeGrid` Teen path | OK |
| FR-004/005 | scripted `Rng` tests; same-seed equality test | `Rng` only | OK |
| FR-006 | Teen draw test (dot only) | `currentColor`, one colour | Partly: scale and turn drawing are untested (finding 3) |
| FR-007/008, US1-2/3 | `reduce` tests with exact scripted new grids; view flash tests | `reduce`, `flash` | OK |
| FR-009/010, US1-4, US2-3 | `create` end times; `progress`; Junior save test | `isOddOneOutOver` | OK (Teen end is logic-only, finding 4) |
| FR-011/012/013, US3-2/3/5 | shared tests; manual T020, ticked by the owner | shared code | OK, hand check only |
| US3-4 Stop | `PlayScreen` Stop test | shared | OK |
| FR-014/SC-006 scope | T023; the diff touches only the allowed files | n/a | OK |
| FR-015 | none needed | nothing stored | OK |
| FR-016 | `changesFor` tests and the Teen seed loop | `changesFor` | OK |
| FR-017 | 299 ms and 300 ms tests; first-grid test; view pause test | `NEW_GRID_PAUSE_MS` | OK |
| SC-007 | human; ticked in T025 | n/a | Claimed done by the owner |

Red proof: every Red commit changes test files only. Each fails for a real reason: a missing module or export, or a named test failing (T008, T013, T017).

## Not checked

- I could not run the app. I did not check how the shapes are drawn: the fit of the bigger shape in the SVG box, or how visible the dot is.
- I could not verify the human checks (T014, T018, T020, T025), only that they are ticked.
- I could not rerun the T022 mutation checks.
- I did not read `useGameRunner` to confirm the `createRng` mock in the T026 test matches how the runner gets its random numbers. The test passes, so it likely does.

Verdict: CHANGES NEEDED
