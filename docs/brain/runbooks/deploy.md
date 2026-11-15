# Runbook: deploy

**When:** a change is merged and should go live.
**Needs:** access to the GitHub repo. Vercel and Supabase settings are already done.

## Steps

1. Merge the pull request into `main`. Vercel builds and deploys by itself.
   Check: the Vercel check on the commit turns green.
2. Open <https://home-brain-gym.vercel.app> and play one game.
   Check: the game saves, and the parent area shows it.

## If it goes wrong

In Vercel, open **Deployments**, pick the last good one and choose
**Promote to Production**. Then fix the problem on a branch.

> Unverified: the rollback steps above have never been tried on this project.

## First-time setup (already done)

1. Import the GitHub repo in Vercel. It detects Vite by itself.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add
   `SUPABASE_ACCESS_TOKEN`: it is for the developer's Mac only.
3. Add the live address in Supabase (**Authentication → URL Configuration**)
   and Google Cloud (**Authorised JavaScript origins**).
