# Project: Home Brain Gym — kids' brain-games web app

## Who I am

- I'm a C# / .NET developer from Sri Lanka. English is not my first language, so please use simple, clear English.
- I know some JavaScript. TypeScript, React (or any modern frontend framework) and npm tooling are new to me.
- **The main goal of this project is to learn TypeScript** by building a real full-stack web app. Building the app is the second goal.
- My setup: **Mac + VS Code**.

## How I want you to work with me

1. **Teach as you build.** Work in small steps. In each step:
   - Explain the TypeScript or web concepts you use in a few short sentences.
   - Compare them with C# / .NET when it helps (for example, `interface` vs C# interface, union types vs enums, `async/await`, generics, npm vs NuGet, `tsconfig.json` vs `.csproj`).
   - Stop after each step and let me review before you continue.
2. **Ask before deciding.** Do not assume anything important. When there is a real choice (framework, library, data model, rules), give me 2–3 options with simple pros and cons, recommend one, and **wait for my answer**.
3. Keep explanations short. Use bullet points.
4. After each finished step, **commit to Git** with a clear message.

## The app

A web app with short "brain agility" games for my two kids. Each kid tries to beat their own best score. There is no competition between siblings.

- **Kid 1:** Uses the **Junior** level.
- **Kid 2:** Uses the **Teen** level.
- Kids mainly play on a **phone or tablet**, so the app must be touch-first and mobile-first. Please consider making it an installable PWA, and ask me first.

### I already have a prototype

I have a working single-file HTML/JS prototype called `brain-gym.html`, which I will put in the project folder. **Read it first.** Use it as the reference for game rules, levels and look and feel. Do not copy its code structure. Rebuild it properly in TypeScript.

The 4 games in the prototype are:

| Game                                             | Skill                | Junior                            | Teen                        |
| ------------------------------------------------ | -------------------- | --------------------------------- | --------------------------- |
| Color Clash (Stroop)                             | Focus / self-control | 45s, 3 colours                    | 30s, 4 colours              |
| Pattern Memory                                   | Working memory       | 3×3 grid, any order               | 4×4 grid, same order        |
| Rule Switch (odd/even vs. smaller/bigger than 5) | Flexible thinking    | 45s, rule text shown              | 30s, no rule text           |
| Arrow Rush (flanker)                             | Attention            | 45s, 3 arrows, middle highlighted | 30s, 5 arrows, no highlight |

## Version 1 features

1. **The 4 games above**, with Junior and Teen levels.
2. **Plug-in game structure.** Adding a new game should mean adding one new module that follows a shared TypeScript interface (name, skill, levels, scoring). No changes in other places.
3. **More games.** Suggest 4–6 new age-appropriate brain games (for ages 7 and 13). For each one, give me the name, the skill it trains and a one-line description. **I will choose which ones to build.**
4. **Progress charts.** A parent view that shows each kid's scores over days and weeks, per game.
5. **Daily streaks and rewards.** For example streaks and badges. Propose the rules and let me approve them.
6. **Daily time limit per kid**, which the parent sets in settings. The app stops games when the limit is reached.

## Users and login

- **Start with only my family, but design for many families later.**
- **Parent login** (one account for now). Kids are **profiles** under the parent's family. They have **no passwords and no email addresses**.
- From day one, store all data under a **family** (tenant) so that other families can be added later without rewriting the data model. Use security rules or row-level security so a family can only read its own data.
- Kids' data is sensitive. Store only what is needed (first name or nickname, level, scores). No real birthdates, photos or tracking.

## Tech and hosting

- **Full TypeScript:** frontend and any backend or server code. Use strict mode.
- **Free tiers only ($0/month)** for hosting, database and login.
- **Backend: compare first, do not pick yet.** Compare **Firebase** (Auth + Firestore + Hosting) and **Supabase** (Postgres + Auth). Hosting can be Vercel, Netlify or similar. Explain:
  - free-tier limits for my use (2 kids, maybe more families later)
  - which one teaches me more useful TypeScript skills
  - how each handles multi-family data separation
  - how close each is to what I know from SQL Server / .NET
    Then recommend one and **wait for my choice**.
- **Frontend framework:** recommend one (with reasons) and wait for my approval.

## Quality

- **GitHub repository.** Help me set it up, and commit after each step.
- **Unit tests** for game logic and scoring (rules, levels, streaks and time limits). Keep the game logic separate from the UI so it is easy to test.
- Add a simple **README** with how to run, test and deploy.

## How to start

Please do **not** write code yet. First:

1. Read `brain-gym.html`.
2. Ask me any questions you still have.
3. Give me the backend comparison and your frontend recommendation.
4. Propose a short step-by-step **learning roadmap** (milestones, each one small and finished with a commit), and wait for my "go".
