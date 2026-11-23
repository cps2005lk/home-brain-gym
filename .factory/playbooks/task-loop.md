# Task loop playbook

How an agent builds a feature: in small loops, with every step written to a
file, so any session (or any agent) can stop and another can continue.

The loop: **spec** (what and why) → **plan** (how) → **tasks** (small ordered
steps) → **one task**: failing test, code, checks green, commit, tick it →
next task.

Like a hospital shift change: the night nurse doesn't rely on memory. The
chart says what was done, what is next, and what to watch.

## Rules

- **Files are the truth, not memory.** A fresh session knows only what is in
  the files it reads. An instruction given only in chat doesn't exist for it.
- **A session's memory can go stale.** If a human edits the spec, plan or
  tasks, start a fresh session, so the agent reads the new version.
- **Review on paper first.** Mistakes are cheapest before any code exists.
- **A tick or a commit message is a claim.** Check the important ones.
- **When a rule is wrong, change it in the open** (a new version of the rule),
  never by reading it differently each time.

## Tool: Spec Kit

[Spec Kit](https://github.com/github/spec-kit) gives the loop a fixed shape:
templates for spec, plan and tasks, and Claude Code skills to fill them.

### Install (once per machine; ask the owner first)

```sh
brew install uv
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v<version>
```

- **Pin the version, with a cooldown.** Spec Kit is released very often (12
  releases in one month). Use a release that is about two weeks old: if a
  release has a serious problem, others usually find it within days.
- It brings its own Python (3.11+ needed); the system Python is not touched.
- The command lands in `~/.local/bin`, which may not be on `PATH`. Adding it
  (`uv tool update-shell`) edits the shell config: ask first.

### Set up a project (once per project, on a branch)

```sh
specify init --here --integration claude --script sh \
  --integration-options="--no-model-invocation"
```

- `--no-model-invocation` sets `disable-model-invocation: true` on every
  skill, so a skill runs only when a human types its command. Without it,
  the agent may start `/speckit-implement` on its own.
- **Read what it wrote before committing** (`git status`). In version 1.3.2 it
  added `.claude/skills/` and `.specify/` and changed nothing else: no
  `CLAUDE.md`, no `AGENTS.md`, no `.claude/settings.json`, no network calls in
  its scripts, no skill that grants itself permissions. Newer versions may
  add event hooks to `.claude/settings.json`; the sync check allows extra
  hooks, but read them.
- **The constitution links, it doesn't copy.** `/speckit-constitution` writes
  project rules to `.specify/memory/constitution.md`. Rules already in
  `AGENTS.md` or `docs/brain/` are linked from there, not repeated: one fact,
  one place.
- **Put "failing test first" in the constitution.** Spec Kit's tasks template
  says tests are optional.

### One feature

| Step | Who | What to check |
| --- | --- | --- |
| 0. Branch | Human or agent | Create the feature branch first, so the spec's "Feature Branch" line is true |
| 1. `/speckit-specify <what and why>` | Agent | Human reads `spec.md`: every scenario testable? Out of scope written down? No false statements? |
| 2. `/speckit-clarify` | Agent asks, human answers | Only when the spec has `[NEEDS CLARIFICATION]` markers |
| 3. `/speckit-plan` | Agent | Human reads `plan.md`: passes the constitution check? Any decision the spec didn't ask for? |
| 4. `/speckit-tasks` | Agent | Human reads `tasks.md`: every test fails before its code? |
| 5. `/speckit-analyze` | Agent (read-only) | A second reviewer. Fix the critical findings in the files, then start a **fresh** session |
| 6. `/speckit-implement` | Agent | One task at a time: Red, Green, commit, tick |
| 7. Verify | Human or reviewer | Check out a Red commit: its tests fail. Break the code on purpose: the right tests fail |

**Handoff test.** To prove the files carry the work: stop after half the
tasks, end the session, start a fresh one and type only `/speckit-implement`.
It must continue at the first unticked task.

**What the files carry, and what they don't.** `specs/<feature>/` (spec,
plan, tasks with ticks) is committed and travels. `.specify/feature.json`
(which feature is active) is git-ignored: it stays on one machine.

## What we found the first time

- **The agent bent its own rule.** A task said its tests would "PASS already
  … This is allowed by Principle I", against a rule that every test fails
  first. The fix: write all tests before the code (`/speckit-analyze` found
  this too).
- **Tests that fail for the same reason prove little.** Before any code, every
  test fails because there is no output at all. A mutation check after Green
  (for example `wc -w` → `wc -l`) shows which tests have teeth.
