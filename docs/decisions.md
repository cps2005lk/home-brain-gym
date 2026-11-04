# Decisions

Choices we agreed before writing code. Update this file when a decision changes.

| Topic                 | Decision                                                                                                            | Why                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Backend               | Supabase (Postgres + Auth + RLS)                                                                                    | SQL, migrations and row level security are close to SQL Server knowledge; it generates TypeScript types from the real schema |
| Data flow             | Local first: save on the device, sync to Supabase when online                                                       | Games stay instant and work with no internet                                                                                 |
| Hosting               | Vercel (free), auto deploy from GitHub                                                                              | Simplest for Vite + React                                                                                                    |
| Frontend              | React + Vite + TypeScript strict                                                                                    | Most useful skill to learn, strong TypeScript support, very fast dev server                                                  |
| Tests                 | Vitest                                                                                                              | Same config as Vite, no extra setup                                                                                          |
| Charts                | Recharts (Milestone 6)                                                                                              | Typed React components                                                                                                       |
| Parent login          | Google sign in                                                                                                      | No password to remember, free, less to build and secure                                                                      |
| Kid select            | Open picker, no lock. "Switch kid" always easy to reach                                                             | Kids choose themselves; speed matters more than locking                                                                      |
| Kid tile shows        | Avatar + colour chosen by the kid, streak / best, time left today                                                   | The picker itself motivates                                                                                                  |
| Guest mode            | A visitor can play, nothing is saved                                                                                | Friends and cousins do not pollute a kid's history                                                                           |
| Wrong kid score       | Parent can delete a score in the parent view                                                                        | No lock means mis taps happen                                                                                                |
| Daily time limit      | Parent sets it. The running game finishes and counts; no new game after the limit. Resets at midnight, Asia/Colombo | Never cut a kid off mid game                                                                                                 |
| Level (Junior / Teen) | Parent only, in settings                                                                                            | A kid cannot switch to an easier level to get a better "best"                                                                |
| Multi tenant          | All data under a family from day one: families -> kids -> sessions, separated by RLS on family_id                   | Other families can be added later with no rewrite                                                                            |
| Kid data              | Only nickname, avatar, level, scores. No birthdates, photos or tracking                                             | Kids' data stays minimal                                                                                                     |
| Language              | English only in v1                                                                                                  | Keep v1 small                                                                                                                |
| PWA                   | **Not in v1** (decided 5 Nov 2026)                                                                                  | The kids just open the page in the phone or tablet browser. Nothing to install, nothing to update. Can be added in v2        |
| Repo                  | home-brain-gym, private                                                                                             | Family app                                                                                                                   |

Streak and badge rules (Milestone 7): a day counts after 2 games; one missed
day in any 7 is forgiven; six badges, all about the kid's own play.

New games (Milestone 9): **Quick Add**, **Back One** and **Tap the Order** were
chosen from six ideas. The three that were not chosen are kept in
[games.md](./games.md) so we do not lose them.
