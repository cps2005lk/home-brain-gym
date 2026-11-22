---
description: "Task list for Odd One Out (002)"
---

# Tasks: Odd One Out

**Input**: Design documents from `specs/002-odd-one-out/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md),
[research.md](research.md), [data-model.md](data-model.md),
[contracts/logic.md](contracts/logic.md), [quickstart.md](quickstart.md)

**Tests**: Required. The constitution (Principle III) says every change in
behaviour starts with a failing test. Each logic step is a pair:

- a `Red:` task: tests only, in `src/games/odd-one-out/logic.test.ts`. Run
  `npx vitest run src/games/odd-one-out` and see the new tests fail **for the
  reason written in the task**. Commit with a message that starts `Red:`.
- a `Green:` task: the smallest code that makes them pass. Run
  `scripts/check.sh` (all green), then commit with a message that starts
  `Green:`. Do not write code for a later task early: it would make that
  task's tests pass at once.

Views (`view.tsx`) have no tests in this project (no other game has view
tests). They are checked by hand with `npm run dev` (see
[quickstart.md](quickstart.md) section 2).

**Organization**: Tasks are grouped by user story so each story can be built
and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path conventions

Single web app. The game lives in `src/games/odd-one-out/`. The only other
files that may change: `src/games/index.ts`, `src/games/views.tsx`,
`src/styles/global.css`, `docs/brain/games.md` (FR-014, SC-006).
Never change shared code (`src/core`, `src/play`, `src/screens`, `src/data`).

## Decisions made while writing these tasks

- `changesFor(kind, level)` takes the **level settings object**
  (`OddOneOutLevel`), not the level id, because the turn rule needs
  `level.turnDeg`. This also lets a test pass its own `turnDeg` (for example 90) to prove a self-mapping turn is left out.
- `makeGrid(level, rng)` takes the **level id** (`LevelId`), like `create`.

---

## Phase 1: Setup

**Purpose**: Make sure the starting point is clean.

- [ ] T001 Check the start: on branch `002-odd-one-out`, git hooks on (`.factory/guardrails/setup-hooks.sh`), and `scripts/check.sh` passes from the repo root before any change. If it fails, stop and tell the owner; do not fix unrelated code.

---

## Phase 2: Foundational (blocking)

**Purpose**: The types and fixed numbers that both levels need. No user story
can start before this.

- [ ] T002 Red: create `src/games/odd-one-out/logic.test.ts` with tests for the constants in `src/games/odd-one-out/logic.ts` (file does not exist yet, so the import fails - that is the expected red): `ODD_ONE_OUT_LEVELS.junior` equals `{ seconds: 45, rows: 2, cols: 3, subtle: false, biggerScale: 1.2, smallerScale: 0.82, turnDeg: 20 }` and `ODD_ONE_OUT_LEVELS.teen` equals `{ seconds: 30, rows: 4, cols: 4, subtle: true, biggerScale: 1.2, smallerScale: 0.82, turnDeg: 20 }` (data-model.md: the type is one shape for both, unused numbers kept on Junior); `SHAPE_KINDS` equals `["circle", "square", "triangle", "star", "heart"]` in this order; `SYMMETRY_DEG` equals `{ circle: 0, square: 90, triangle: 120, star: 72, heart: 360 }`; `NEW_GRID_PAUSE_MS` is `300`; `sameShape(a, b)` is `true` when `kind`, `scale`, `turnDeg` and `dot` all match, and `false` when any one of the four differs (one test per field).
- [ ] T003 Green: create `src/games/odd-one-out/logic.ts` with the types `ShapeKind` (`"circle" | "square" | "triangle" | "star" | "heart"`), `Shape` (`kind`, `scale`, `turnDeg`, `dot`, all `readonly`), `Change` (`"bigger" | "smaller" | "turned" | "no-dot"`), `Grid` (`shapes: readonly Shape[]`, `oddIndex: number`), `OddOneOutLevel`, and the exports `ODD_ONE_OUT_LEVELS: Record<LevelId, OddOneOutLevel>`, `SHAPE_KINDS: readonly ShapeKind[]`, `SYMMETRY_DEG: Record<ShapeKind, number>`, `NEW_GRID_PAUSE_MS = 300`, `sameShape`. No React, no `Math.random()`, no clock. Only enough to make T002 pass.

**Checkpoint**: Constants and types are in place; story work can start.

---

## Phase 3: User Story 1 - Play Odd One Out at Junior level (Priority: P1) 🎯 MVP

**Goal**: A Junior kid can play a full 45-second game: 2×3 grid, one shape of
a different kind, right/wrong flash, a new grid after every tap, result at
the end.

**Independent Test**: `npm run dev`, pick a Junior kid, open Odd One Out, tap
the odd shape on several grids, tap a wrong one once, let the time run out:
the result shows the right number of rounds and mistakes.

### Junior grids

- [ ] T004 [US1] Red: in `src/games/odd-one-out/logic.test.ts` add tests for `makeGrid("junior", rng)`. Expected red: `makeGrid` is not exported. Tests: (a) the Rng order from contracts/logic.md - with `scriptedRng([4, 0, 0])` the grid has `oddIndex` 4, common kind `circle`, odd kind `square` (first kind left after removing `circle`); with `scriptedRng([0, 2, 2])` the common kind is `triangle` and the odd kind is `star` (kinds left: circle, square, star, heart); with `scriptedRng([5, 4, 3])` the common kind is `heart` and the odd kind is `star`; exactly 3 rolls (`scriptedRng` throws if more are asked); (b) every Junior shape has `scale: 1`, `turnDeg: 0`, `dot: false`; (c) over at least 500 grids from `createSeededRng(seed)`: `shapes.length === 6`, `0 <= oddIndex < 6`, every shape except `shapes[oddIndex]` is `sameShape` with the others, the odd shape is not, and the odd `kind` differs from the common `kind` (SC-001, FR-001, FR-002).
- [ ] T005 [US1] Green: add `makeGrid(level: LevelId, rng: Rng): Grid` to `src/games/odd-one-out/logic.ts`, Junior path only, with the 3 rolls in the exact contract order: `nextInt(rows * cols)` → `oddIndex`, `nextInt(SHAPE_KINDS.length)` → common kind, `nextInt(SHAPE_KINDS.length - 1)` → odd kind counted over the kinds left. Do **not** write the Teen path yet (T012 tests it).

### Junior game rules

- [ ] T006 [US1] Red: in `src/games/odd-one-out/logic.test.ts` add tests for the game object `oddOneOut`. Expected red: `oddOneOut` is not exported. Tests: (a) `meta` equals `{ id: "odd-one-out", name: "Odd One Out", skill: "attention", skillLabel: "Visual attention", how: "One shape is different. Tap it!", glyph: "◆", accent: "var(--blue)", scoreUnit: "rounds", scoreUnitOne: "round", timed: true }` and `levels` is `ODD_ONE_OUT_LEVELS`; (b) `create("junior", rng, 1000)` gives `endsAtMs` 46000, `nowMs` 1000, `gridShownAtMs` 1000, `correct` 0, `mistakes` 0, `lastAnswer` null, and the grid that `makeGrid` gives for the same scripted numbers; (c) the `reduce` rules from data-model.md "State changes", each with its own test: game already over → same state object back; `tick` → only `nowMs` moves; answer with `atMs >= endsAtMs` → only `nowMs` moves, `isOver` becomes true, not counted; answer at `gridShownAtMs + 299` → ignored (only `nowMs` moves, same grid, no new roll); answer at exactly `gridShownAtMs + 300` → counts; the first grid gets the same pause (answer at `startedAtMs + 100` is ignored); index `-1` and index `6` → only `nowMs` moves; answer on `oddIndex` → `correct + 1`, `lastAnswer: "right"`, a new grid, `gridShownAtMs = atMs`; any other index → `mistakes + 1`, `lastAnswer: "wrong"`, a new grid, `gridShownAtMs = atMs`, `correct` unchanged; (d) `progress` gives `{ score: correct, detail: "1 mistake" | "N mistakes" (test 0, 1 and 2), timeLeftMs: max(0, endsAtMs - nowMs), livesLeft: null }`; (e) FR-005: two games from `createSeededRng(7)` fed the same list of answers end in equal states.
- [ ] T007 [US1] Green: add `OddOneOutState` (fields from data-model.md: `level`, `endsAtMs`, `nowMs`, `grid`, `gridShownAtMs`, `correct`, `mistakes`, `lastAnswer: "right" | "wrong" | null`), `OddOneOutInput = number`, and `export const oddOneOut = defineGame<OddOneOutState, OddOneOutInput, OddOneOutLevel>({...})` to `src/games/odd-one-out/logic.ts`, modelled on `src/games/arrow-rush/logic.ts`. `reduce` checks the rules in the data-model.md order (over → tick → `atMs >= endsAtMs` → pause → index out of range → right → wrong). New grids come from `makeGrid(state.level, rng)`.

### Register and draw

- [ ] T008 [US1] Red: in `src/games/odd-one-out/logic.test.ts` add a test that `findGame("odd-one-out")` from `src/games/index.ts` is `oddOneOut`. Expected red: it returns `undefined`.
- [ ] T009 [US1] Green: in `src/games/index.ts` import `oddOneOut` from `./odd-one-out/logic` and add it as the last entry of `GAMES`. No other change in that file.
- [ ] T010 [P] [US1] In `src/styles/global.css`, after the `.cell.number` block, add a small `.cell.shape` block (research R7): the SVG fills the cell, light background so the shapes stand out. Reuse `.grid` and `.cell`; do not change existing rules.
- [ ] T011 [US1] Create `src/games/odd-one-out/view.tsx` with `OddOneOutView({ kid, onFinish, onQuit }: GameViewProps)`, modelled on `src/games/tap-order/view.tsx`: `useGameRunner(oddOneOut, kid.level, handleFinish)`, `PlayShell` with `totalMs = levels[kid.level].seconds * 1000`, `flash={state.lastAnswer}` and `flashToken={state.correct + state.mistakes}` (**not** `answerCount`, research R5); a `<div className="grid">` with `gridTemplateColumns: repeat(cols, 1fr)` from the level; one `<button type="button" className="cell shape">` per shape with `aria-label` "Shape N" (N = index + 1) and `onClick={() => answer(index)}`; each shape drawn as inline SVG for its `kind` (circle, square, triangle, star, heart), all in one colour (FR-006). Then add `"odd-one-out": OddOneOutView,` as the last line of `GAME_VIEWS` in `src/games/views.tsx` (plus its import). Run `scripts/check.sh`, then play a Junior game by hand (quickstart.md section 2, steps 1-3), including a fast double tap: only one tap counts and the flash does not replay.

**Checkpoint**: Odd One Out is in the list and a Junior game can be played
from start to result. This is the MVP.

---

## Phase 4: User Story 2 - Play Odd One Out at Teen level (Priority: P2)

**Goal**: A Teen kid gets a 4×4 grid where the odd shape is the same kind,
only a bit bigger, smaller, turned, or missing its centre dot; 30 seconds.

**Independent Test**: `npm run dev`, pick a Teen kid, open Odd One Out: each
grid has 16 shapes of one kind, one subtly different; the game ends after
30 s with rounds and mistakes.

### Allowed changes (FR-016)

- [ ] T012 [US2] Red: in `src/games/odd-one-out/logic.test.ts` add tests for `changesFor(kind, level)` and the Teen path of `makeGrid`. Expected red: `changesFor` is not exported, and the Teen grids from the Junior-only `makeGrid` are wrong. Tests: (a) `changesFor` with `ODD_ONE_OUT_LEVELS.teen` (`turnDeg` 20): `circle` → `["bigger", "smaller", "no-dot"]` (never `turned`, `symmetryDeg` 0); `square`, `triangle`, `star`, `heart` → `["bigger", "smaller", "turned", "no-dot"]`; (b) with `{ ...ODD_ONE_OUT_LEVELS.teen, turnDeg: 90 }` `square` has no `turned`; with `turnDeg: 72` `star` has no `turned`; with `turnDeg: 120` `triangle` has no `turned` (`turnDeg % symmetryDeg === 0`); (c) the Teen Rng order from contracts/logic.md: `scriptedRng([7, 1, 2])` gives `oddIndex` 7, all shapes `square`, change `turned` (odd shape `turnDeg: 20`); `scriptedRng([0, 0, 2])` gives `circle` with change `no-dot` (third of the circle's list); exactly 3 rolls; (d) common Teen shape is `{ kind, scale: 1, turnDeg: 0, dot: true }`; odd shape for `bigger` has `scale: 1.2`, for `smaller` `scale: 0.82`, for `turned` `turnDeg: 20`, for `no-dot` `dot: false`; (e) over at least 500 grids from `createSeededRng(seed)`: `shapes.length === 16`, exactly one odd shape, all others `sameShape`, the odd `kind` equals the common `kind`, exactly one of `scale`, `turnDeg`, `dot` differs, and a `circle` is never turned (SC-001, FR-003, FR-016); (f) `create("teen", rng, 1000)` gives `endsAtMs` 31000 and a 16-shape grid.
- [ ] T013 [US2] Green: in `src/games/odd-one-out/logic.ts` add `changesFor(kind: ShapeKind, level: OddOneOutLevel): readonly Change[]` (order `bigger`, `smaller`, `turned`, `no-dot`; `turned` left out when `SYMMETRY_DEG[kind] === 0` or `level.turnDeg % SYMMETRY_DEG[kind] === 0`) and the Teen path of `makeGrid` (`level.subtle === true`): rolls `nextInt(rows * cols)` → `oddIndex`, `nextInt(SHAPE_KINDS.length)` → kind, `nextInt(changesFor(kind, level).length)` → change; sizes and turn come from the level settings, not from new numbers in the code.

### Draw the Teen changes

- [ ] T014 [US2] In `src/games/odd-one-out/view.tsx` draw each shape's look: `scale` and `turnDeg` as an SVG `transform` around the centre of the shape, and a small centre dot when `dot` is `true` (same colour family, visible on every kind). The odd shape must look different without telling colours apart (FR-006). Run `scripts/check.sh`, then play a Teen game by hand (quickstart.md section 2, step 4).

**Checkpoint**: Both levels work. Teen grids are 4×4 with one subtle change.

---

## Phase 5: User Story 3 - Odd One Out behaves like every other game (Priority: P3)

**Goal**: The game fits in: shown in the list with its skill and how to play,
score compared with the kid's own best only, daily limit, Stop and streak
work as for every game. This is shared code, so this phase is mostly
checking, not building.

**Independent Test**: Finish a game (score saved, compared with own best);
press Stop mid-game (nothing saved); let the daily limit run out mid-game
(the game still finishes and counts).

- [ ] T015 [US3] Run the shared tests that cover these rules for every game in the registry and confirm they pass with Odd One Out added: `npx vitest run src/screens/PlayScreen.stop.test.tsx src/data/streaks.test.ts src/data/timeLimit.test.ts src/data/progress.test.ts`. Do not change these files or the shared code (SC-005, SC-006). If one fails because of the new game, stop and tell the owner.
- [ ] T016 [US3] Manual check with `npm run dev` (quickstart.md section 2, steps 1, 3 and 5): Odd One Out is in the game list with "Visual attention" and "One shape is different. Tap it!"; the result compares only with this kid's own best; Stop mid-game goes home and saves nothing; a game started just before the daily limit runs out still finishes and counts (`docs/brain/decisions/0004`); two finished games in a day (one of them Odd One Out) count for the streak. Write down what was checked in the commit message or the PR.
- [ ] T017 [P] [US3] In `docs/brain/games.md` remove the **Odd One Out** row from "Ideas not built yet" and add a "Built (feature 002)" table with one row: `| **Odd One Out** | Visual attention | 45 s, 2×3 grid, a different kind of shape | 30 s, 4×4 grid, a bit bigger, smaller, turned, or no dot |`.

**Checkpoint**: All three stories work and the game behaves like the others.

---

## Phase 6: Polish and cross-cutting

- [ ] T018 Mutation check (task-loop playbook): break the logic on purpose, one change at a time, and confirm the right test fails each time, then undo: (a) pause `300` → `0`; (b) Junior odd kind counted over all kinds instead of the kinds left; (c) `turned` allowed for `circle`; (d) `>= endsAtMs` → `> endsAtMs`; (e) wrong tap that does not make a new grid. Undo every change; nothing is committed from this task except a note of the results in the PR description.
- [ ] T019 Scope check (SC-006): `git diff --stat main...HEAD -- src` shows only `src/games/odd-one-out/*`, `src/games/index.ts`, `src/games/views.tsx` and `src/styles/global.css`. `git diff main...HEAD -- src/games/index.ts src/games/views.tsx` shows only the new import and the one new entry each.
- [ ] T020 Run `scripts/check.sh` one last time (all green) and commit any new `docs/usage/*.yml` files with the branch.
- [ ] T021 Owner check before merge (SC-007, a human task, not the agent): the owner plays 3 Teen games and confirms each difference is visible but not instant. If not, tune only `biggerScale`, `smallerScale` or `turnDeg` in `ODD_ONE_OUT_LEVELS` in `src/games/odd-one-out/logic.ts` (and the matching T002 test values), as a new Red/Green pair.

---

## Dependencies and execution order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. Blocks every story.
- **US1 (Phase 3)**: after Foundational.
- **US2 (Phase 4)**: after US1's T005 and T007 (it adds the Teen path to
  `makeGrid` and uses `create`). T014 needs T011 (the view exists).
- **US3 (Phase 5)**: after T009 and T011 (the game is registered and has a
  screen). It does not need US2.
- **Polish (Phase 6)**: after all stories.

### Within each story

- Every `Red:` task comes right before its `Green:` task, and is committed
  on its own.
- T004 → T005 → T006 → T007 → T008 → T009 → T011 (all in `logic.ts` /
  `logic.test.ts` or depend on the registry). T010 can be done any time in
  Phase 3.
- T012 → T013 → T014.

### Parallel opportunities

The logic tasks all edit the same two files (`logic.ts`, `logic.test.ts`), so
most of the work is in a strict order. Only these can run beside others:

- T010 (`global.css`) beside T004-T009.
- T017 (`games.md`) beside any task after T009.

## Parallel example: User Story 1

```text
Task: "T006 Red: game rule tests in src/games/odd-one-out/logic.test.ts"
Task: "T010 Add .cell.shape styles in src/styles/global.css"
```

## Implementation strategy

### MVP first (User Story 1 only)

1. Phase 1 and Phase 2.
2. Phase 3 (US1): Junior game playable.
3. **Stop and check**: play a Junior game by hand; `scripts/check.sh` green.

### Then

1. Phase 4 (US2): Teen level.
2. Phase 5 (US3): fit-in checks and the games guide.
3. Phase 6: mutation check, scope check, final checks, then the owner's
   Teen play test (SC-007) and the review
   (`.factory/adapters/claude/review.sh specs/002-odd-one-out`).

## Notes

- One task = one commit (`Red:` / `Green:` for logic pairs). Tick the box in
  this file in the same commit.
- Never push to `main`.
- If a rule in this file looks wrong, stop and ask the owner; do not read it
  differently.
