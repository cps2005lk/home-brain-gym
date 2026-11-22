# Feature Specification: Odd One Out

**Feature Branch**: `002-odd-one-out`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Odd One Out, a new game for Brain Gym. A grid of shapes is shown and exactly one shape is different; the kid taps the different one. Skill: visual attention. Junior: a 2×3 grid and an obvious difference. Teen: a 4×4 grid and a subtle difference. It follows docs/brain/games.md like every other game (one folder under src/games/, logic without React, the rules that apply to every game)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Play Odd One Out at Junior level (Priority: P1)

A Junior kid picks Odd One Out from the game list. A grid of 6 shapes
(2 rows of 3) appears. Five shapes are the same; one is clearly different
(for example, one circle among squares). The kid taps the different one, sees
that it was right, and a new grid appears at once. This goes on until the
time runs out. At the end the kid sees how many grids they solved and how
that compares with their own best.

**Why this priority**: This is the whole game in its simplest form. With only
this story the game is playable and useful for the younger kid.

**Independent Test**: Start the game at Junior level, tap the odd shape on
several grids, let the time run out, and check the result screen shows the
right number of rounds.

**Acceptance Scenarios**:

1. **Given** a Junior game has started, **When** a grid is shown, **Then** it
   has exactly 6 shapes in 2 rows of 3, and exactly one of them is different.
2. **Given** a Junior grid is shown, **When** the kid taps the different
   shape, **Then** the answer counts as right, the round count goes up by one,
   and a new grid is shown.
3. **Given** a Junior grid is shown, **When** the kid taps one of the shapes
   that are the same, **Then** the answer counts as a mistake, the round count
   does not go up, and a new grid is shown.
4. **Given** a Junior game is running, **When** 45 seconds have passed,
   **Then** the game ends and the result shows the rounds solved and the
   mistakes made.

---

### User Story 2 - Play Odd One Out at Teen level (Priority: P2)

A Teen kid plays the same game, but the grid has 16 shapes (4 rows of 4) and
the odd shape is only a little different (for example, slightly bigger,
turned a little, or missing a small detail). The kid must look carefully.

**Why this priority**: It makes the game a real challenge for the older kid,
but it builds on the Junior game, so it comes second.

**Independent Test**: Start the game at Teen level, check each grid has 16
shapes with one subtle difference, play to the end, and check the result.

**Acceptance Scenarios**:

1. **Given** a Teen game has started, **When** a grid is shown, **Then** it
   has exactly 16 shapes in 4 rows of 4, and exactly one of them is different.
2. **Given** a Teen grid is shown, **Then** the odd shape is the same kind of
   shape as the others and differs only in a subtle way.
3. **Given** a Teen game is running, **When** 30 seconds have passed, **Then**
   the game ends and the result shows the rounds solved and the mistakes made.

---

### User Story 3 - Odd One Out behaves like every other game (Priority: P3)

Odd One Out shows up in the game list next to the other games, with its name,
skill ("Visual attention") and a one-line "how to play". Its score is saved
and compared only with the same kid's own best. It follows the daily limit,
the Stop button and the streak rules like every other game.

**Why this priority**: These rules come from the shared game frame, so most of
this is checking that the new game fits in, not new work.

**Independent Test**: Finish a game and check the score is saved and compared
with the kid's own best; press Stop during a game and check nothing is saved;
let the daily limit run out during a game and check the game still finishes
and counts.

**Acceptance Scenarios**:

1. **Given** the game list is open, **When** the kid looks at it, **Then** Odd
   One Out is there with its name, its skill and how to play.
2. **Given** a kid finishes a game, **When** the result is shown, **Then** it
   is compared only with that kid's own best, never with a sibling.
3. **Given** a game has started, **When** the daily limit runs out in the
   middle, **Then** the game still finishes and its score counts.
4. **Given** a game is running, **When** the kid presses Stop, **Then** the
   game is thrown away and no score is saved.
5. **Given** a kid finishes two games in a day (any games, Odd One Out
   included), **Then** the day counts for the streak.

---

### Edge Cases

- The time runs out while a grid is on screen: the game ends; that grid is
  not counted as right or wrong.
- The kid taps after the time has run out: the tap is ignored.
- The kid taps very fast, twice on the same grid: only the first tap counts;
  the second tap lands in the short pause after the new grid appears and is
  ignored (FR-017).
- The kid taps the space between shapes: nothing happens.
- The odd shape is in the same place in two grids in a row: this is allowed,
  but each grid is chosen by chance, so it should not happen often.
- The difference must be visible without telling colours apart: a kid who
  cannot tell some colours apart can still play (see FR-006).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The game MUST show a grid of shapes in which exactly one shape
  is different from all the others, and all the others are exactly the same.
