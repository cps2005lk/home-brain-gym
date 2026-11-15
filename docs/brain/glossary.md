# Glossary

| Word        | Meaning here                                                                   | Not to be confused with             |
| ----------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| Family      | The tenant. Owns kids, sessions and parents                                    | —                                   |
| Parent      | A signed-in Google account that is a member of a family. All parents are equal | A user role with more rights        |
| Kid         | A profile under a family: nickname, avatar, colour, level, limit. No login     | A user account                      |
| Guest       | Someone playing without a kid profile. Nothing is saved                        | A signed-out parent                 |
| Session     | One finished game: kid, game, level, score, time, duration                     | A login session                     |
| Level       | Junior or Teen. Set by a parent only                                           | Difficulty chosen by the kid        |
| Best        | A kid's own highest score in one game and level                                | A family high score (there is none) |
| Day         | A calendar day in `Asia/Colombo`                                               | The device's local date             |
| Streak day  | A day with at least 2 finished games. One missed day in any 7 is forgiven      | A day with any play                 |
| Daily limit | Minutes a kid may play per day. Blocks starting a game, never a running one    | A timer that stops a game           |
| Invite code | A short, single-use code that lets a second parent join, valid 7 days          | An email invitation                 |
| Game module | One game's pure logic, defined with `defineGame({...})`                        | A React component                   |
