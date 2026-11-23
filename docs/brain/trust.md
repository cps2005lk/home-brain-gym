# Trust ladder

Which rung an agent is on, per area. The rules (what each rung allows, how to
climb, when to drop) are in the factory's onboarding playbook, step 5
(`.factory/playbooks/onboarding.md`).

Rungs: 1 read-only · 2 small PRs, a human reads every line · 3 features from
an approved spec. To climb from 2 to 3: 5 PRs in a row in that area, merged
with no correction after review.

Isolation: proven on 2026-11-23 (the factory's agent box, with a probe pair).
Rung 3 also needs that, so an area with 5 of 5 can now climb.

| Area                                                         | Rung         | Proof (tests, PR record)                                                                                      | Since      |
| ------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------- | ---------- |
| Game logic (`src/games/*/logic.ts`)                          | 2            | Logic tests, mutation-checked in the safety net (M5). PR record: 1 of 5 (#9, no correction)                   | 2026-11-22 |
| Family admin (`src/data/familyAdmin.ts`)                     | 2            | Characterization tests, mutation-checked (M5). PR record: 0 of 5                                              | 2026-11-22 |
| Parent screen (`src/screens/ParentScreen.tsx`)               | 2            | Characterization tests; a mutation check found and closed one gap (M5). PR record: 0 of 5                     | 2026-11-22 |
| Game screens: Odd One Out (`src/games/odd-one-out/view.tsx`) | 2            | Screen tests, mutation-checked (the dot: T026; size and turn: PR #12). PR record: 1 of 5 (#12, no correction) | 2026-11-23 |
| Game screens: the other games (`src/games/*/view.tsx`)       | 1            | No screen tests yet                                                                                           | 2026-11-23 |
| Other screens and `App.tsx`                                  | 1            | Thin tests (only the midnight and Stop tests)                                                                 | 2026-11-22 |
| Database migrations                                          | always human | Run by hand on the live database (`AGENTS.md`)                                                                | 2026-11-22 |

## Exceptions

| Date       | Area                             | What                                                                                                                     | Why                                                                                                          |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 2026-11-22 | Game logic and a new game screen | Odd One Out is a whole feature (rung 3 work) built at rung 2: agents build it, the human reads every line before merging | First end-to-end run of the factory (M10). Chosen over a rung-3 exception so the PR counts toward the record |

## Slips

| Date | Area | What happened | Rung change | Fix (check or rule) |
| ---- | ---- | ------------- | ----------- | ------------------- |
