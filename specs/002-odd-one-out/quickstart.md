# Quickstart: check Odd One Out works

## Prerequisites

- `npm install` done; git hooks on (`.factory/guardrails/setup-hooks.sh`).
- On branch `002-odd-one-out`.

## 1. Automated checks

```sh
npx vitest run src/games/odd-one-out   # the game's own tests
scripts/check.sh                        # build + types, all tests, lint, format
```

Expected: all green. The game tests cover (see [contracts/logic.md](contracts/logic.md)):

- Level settings (2×3 / 45 s, 4×4 / 30 s).
- Many seeded grids per level: exactly one odd shape, the rest equal (SC-001).
- Junior odd shape is another kind; Teen odd shape is the same kind (FR-002, FR-003).
- `changesFor`: never `turned` for a circle, or by a self-mapping turn (FR-016).
- Same seed + same taps → same game (FR-005).
- Right tap, wrong tap, tap in the 300 ms pause, tap after time is up.

## 2. Play it (manual)

```sh
npm run dev
```

1. Pick a Junior kid → Odd One Out is in the list with "Visual attention".
2. Play: 6 shapes, one clearly different. Right tap = green flash and a new
   grid; wrong tap = red flash and a new grid. Fast double tap: only one counts.
3. After 45 s: result shows rounds and mistakes, compared with this kid's own
   best only.
4. Teen kid: 16 shapes, a subtle change, 30 s.
5. Press Stop mid-game → home, nothing saved.

## 3. Owner check before merge (SC-007)

The owner plays 3 Teen games and confirms each difference is visible but not
instant. If it is too easy or too hard, tune `biggerScale`, `smallerScale` or
`turnDeg` in `ODD_ONE_OUT_LEVELS` (one place).

## 4. Scope check (SC-006)

```sh
git diff --stat main...HEAD -- src
```

Expected: only `src/games/odd-one-out/*`, `src/games/index.ts`,
`src/games/views.tsx` and `src/styles/global.css`.
