# Implementation Plan: Odd One Out

**Branch**: `002-odd-one-out` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-odd-one-out/spec.md`

## Summary

A new timed game: a grid of drawn shapes, exactly one is different, the kid
taps it. Junior: 2×3 grid, the odd shape is a different kind. Teen: 4×4 grid,
the odd shape is the same kind but a bit bigger or smaller, turned a little,
or missing its small centre dot.

The game is built like every other game (`docs/brain/games.md`): one folder
`src/games/odd-one-out/` with `logic.ts` (pure rules, `Rng` and `atMs` only),
`logic.test.ts` and `view.tsx`, plus one line in each registry. It is modelled
on **Arrow Rush** (timed, right/mistake, a new round after every answer) and
**Tap the Order** (a grid of tap buttons, the input is a cell index). Shapes
are drawn as inline SVG in the view. No database change.

## Technical Context

**Language/Version**: TypeScript ~7.0 (strict, `noUncheckedIndexedAccess`)

**Primary Dependencies**: React 19, Vite 8. No new packages.

**Storage**: N/A for this feature. The score is saved by the shared play
screen, like every game (`FinishedPlay`).

**Testing**: Vitest 5 (`logic.test.ts`, with `scriptedRng` and
`createSeededRng`); full gate is `scripts/check.sh`.

**Target Platform**: Browser (phone and tablet first), deployed by Vercel.

**Project Type**: Single-page web app.

**Performance Goals**: A new grid appears at once after a tap; at most 16 small
SVG shapes per grid, so no special work is needed.

**Constraints**: Logic has no React, no clock, no `Math.random()`; difference
never by colour alone (FR-006); a 300 ms "new grid" pause (FR-017); no shared
file outside the game folder, the two registries and `games.md` changes
(FR-014, SC-006).

**Scale/Scope**: One game, three new files, two registry lines, one doc edit.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Check                                                                                                                 | Result |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Project rules       | No new kid data; own best only (shared result screen); Stop and daily limit are shared code; Colombo day not touched. | Pass   |
| II. Games              | One folder, `logic.ts` with no React, two registry lines, the "Rules that apply to every game" kept.                  | Pass   |
| III. Test first        | Tasks will be `Red:` (tests only) then `Green:` commits for the logic.                                                | Pass   |
| IV. `scripts/check.sh` | Required before the feature is done.                                                                                  | Pass   |
| V. Kids come first     | Score only (rounds + mistakes detail). Nothing new stored.                                                            | Pass   |

**Post-design re-check (after Phase 1)**: Pass. The design adds one thing that
is easy to miss: the shared runner bumps `answerCount` on every tap, even an
ignored one, so the view takes its flash token from the game state instead
(see research R5). This keeps FR-014: no shared file changes.

## Project Structure

### Documentation (this feature)

```text
specs/002-odd-one-out/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and reasons
├── data-model.md        # Phase 1: state, grid, shape
├── quickstart.md        # Phase 1: how to check it works
├── contracts/
│   └── logic.md         # Phase 1: what logic.ts exports, and the Rng order
└── tasks.md             # Phase 2 (/speckit-tasks, not made here)
```

### Source Code (repository root)

```text
src/games/odd-one-out/
├── logic.ts          # levels, grid making, reduce, progress - no React
├── logic.test.ts     # Vitest: levels, grids, change rules, taps, pause, time
└── view.tsx          # PlayShell + a grid of SVG shape buttons

src/games/index.ts    # + import and entry `oddOneOut`
src/games/views.tsx   # + "odd-one-out": OddOneOutView
src/styles/global.css # + a few lines for the shape cells (see research R7)
docs/brain/games.md   # move Odd One Out from "Ideas" to "Built"
```

**Structure Decision**: The standard game layout from `docs/brain/games.md`.
Shared code (`src/core`, `src/play`, `src/screens`, `src/data`) is not
changed. Stop, daily limit, streak and own-best already work for every game in
the registry (`PlayScreen`, `streaks.ts`, `ResultScreen`).

## Complexity Tracking

| Violation                      | Why Needed                                       | Simpler Alternative Rejected Because                                           |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Small addition to `global.css` | Every game's board styles live in this one file. | Inline styles only would work, but break the pattern every other game follows. |
