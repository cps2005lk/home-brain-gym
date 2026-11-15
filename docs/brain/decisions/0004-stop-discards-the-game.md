# 0004: Stop discards the game

- **Status:** accepted
- **Date:** 2026-11-16

## Context

Every game has a Stop button. A browser test found that Stop goes home
without saving: no score, no "Last", and the time is not counted. The code did
this since the first version, but it was written down nowhere.

## Decision

Keep it. Stop means "that one didn't count", for a mis-tap, the wrong kid, or
a game started by accident. Only a game that runs to its end is saved.

## Consequences

- A kid can't spoil their history with a half game.
- Time spent in a stopped game does not count toward the daily limit. A kid
  could stop and restart to play longer. Accepted for a family app; recorded
  in [known-issues.md](../known-issues.md).
- Test: `src/screens/PlayScreen.stop.test.tsx`.

## Alternatives

- **Drop the score but count the time.** Closes the time-limit gap; needs a
  small change in how sessions are saved. Not chosen for now.
- **Save a stopped game like a finished one.** Half games would lower a kid's
  averages and charts.