- **FR-002**: At Junior level the grid MUST have 6 shapes (2 rows of 3) and
  the difference MUST be obvious: the odd shape is a different kind of shape
  (for example, a circle among squares).
- **FR-003**: At Teen level the grid MUST have 16 shapes (4 rows of 4) and the
  difference MUST be subtle: the odd shape is the same kind of shape as the
  others, changed only a little (for example, a bit bigger, turned a little,
  or with a small detail missing).
- **FR-004**: The place of the odd shape, the shapes used and the kind of
  difference MUST be chosen by chance for every grid, so the kid cannot learn
  a pattern.
- **FR-005**: The same starting chance (seed) and the same taps MUST always
  give the same game, so the rules can be tested exactly.
- **FR-006**: The difference MUST NOT depend on colour alone; it must be a
  difference of shape, size, turn or detail.
- **FR-007**: A tap on the odd shape MUST count as one round solved; a tap on
  any other shape MUST count as one mistake. After either, a new grid MUST be
  shown straight away.
- **FR-008**: The kid MUST see short feedback after each tap that tells right
  from wrong.
- **FR-009**: The game MUST be timed: 45 seconds at Junior, 30 seconds at
  Teen. Time is measured from the game's own events, not from the device
  clock inside the rules.
- **FR-010**: When the time is up, the game MUST end and show the rounds
  solved (the score) and the number of mistakes.
- **FR-011**: The score MUST only be compared with the same kid's own best,
  never with a sibling.
- **FR-012**: A started game MUST NOT be cut off by the daily limit; only the
  kid's own Stop throws it away.
- **FR-013**: A finished Odd One Out game MUST count towards the "two games a
  day" streak like any other game.
- **FR-014**: The game MUST be added the same way as every other game (one
  game folder plus one entry in each game list) and MUST NOT change other
  parts of the app.
- **FR-015**: The game MUST NOT store any new data about a kid; only the score
  data that every game already saves.
- **FR-016**: In every grid, the odd shape MUST look different as drawn. A
  change is only used for a shape that really looks different with it: a turn
  is never used for a circle, and never by an amount that maps the shape onto
  itself (for example a square turned 90°). _(Owner decision, 2026-11-22.)_
- **FR-017**: For a short moment after a new grid appears (about 300 ms), taps
  MUST be ignored, so a fast double tap cannot count as a mistake on a grid
  the kid has not seen. _(Owner decision, 2026-11-22.)_

### Key Entities

- **Grid**: one puzzle on screen. Has a level (Junior or Teen), its shapes in
  rows and columns, and which place holds the odd shape.
- **Shape**: one item in the grid. Has a kind (circle, square, triangle,
  star...) and its look (size, turn, details).
- **Game round result**: right or mistake, for one tap on one grid.
- **Game result**: rounds solved (the score) and mistakes, saved like every
  other game's result.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In 100% of grids, at both levels, exactly one shape is different
  and all the others are the same (checked by automated tests over many
  chance-made grids).
- **SC-002**: A Junior kid can solve a grid in about 2 seconds or less on
  average, so a 45-second game gives roughly 15 or more rounds.
- **SC-003**: A Teen grid takes clearly longer to solve than a Junior grid
  (about 3–5 seconds), so the Teen level feels like a real challenge.
- **SC-004**: A kid can start the game and understand what to do from the
  one-line "how to play" alone, without help from a parent.
- **SC-005**: All the shared game rules (own best only, daily limit, Stop,
  streak) behave exactly as in the other games, checked by tests.
- **SC-006**: All project checks pass, and no part of the app outside the new
  game folder and the two game lists is changed.
- **SC-007**: Before merging, the owner plays 3 Teen games and confirms that
  each difference is visible but not instant. Code cannot judge "subtle"; a
  person must. _(Owner decision, 2026-11-22.)_

## Assumptions

Confirmed by the owner on 2026-11-22: the timer, a wrong tap moving on, the
score as rounds, and the skill group below.

- The game is timed like the other games: Junior 45 seconds, Teen 30 seconds.
  The description did not say; this matches every other game.
- A wrong tap moves on to a new grid (like Arrow Rush), so the kid cannot win
  by tapping every shape one by one.
- The score is "rounds" (grids solved), with mistakes shown as the detail,
  like Tap the Order and Arrow Rush.
- The skill shown to the kid is "Visual attention"; it belongs with the
  existing "attention" skill group (with Arrow Rush).
- Shapes are simple drawn shapes (circle, square, triangle, star and similar);
  no pictures or photos.
- The game removes Odd One Out from the "Ideas not built yet" list in the
  games guide and adds it to a "Built" list.
- No database change is needed: the game uses the score saving that all games
  already share.
