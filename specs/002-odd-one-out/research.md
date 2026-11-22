# Research: Odd One Out

No "NEEDS CLARIFICATION" was left in the plan: the stack is fixed and the
owner settled the open choices in the spec. These are the design decisions.

## R1. Which game to copy

- **Decision**: Copy the shape of Arrow Rush (timed, `correct`/`mistakes`,
  `lastAnswer`, a new round after every answer) and the grid of tap buttons
  from Tap the Order (input = cell index).
- **Rationale**: Together they cover every rule in the spec. Same `meta`,
  `create`, `reduce`, `isOver`, `progress` shape as all games.
- **Alternatives**: Pattern Memory (grid, but lives, not timed) - wrong end rule.

## R2. Shapes and how they are drawn

- **Decision**: Five shape kinds: `circle`, `square`, `triangle`, `star`,
  `heart`. Drawn as inline SVG in `view.tsx`, one colour for the whole grid.
  The logic only knows the kind and its look numbers; drawing is the view's job.
- **Rationale**: Simple shapes, no pictures (spec assumption). SVG makes size,
  turn and a small dot exact. One colour for all means colour is never the
  difference (FR-006).
- **Alternatives**: Emoji or text glyphs - size and turn look different on each
  phone, and some glyphs are coloured. A diamond was left out: it is a square
  turned 45°, so it is not "a different kind" at Junior.

## R3. Teen changes and the "really looks different" rule (FR-016)

- **Decision**: Four changes: `bigger`, `smaller`, `turned`, `no-dot`. Every
  Teen shape has a small centre dot; `no-dot` removes it. Each kind has a
  `symmetryDeg` (circle 0 = any turn, square 90, triangle 120, star 72,
  heart 360). `turned` is allowed for a kind only if `symmetryDeg > 0` and
  `turnDeg % symmetryDeg !== 0`. So a circle is never turned, and a turn that
  maps the shape onto itself can never be picked. One function,
  `changesFor(kind, level)`, returns the allowed list and is tested for every
  kind.
- **Size and turn amounts** live in the Teen level config (`biggerScale` 1.2,
  `smallerScale` 0.82, `turnDeg` 20) so the owner can tune them after SC-007
  in one place.
- **Alternatives**: A mirrored shape - most of our shapes are mirror-symmetric,
  so it would often look the same. Colour shade - not allowed (FR-006).

## R4. The 300 ms pause after a new grid (FR-017)

- **Decision**: State has `gridShownAtMs`. An answer with
  `atMs < gridShownAtMs + NEW_GRID_PAUSE_MS` (300) is ignored: no score, no
  mistake, no new grid, only `nowMs` moves. The first grid starts at
  `startedAtMs`, so it gets the same pause.
- **Rationale**: Time comes from `atMs`, so the rule is pure and testable.

## R5. Flash token for ignored taps

- **Finding**: `useGameRunner` adds 1 to `answerCount` on **every** tap, even
  one the rules ignore. Arrow Rush never ignores taps, so it does not matter
  there. Here an ignored tap would replay the last green/red flash.
- **Decision**: The view passes `flashToken={state.correct + state.mistakes}`
  to `PlayShell` instead of `answerCount`. It changes only when a tap really
  counted.
- **Alternatives**: Change `useGameRunner` - touches shared code, against
  FR-014 and SC-006.

## R6. End of time

- **Decision**: `reduce` first checks `event.atMs >= endsAtMs`. If so it only
  moves `nowMs` (so `isOver` becomes true) and does not count the tap. The grid
  on screen is not counted as right or wrong.
- **Rationale**: The spec edge case "a tap after time is up is ignored". Arrow
  Rush would still count a tap that comes before the next tick; this is a small
  improvement, kept inside this game.

## R7. Styles

- **Decision**: Reuse `.grid` and `.cell` (from Pattern Memory) for the
  buttons, plus a small `.cell.shape` block in `global.css` (SVG fills the
  cell, light background so shapes stand out). Columns come from the level
  (`gridTemplateColumns: repeat(cols, 1fr)`), like Tap the Order.
- **Rationale**: All game styles live in `global.css`. Gaps between buttons are
  not buttons, so a tap there does nothing (spec edge case).

## R8. Meta

- **Decision**: `id: "odd-one-out"`, `name: "Odd One Out"`, `skill:
"attention"`, `skillLabel: "Visual attention"`, `how: "One shape is
different. Tap it!"`, `glyph: "◆"`, `accent: "var(--blue)"`, `scoreUnit:
"rounds"`, `scoreUnitOne: "round"`, `timed: true`. Detail text: "1 mistake" /
  "N mistakes".
- **Rationale**: `attention` is the existing skill group (spec assumption), so
  `SkillTag` in `src/core/game.ts` does not change.
