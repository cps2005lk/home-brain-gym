# Home Brain Gym

Short "brain agility" games for kids. Each kid plays to beat their **own** best
score — never a sibling's. Seven games, two levels (Junior and Teen), a parent
area with progress charts, streaks, badges and a daily time limit.

**Live: <https://home-brain-gym.vercel.app>**

Built end to end in TypeScript, mobile first. It is also a learning project:
the commit history walks through the whole build, one small milestone at a time.

|          |                                                 |
| -------- | ----------------------------------------------- |
| Frontend | React 19 + Vite + TypeScript (strict)           |
| Tests    | Vitest — 186 tests, no browser needed           |
| Backend  | Supabase (Postgres + Auth + Row Level Security) |
| Hosting  | Vercel                                          |
| Cost     | $0 — everything stays inside free plans         |

## Run it

```bash
npm install     # install packages (like "dotnet restore")
npm run dev     # http://localhost:5173
```

It works with no backend at all: without `.env.local` everything is saved on
the device only. To connect your own Supabase project, see
[docs/supabase-setup.md](./docs/supabase-setup.md).

```bash
cp .env.example .env.local   # then paste your project URL and publishable key
```

## Check it

```bash
npm test          # all tests once
npm run test:watch  # re-run while you edit
npm run typecheck   # TypeScript only, no build output
npm run lint        # oxlint
npm run format      # Prettier
npm run build       # typecheck + production build into dist/
npm run preview     # serve the built files locally
```

**Always run `npm run typecheck` as well as `npm test`.** Vitest strips types
away before running, so a type error can hide behind green tests. `npm run
build` does both.

## How it is put together

```
src/
  core/      the game contract: GameModule, levels, random numbers, ids
  games/     one folder per game: logic.ts (+ tests) and view.tsx
    index.ts   the logic registry   - plain TypeScript, no React
    views.tsx  the screen registry  - maps a game id to its React view
  play/      the shared play screen: runner hook, shell, countdown, result
  screens/   picker, home, parent area, settings, charts
  data/      types, repositories, sync, progress maths, streaks, time limit
  styles/    one global stylesheet with the design tokens
supabase/migrations/   SQL, run by hand in the Supabase SQL editor
docs/        setup guides, decisions, the game catalogue
```

Three ideas hold the whole thing together:

**1. Game rules are plain TypeScript, with no React.** Every game is a pure
state machine: `create`, `reduce(state, event)`, `isOver`, `progress`. Time and
random numbers arrive as _arguments_, never read from the clock or
`Math.random()` inside the rules. That is why 186 tests run in under a second
with no browser.

**2. One repository interface, three implementations.** Screens only ever see
`GymRepository`:

```
deviceRepository   localStorage
supabaseRepository Postgres, behind Row Level Security
syncRepository     writes to the device first, sends to the server after
```

Swapping localStorage for Postgres changed **no screen code**.

**3. Local first.** A finished game is saved on the device immediately. If the
server cannot be reached, the write waits in a queue and goes up when the
connection returns. Reading falls back to the device copy. A kid never loses a
score to a dropped WiFi.

## Adding a new game

1. Make `src/games/<your-game>/logic.ts` exporting a `defineGame({...})`.
2. Write `logic.test.ts` next to it.
3. Make `view.tsx` — it draws the state and sends taps back.
4. Add one line to `src/games/index.ts` and one to `src/games/views.tsx`.

That is all. The home screen, charts, streaks, badges and the daily limit pick
the new game up by themselves. See [docs/games.md](./docs/games.md) for the
games that exist and the ideas not built yet.

## The database

```
families ──< family_members >── auth.users
    │
    └──< kids ──< sessions
```

Every table has **Row Level Security** on, so a request can only ever touch
rows belonging to the signed-in parent's family. Other families can be added
later with no change to the app. Migrations live in `supabase/migrations/` and
are run by hand in the Supabase SQL editor, oldest first.

Regenerate the TypeScript types after any schema change:

```bash
npm run types:gen     # needs SUPABASE_ACCESS_TOKEN in .env.local
```

## Deploy

1. [vercel.com](https://vercel.com) → sign up with GitHub → **Add New → Project**
   → import this repository. Vercel detects Vite by itself.
2. Add two environment variables (the same two as `.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   Never add `SUPABASE_ACCESS_TOKEN` — that one is for your machine only.

3. Deploy. Every push to `main` deploys again by itself.
4. Add the live address in two places:
   - Supabase → **Authentication → URL Configuration** → Site URL and Redirect URLs
   - Google Cloud → **Clients** → Authorised JavaScript origins

## Privacy

Kids have no login, no email and no password — they are rows under the parent's
family. The app stores a nickname, a picture, a level and game scores. No
birthdates, no photos, no tracking, no third-party analytics.

## Secrets

| Value                | Where it belongs                                      |
| -------------------- | ----------------------------------------------------- |
| `sb_publishable_…`   | the browser — safe, protected by Row Level Security   |
| `sb_secret_…`        | servers only. Never in this app                       |
| `sbp_…` (CLI token)  | `.env.local` on your machine, for `npm run types:gen` |
| Google client secret | Supabase dashboard only                               |

`.env.local` is git-ignored. Nothing secret is ever committed.

## Notes for whoever picks this up next

[CLAUDE.md](./CLAUDE.md) holds the project context: decisions already made, the
game rules, the milestone list and the mistakes already paid for — RLS policies
needing `EXECUTE` on the functions they call, "check then create" races across a
network, and why ids written to Postgres must be real uuids.
