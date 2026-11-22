# Review: specs/002-odd-one-out

Reviewer: `.claude/agents/reviewer.md` (read-only). Branch 002-odd-one-out, base main, 2026-11-22T14:29Z.

Reviewed-commit: d2a8adf191c7afc55b85ffe7184ad1a77049b69e
Round: 1

## Findings

| # | Severity | Where | Problem | Why it matters | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | major | `specs/002-odd-one-out/tasks.md`, T014 and T018 | Both are `[ ]`. The code for each is in the diff (`views.tsx` entry, scale/turn/dot drawing in `view.tsx`), and the Red tests for them now pass. Their steps also include `scripts/check.sh` and a hand-play check, and there is no record of the hand-play. | The task file says the work is not finished. The tasks rule says to tick the box in the same commit as the work. | Tick T014 and T018 once the hand-play check is done, and note the result in the PR. |
| 2 | major | tasks.md, T020 | The manual check of Stop, the daily limit, the streak and the list text is unticked. Nothing in the diff shows it was done. | Spec scenarios US3-3 and US3-5 (the daily limit never cuts a started game, the streak) have no test for this game. They rely on this hand check and on the shared tests, which use other game ids. | Do the check, tick T020, and write down what was checked. |
| 3 | major | tasks.md, T025 | The people check (SC-007) is unticked. | The spec requires it before merge: the owner plays 3 Teen games, and the younger kid plays 1 Junior game. This is a human task and the agent cannot do it, but the feature is not finished until it is done. | The owner does it, then ticks T025. Tune `ODD_ONE_OUT_LEVELS` only if needed, as a new Red/Green pair. |
| 4 | minor | `view.test.tsx` | The Teen draw test now fixes the grid to the `no-dot` change, so only the dot drawing is proven. Nothing checks that `scale` or `turnDeg` change what is drawn. | If the view ignored size or turn, no test would fail. FR-016 requires the odd shape to look different as drawn for every change. | Add fixed-roll cases for `bigger`, `smaller` and `turned`, each asserting exactly one differing drawing. |
| 5 | minor | `view.test.tsx` | No view-level test shows a Teen game ending at 30 s. Teen `endsAtMs` is tested only in the logic tests. | Spec scenario US2-3 is covered only by the logic. | Optional: a Teen `PlayScreen` save test. |

## Requirements traced

| Requirement | Test | Code | OK? |
| --- | --- | --- | --- |
| FR-001/002, US1-1 (Junior 2×3, odd kind differs) | logic: Junior `makeGrid` over 500 seeds; view: 6 buttons with one differing drawing | `makeGrid`, `view.tsx` | OK |
| FR-003, US2-1/2 (Teen 4×4, same kind, one subtle change) | logic: Teen `makeGrid` over 500 seeds; view: 16 buttons, 4 columns | `makeGrid` Teen path | OK |
| FR-004/005 (random choice, same seed same game) | seeded-run equality test | `Rng` only | OK |
| FR-006 (not by colour alone) | Teen draw test (dot only) | one colour, `currentColor` | OK. Scale and turn drawing are untested (finding 4) |
| FR-007/008, US1-2/3 (right/wrong, new grid, flash) | reduce tests with an exact scripted new grid; view flash tests | `reduce`, `flash` | OK |
| FR-009/010, US1-4, US2-3 (45 s / 30 s, end result) | `create` end times; progress; Junior save test | `isOddOneOutOver`, `progress` | OK. Teen end is logic-only (finding 5) |
| FR-011/012/013, US3-2/3/5 | shared tests only; manual check T020 not done | shared code | Gap (finding 2) |
| US3-4 (Stop saves nothing) | `PlayScreen` Stop test | shared | OK |
| FR-014/SC-006 (scope) | scope check T023 | diff is limited to the allowed files | OK |
| FR-015 (no new kid data) | none needed | nothing stored | OK |
| FR-016 (no useless turn) | `changesFor` tests, including turn 90, 72 and 120; Teen seeds check circle never turned | `changesFor` | OK |
| FR-017 (300 ms pause) | 299 ms and 300 ms boundary tests, plus a first-grid test | `NEW_GRID_PAUSE_MS` | OK |
| SC-007 (people check) | none | none | Open (finding 3) |

Red proof: every Red commit fails for a real reason. The module is missing, an export is missing, or a named test fails (T008, T013, T017). Red commits change test files only. The final check run exits 0, with 283 tests passing and formatting clean.

## Not checked

- I could not run the app, so I did not look at how the shapes are drawn. This covers the bigger shape's fit in the SVG box and how visible the dot is.
- I did not confirm that `useGameRunner` takes its random numbers from `createRng`. The T026 mock depends on that, and the test passes, so it likely does.
- I could not rerun the T022 mutation checks.
- I could not check the daily-limit and streak behaviour in the browser.

Verdict: CHANGES NEEDED
