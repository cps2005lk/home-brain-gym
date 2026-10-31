# Home Brain Gym — project memory

Short brain-agility games for two kids, built mainly to **learn TypeScript**.
Full brief: `brain-gym-claude-code-prompt.md`. Original prototype: `brain-gym.html` (UTF-16; read it for game rules and look & feel — do not copy its code structure).

## Who I work with

- C# / .NET developer from Sri Lanka. English is not his first language — use **simple, clear English**.
- Knows some JavaScript. TypeScript, React and npm tooling are new.
- **Main goal: learn TypeScript.** Building the app is the second goal.
- Setup: Mac + VS Code. Node 26, npm 11, git, `gh` logged in as `cps2005lk`.

## How to work

1. **Teach while building.** Each step: explain the TypeScript/web concept in a few short sentences, and compare with C# / .NET when it helps (`interface`, union types vs `enum`, generics, `async/await`, npm vs NuGet, `tsconfig.json` vs `.csproj`).
2. **Stop after each small step** and wait for review. Do not run ahead.
3. **Ask before deciding.** For a real choice: 2–3 options, simple pros and cons, a recommendation, then **wait**.
4. Keep explanations short. Use bullet points.
5. **Commit to git after each finished step**, with a clear message.
6. Ask questions **one or two at a time, in plain text**. Avoid long multi-question popups.
7. Keep **game logic in plain TypeScript files with no React**, so it is easy to unit test. React only draws.

## Decisions already made (do not re-ask)

| Topic                 | Decision                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Backend               | **Supabase** (Postgres + Auth + RLS). Local-first: save on device, sync when online.                                 |
| Hosting               | Vercel (free), auto-deploy from GitHub                                                                               |
| Frontend              | React + Vite + TypeScript **strict**; Vitest for tests; Recharts for charts                                          |
| Parent login          | **Google sign-in**                                                                                                   |
| Kid select            | Kids pick themselves on a "Who is playing?" screen — **open picker, no lock**; "Switch kid" always easy to reach     |
| Kid tile shows        | Kid-chosen avatar + colour, streak / best, time left today                                                           |
| Guest mode            | Yes — a visitor can play, nothing is saved                                                                           |
| Wrong-kid score       | Parent view can delete a score ("not my score")                                                                      |
| Daily time limit      | Parent sets it. **Running game finishes and counts; no new game after the limit.** Resets midnight, **Asia/Colombo** |
| Level (Junior / Teen) | **Parent only**, in settings. Kids cannot change it                                                                  |
| Multi-tenant          | All data under a `family` from day one: `families` → `kids` → `sessions`, separated by **RLS** on `family_id`        |
| Kid data              | Only nickname, avatar, level, scores. No birthdates, photos or tracking                                              |
| Offline               | Yes — device first, sync later                                                                                       |
| Language              | English only in v1                                                                                                   |
| PWA                   | Yes, but built **last** (Milestone 10)                                                                               |
| Repo                  | `home-brain-gym`, **private**, GitHub user `cps2005lk`                                                               |
| Still open            | Streak/badge rules (M7) and which new games to add (M9) — propose, let him choose                                    |

## Game rules from the prototype (keep these)

- **Color Clash (Stroop)** — colour word painted in another colour (~75% mismatched). Tap the **ink** colour. Score = correct. Junior 45 s / 3 colours; Teen 30 s / 4 colours.
- **Pattern Memory** — _not timed_. 2 lives. Pattern starts at 3 (Junior) / 4 (Teen) and grows by 1 after each success. Score = **longest pattern completed**. Junior 3×3 any order; Teen 4×4 same order.
- **Rule Switch** — number 1–9, never 5. Blue card = odd/even; yellow card = smaller/bigger than 5. Score = **right − wrong, never below 0**. Junior 45 s with rule text; Teen 30 s without.
- **Arrow Rush (flanker)** — only the middle arrow counts. Score = correct. Junior 45 s, 3 arrows, middle highlighted, 60 % congruent; Teen 30 s, 5 arrows, no highlight, 40 % congruent.
- **Shell** — 3‑2‑1 countdown, score pill, clock pill + shrinking time bar, Stop button, green/red flash on the board, result screen comparing only with that kid's **own** best. Never compare the two kids.
- **Look & feel** — grid-paper background, Baloo 2 + Nunito fonts, rounded white cards, dark navy play board, light + dark theme, mobile-first and touch-first.

## Roadmap (commit at the end of each)

| #   | Milestone                                                                       | Status      |
| --- | ------------------------------------------------------------------------------- | ----------- |
| 0   | Repo + tooling: Vite + React + TS strict, Vitest, Prettier, README, GitHub repo | done        |
| 1   | Game contract: `GameModule` interface, level and score types (no UI)            | done        |
| 2   | The 4 games as pure logic + unit tests (no DOM)                                 | Color Clash done; 3 to go |
| 3   | Home + "Who is playing?" screens, prototype look, mobile-first                  |             |
| 4   | Games playable: countdown, timer, flash, result; saved on device only           |             |
| 5   | Supabase: schema + RLS, Google sign-in, typed data layer, sync                  |             |
| 6   | Parent view: progress charts per kid per game (days / weeks)                    |             |
| 7   | Streaks + badges (propose rules first) + tests                                  |             |
| 8   | Daily time limit + settings screen + tests                                      |             |
| 9   | New games he chooses — one module each (proves the plug-in design)              |             |
| 10  | PWA + deploy to Vercel + finish README                                          |             |
