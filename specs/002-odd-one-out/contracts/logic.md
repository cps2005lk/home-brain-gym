# Contract: `src/games/odd-one-out/logic.ts`

What the logic file exports, so the tests and the view can rely on it.
Types are in [data-model.md](../data-model.md).

## Exports

| Name                      | What it is                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `oddOneOut`               | The game, made with `defineGame` (registered in `index.ts`).                                  |
| `ODD_ONE_OUT_LEVELS`      | `Record<LevelId, OddOneOutLevel>`.                                                            |
| `SHAPE_KINDS`             | `readonly ShapeKind[]`, the order used for rolls.                                             |
| `SYMMETRY_DEG`            | `Record<ShapeKind, number>`.                                                                  |
| `NEW_GRID_PAUSE_MS`       | `300`.                                                                                        |
| `changesFor(kind, level)` | Allowed Teen changes for a kind (FR-016).                                                     |
| `makeGrid(level, rng)`    | One new grid for a level.                                                                     |
| `sameShape(a, b)`         | `true` when all four fields match. Used by tests.                                             |
| Types                     | `ShapeKind`, `Shape`, `Change`, `Grid`, `OddOneOutLevel`, `OddOneOutState`, `OddOneOutInput`. |

## `meta`

`id "odd-one-out"`, name "Odd One Out", skill `attention`, skillLabel
"Visual attention", how "One shape is different. Tap it!", scoreUnit
"rounds" / "round", `timed: true`.

## `progress(state)`

`{ score: correct, detail: "1 mistake" | "N mistakes", timeLeftMs:
max(0, endsAtMs - nowMs), livesLeft: null }`.

## Order of `Rng` calls in `makeGrid`

Tests use `scriptedRng`, so the order is part of the contract:

**Junior** (3 rolls)

1. `nextInt(rows * cols)` → `oddIndex`
2. `nextInt(SHAPE_KINDS.length)` → the common kind
3. `nextInt(SHAPE_KINDS.length - 1)` → the odd kind, counted over the kinds
   left after removing the common one

**Teen** (3 rolls)

1. `nextInt(rows * cols)` → `oddIndex`
2. `nextInt(SHAPE_KINDS.length)` → the kind (same for all)
3. `nextInt(changesFor(kind, level).length)` → the change

Common Teen shape: `{ kind, scale: 1, turnDeg: 0, dot: true }`. Junior shapes
have `dot: false`.

## View contract (`view.tsx`)

- Uses `useGameRunner(oddOneOut, kid.level, handleFinish)` and `PlayShell`,
  like Arrow Rush.
- One `<button>` per shape, `aria-label` "Shape N"; `onClick` sends the index.
- `flashToken = state.correct + state.mistakes` (not `answerCount`; see
  research R5).
- Shapes drawn as inline SVG, all in one colour.
