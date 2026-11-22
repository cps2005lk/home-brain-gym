# Project brain

Project knowledge for people and agents. `AGENTS.md` holds only the short
rules; everything else is here. Read the file that fits your task.

| File                               | Holds                                                        | Read it when                             |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| [overview.md](overview.md)         | Goals, users, scope                                          | Planning a feature                       |
| [architecture.md](architecture.md) | Parts, data flow, data model                                 | Changing more than one part, or the data |
| [games.md](games.md)               | Every game, its levels, ideas not built, rules for all games | Adding or changing a game                |
| [glossary.md](glossary.md)         | Domain words                                                 | A word in a task is unclear              |
| [conventions.md](conventions.md)   | Coding rules and the lessons behind them                     | Writing or reviewing code                |
| [decisions/](decisions/)           | Why things are the way they are                              | Before changing something that looks odd |
| [runbooks/](runbooks/)             | Setup, deploy, migrate                                       | Doing any of those                       |
| [known-issues.md](known-issues.md) | Bugs, tech debt, accepted risks                              | Before fixing or touching a risky area   |
| [trust.md](trust.md)               | Which rung an agent is on, per area                          | Before an agent changes an area          |

Facts marked `> Unverified:` are guesses. Confirm them before relying on them.
When code changes, update the matching file here in the same pull request.
