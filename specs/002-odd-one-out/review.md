# Review: specs/002-odd-one-out

Reviewer: `.claude/agents/reviewer.md` (read-only). Branch 002-odd-one-out, base main, 2026-11-23T02:13Z.

Reviewed-commit: 41fe4933e43394905b42292d86de3ba72b18e453
Round: 3

## Findings

| # | Severity | Where | Problem | Why it matters | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | minor | `view.test.tsx`, Teen draw test | The Teen test fixes the roll to `no-dot`. Only the dot drawing is proven. Nothing shows that `scale` or `turnDeg` change what is drawn. | If the view ignored size or turn, no test would fail. FR-016 says the odd shape must look different as drawn, for every change. | Add fixed-roll cases for bigger, smaller and turned. Each should expect exactly one differing drawing. |
| 2 | minor | `view.test.tsx` | No view-level test shows a Teen game ending at 30 s and being saved. | US2-3 is covered only by the logic test on `endsAtMs`. The risk is small. | Optional: add a Teen `PlayScreen` save test. |
| 3 | minor | `specs/002-odd-one-out/review.md` | The file in the diff is the round-2 review, for commit 880c8b4, with verdict CHANGES NEEDED. Its main finding (Prettier failing on it) is fixed by 41fe493, which adds it to `.prettierignore`. | A stale CHANGES NEEDED file may confuse a reader or the CI gate. | Let `review.sh` overwrite it with this round's result. |
| 4 | minor | `view.tsx`, `ShapeDrawing` | The centre dot uses `var(--board-ink)`, and the cell background uses the same variable. The dot therefore matches the background and reads as a hole. That is fine for "light spot". The look was checked by hand, not by a test. | Low risk. The owner ticked T018. | None needed. |

Checks: `scripts/check.sh` exited 0. The build passed, all 283 tests passed, and Prettier was clean.

Red proof: every Red commit changes test files only. Each fails for a real reason. T002, T004, T006, T011 and T015 fail on a missing module or export. T008, T013 and T017 fail on named tests.

Scope: only the game folder, `index.ts`, `views.tsx`, one block in `global.css` and `games.md` changed. The rest is specs and usage files.

## Requirements traced

| Requirement | Test | Code | OK? |
| --- | --- | --- | --- |
| FR-001/002, US1-1 | Junior `makeGrid` over 500 seeds; the view draws 6 buttons with one differing drawing | `makeGrid` | OK |
| FR-003, US2-1/2 | Teen `makeGrid` over 500 seeds; the view draws 16 buttons in 4 columns | `makeGrid` Teen path | OK |
| FR-004/005 | Scripted-`Rng` tests; same-seed equality test | `Rng` only, no clock | OK |
| FR-006 | Teen view test (dot only) | `currentColor` | Partly: scale and turn drawing untested (finding 1) |
| FR-007/008, US1-2/3 | `reduce` tests with exact scripted new grids; view flash tests | `reduce`, `flashToken` | OK |
| FR-009/010, US1-4, US2-3 | `create` end times; `progress`; Junior save test | `isOddOneOutOver` | OK (Teen end is logic-only) |
| FR-011/012/013, US3-2/3/5 | Shared tests; owner's manual T020 | Shared code | OK by hand |
| US3-4 Stop | `PlayScreen` Stop test | Shared | OK |
| FR-014/SC-006 | Diff scope; T023 | n/a | OK |
| FR-015 | None needed | Nothing new stored | OK |
| FR-016 | `changesFor` tests; Teen seed loop | `changesFor` | OK |
| FR-017 | 299 ms and 300 ms tests; first-grid test; view pause test | `NEW_GRID_PAUSE_MS` | OK |
| SC-007 | Human; ticked in T025 | n/a | Claimed by the owner |

## Not checked

- I could not run the app. I did not check how the shapes look: whether the bigger shape fits the SVG box, or whether the dot is visible.
- I could not verify the human checks (T014, T018, T020, T025). I only saw that they are ticked.
- I could not rerun the T022 mutation checks.
- I did not read `useGameRunner`. I could not confirm that the `createRng` mock matches how the runner gets its numbers. The test passes.

Verdict: APPROVE
