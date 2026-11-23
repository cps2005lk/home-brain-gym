# Project brain

Project knowledge for people and agents. `AGENTS.md` holds only the short
rules; everything else is here. Read the file that fits your task.

| File | Holds | Read it when |
| --- | --- | --- |
| [overview.md](overview.md) | Goals, users, scope | Planning a feature |
| [architecture.md](architecture.md) | Parts, data flow, data model | Changing more than one part, or the data |
| [glossary.md](glossary.md) | Domain words | A word in a task is unclear |
| [standards/](standards/README.md) | Coding and testing standards and guidelines, each with an ID | **Always**, before writing or reviewing code |
| [decisions/](decisions/README.md) | Architecture decisions (ADRs); follow only `accepted` ones | Before changing a part, the data or a standard, or something that looks odd |
| [runbooks/](runbooks/) | How to run, test, deploy, migrate, restore | Doing any of those |
| [known-issues.md](known-issues.md) | Bugs, tech debt, accepted risks | Before fixing or touching a risky area |
| [trust.md](trust.md) | Which rung an agent is on, per area | Before an agent changes an area |

Facts marked `> Unverified:` are guesses. Confirm them before relying on them.
When code changes, update the matching file here in the same pull request.