- **`/speckit-analyze` and a human found different problems.** Use both.
- **The personal file travels.** `~/.claude/CLAUDE.md` ("stop after each
  step", "commit after each step") applied in a sandbox project too.

## Legacy .NET track

The loop is the same; the commands in the plan are `dotnet build` and
`dotnet test`. Spec Kit has PowerShell scripts (`--script ps`) for Windows.
On legacy code, start the tasks with characterization tests (onboarding step
3) before the first change.

Sources: Spec Kit [README](https://github.com/github/spec-kit) and
[docs](https://github.github.io/spec-kit/) (last updated 2026-11-04), checked
2026-11-21. Behaviour of version 1.3.2 (files written,
`--no-model-invocation`, handoff) tested on 2026-11-21.

## Roles: implementer and reviewer

Nobody grades their own work. One role builds, another checks, like
maker-checker in a bank or a required reviewer on a pull request.

| | Implementer | Reviewer |
| --- | --- | --- |
| File | `.claude/agents/implementer.md` | `.claude/agents/reviewer.md` |
| Started by | A human: `claude --agent implementer` | A human: `.factory/adapters/claude/review.sh specs/<feature>` |
| Tools | All, behind the agent hook | Read, Grep, Glob only (no shell, no edits) |
| Gets | The feature files and the repo | A fixed prompt from the script: feature files, commits with their files, the diff, the check output |
| Writes | Code and tests: a `Red:` commit with tests only, then `Green:` | Nothing. The script writes `specs/<feature>/review.md` |
| Never | Reviews itself, edits `review.md`, changes the spec or a test to pass | Fixes anything |

Copy both files from `.factory/adapters/claude/agents/` to `.claude/agents/`,
on `main`, before a feature branch starts. Otherwise they show up in the
feature's diff.

### The review loop

1. The implementer finishes the tasks (or a checkpoint).
2. A human runs `review.sh specs/<feature>`. It refuses uncommitted work.
3. The verdict is the last line: `Verdict: APPROVE` (exit 0) or
   `Verdict: CHANGES NEEDED` (exit 1). No verdict means the review is not
   complete (exit 2).
4. Commit `review.md`. On CHANGES NEEDED, the implementer fixes the critical
   and major findings, and the human runs the review again.
5. **Round limit.** After 3 reviews in a row say CHANGES NEEDED, `review.sh`
   stops: a human decides (fix it, change the spec, or allow one more round
   with `--another-round`). Endless ping-pong helps nobody.

### Enforcement: ignored, faked or missing reviews

- **Missing or ignored:** `review-gate.sh` runs in CI as part of the required
  check. A branch that changes code for a `specs/<feature>/` folder fails
  unless that feature's `review.md` approves, names a reviewed commit from
  the branch, and no code changed after it. Branches without a spec folder
  are not gated (on the trust ladder, a human reads every line of those).
- **Faked:** the agent hook blocks Edit and Write on `review.md`, and shell
  commands that write to it (`>`, `tee`, `cp`, `mv`, `rm`, `sed -i`).
  `review.sh` is not an agent tool, so it can still write the file.
- **Known gaps:** a human can still edit `review.md` or turn off branch
  protection; the owner holds the last key. A path in quotes (`> "review.md"`)
  gets past the shell rule; the gate still checks that the reviewed commit
  is real and current.

### What the first review found (sandbox)

With a known answer (half the feature was missing), the reviewer said
CHANGES NEEDED and named the missing requirement. It also found a Red step
merged into a Green commit, a claim it couldn't verify, and tooling in the
feature diff. It admitted it skimmed the plan; listing "Not checked" made
the shortcut visible.

## How much process? Match the weight to the risk

The full loop is expensive: in M10 it cost about 65 times the output tokens
of plain Claude fixing one bug. What it buys is proof. Use as much as the
risk needs:

| Change | Rung | Loop |
| --- | --- | --- |
| Docs, comments, a typo | 2 | Branch, PR, checks. The human reads it |
| A small fix in a tested area | 2 | A failing test first, the fix, the reviewer (`review.sh` with a short spec folder, or a human review). No Spec Kit |
| A feature, or anything in a risky area (money, kids' data, access, time) | 2–3 | The full loop: spec, plan, tasks, analyze, implementer, reviewer, gate, human checks |
| Database migrations, settings, deploys | always human | Agents may draft; a human runs them |

## Running roles headless

When a human asks an agent to run a role without a person at the keyboard
(`claude -p`), nobody can answer a permission prompt. A missing permission
makes the agent stop (good) or look for another way (bad). So give each role
the permissions its job needs, up front: **smallest world, but complete.**

| Role | Permissions |
| --- | --- |
| Paper runs (specify, plan, tasks, fixes on paper) | `--permission-mode acceptEdits`; `Bash(.specify/scripts/bash/*)`, read-only git, `git add`, `git commit`, the formatter |
| Implementer | `--agent implementer --permission-mode acceptEdits`; the project's test and check commands, the type checker, linter and formatter, read-only git, `git add`, `git commit`. No installs, no push |
| Reviewer | Started by `review.sh`, which removes Bash, Edit and Write |
| Analyze | `Bash(.specify/scripts/bash/*)` and read-only git. No edits |

- **Create the branch before the run.** The implementer can't commit on
  `main`, and branch commands are not in its permissions.
- **Pass the prompt on stdin**, never as an argument after
  `--allowedTools`: that flag takes a list and swallows the prompt.
- **One command per call** (in `implementer.md`): a chained command needs
  approval as a whole, and then nothing runs.
- **Prepare each Red-proof checkout** with `scripts/review-setup.sh` if the
  checks need files git doesn't hold (for example, link `node_modules`):
  a proof must run where the real thing runs.
- **The order of the human checks doesn't matter** for the gate: it counts
  ticks, and the reviewer lists human tasks under "Waiting for the human".
  Code changes after the review need a new review; ticks and docs don't.
