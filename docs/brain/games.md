# The games

Every game is one folder under `src/games/`:

```
src/games/<game-id>/
  logic.ts        rules and scoring - no React, fully tested
  logic.test.ts   the tests
  view.tsx        the screen - draws state, sends taps back
```

Plus one line in `src/games/index.ts` (the logic registry) and one in
`src/games/views.tsx` (the screen registry). Nothing else in the app changes.

## Built (the original four)

| Game               | Skill               | Junior                             | Teen                         |
| ------------------ | ------------------- | ---------------------------------- | ---------------------------- |
| **Color Clash**    | Focus, self-control | 45 s, 3 colours                    | 30 s, 4 colours              |
| **Pattern Memory** | Working memory      | 3×3 grid, any order                | 4×4 grid, same order         |
| **Rule Switch**    | Flexible thinking   | 45 s, rule written on the card     | 30 s, no rule written        |
| **Arrow Rush**     | Attention           | 45 s, 3 arrows, middle highlighted | 30 s, 5 arrows, no highlight |

## Built (Milestone 9 - chosen from the ideas below)

| Game              | Skill                   | Junior                              | Teen                                   |
| ----------------- | ----------------------- | ----------------------------------- | -------------------------------------- |
| **Quick Add**     | Number sense            | 45 s, sums up to 10, plus only      | 30 s, numbers up to 20, plus and minus |
| **Back One**      | Working memory (harder) | 45 s, match the symbol **one** back | 30 s, match **two** back, faster       |
| **Tap the Order** | Processing speed        | 45 s, numbers 1-6                   | 30 s, numbers 1-12                     |

## Ideas not built yet

Kept here so we do not lose them.

| Game            | Skill            | What the kid does                                                                                                                             |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Odd One Out** | Visual attention | A grid of shapes, one is different - tap it. Junior 2×3 and obvious; Teen 4×4 and subtle.                                                     |
| **Stop Go**     | Self-control     | Tap every shape **except** the red one. Overlaps a little with Color Clash.                                                                   |
| **Shape Shift** | Spatial thinking | Pick which shape is the same one rotated. Junior quarter turns; Teen any angle and mirrored. The most work, because the shapes must be drawn. |

## Rules that apply to every game

- The score only ever compares a kid with **their own** best. Never with a sibling.
- A game that has started always finishes and always counts, even if the daily
  limit runs out in the middle.
- Randomness comes from the `Rng` interface, never `Math.random()` directly, so
  tests can feed exact numbers.
- Time comes in with each event (`atMs`), never from the clock inside the rules.
- Two games finished make the day count for the streak.
