# Home Brain Gym

Short "brain agility" games for kids. Each kid plays to beat their **own** best score — never a sibling's.
The app is built with TypeScript end to end, and it is also a learning project for TypeScript.

Games (from the prototype): **Color Clash** (focus), **Pattern Memory** (working memory),
**Rule Switch** (flexible thinking), **Arrow Rush** (attention) — each with a Junior and a Teen level.

## Requirements

- Node 20 or newer (this project was set up with Node 26)
- npm 10 or newer

## Run it

```bash
npm install     # install packages (like "dotnet restore")
npm run dev     # start the dev server, usually http://localhost:5173
```

The dev server reloads the page as soon as you save a file.

## Test it

```bash
npm test          # run all tests once
npm run test:watch  # re-run tests while you edit
```

## Check it

```bash
npm run typecheck   # TypeScript compiler only, no build output
npm run lint        # oxlint
npm run format      # Prettier formats every file
```

## Build and deploy

```bash
npm run build     # type-check, then build into dist/
npm run preview   # serve the built files locally
```

Deployment: Vercel, connected to this GitHub repo. Every push to `main` deploys automatically.
(Set up in Milestone 10.)

## Project layout

```
src/            application code
  *.test.ts     unit tests live next to the code they test
docs/           decisions and notes
brain-gym.html  the original single-file prototype (reference only, not used by the app)
CLAUDE.md       project context and agreed decisions
```

Game rules and scoring will live in plain TypeScript files with no React in them, so they can be
unit tested without a browser. React only draws the screen.

## Roadmap

See the milestone table in [CLAUDE.md](./CLAUDE.md). Decisions are recorded in
[docs/decisions.md](./docs/decisions.md).
