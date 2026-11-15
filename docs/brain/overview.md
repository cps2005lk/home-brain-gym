# Overview

## Goal

Short "brain agility" games for two kids, played on a phone or tablet. It is
also a learning project: the owner built it to learn TypeScript, so clear code
and small steps matter more than speed.

Live: <https://home-brain-gym.vercel.app>

## Users

- **Kids:** pick themselves on a "Who is playing?" screen. No login.
- **Parents:** sign in with Google. Set levels and daily limits, see progress,
  delete wrong scores, invite a second parent.
- **Guests:** friends and cousins can play; nothing is saved.

## In scope

- Seven games, each with a Junior and a Teen level. See [games.md](games.md).
- Parent area: progress charts per kid and game, settings.
- Streaks and badges, about the kid's own play only.
- A daily time limit per kid.
- Works offline: saved on the device first, synced later.
- Two or more equal parents per family.

## Out of scope

- Comparing kids with each other. Each kid only competes with their own best.
- Any data about kids beyond nickname, avatar, level and scores.
- Installing as an app (PWA): not in v1, see [decisions/0002](decisions/0002-v1-decisions.md).
- Languages other than English in v1.
