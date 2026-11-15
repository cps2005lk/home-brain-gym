# Known issues

| Issue                                                                                                                              | Risk                                                                                                                                              | Status                                                                        | Since      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| Game times come from the device's clock                                                                                            | A wrong or changed clock moves games to another day and resets the limit                                                                          | Accepted risk for a family app                                                | 2026-11-14 |
| The daily limit is checked only in the browser                                                                                     | A determined kid could get around it; the database doesn't enforce it                                                                             | Accepted risk                                                                 | 2026-11-14 |
| Migrations are run by hand, so nothing records which are applied                                                                   | Nobody can tell which migrations the live database has without a manual check. Last check: see [runbooks/migrate.md](runbooks/migrate.md)         | Open                                                                          | 2026-11-15 |
| No CI or server-side checks. Local git hooks (since 2026-11-16) run `scripts/check.sh` before a push, but `--no-verify` skips them | A broken change can still reach `main` and deploy                                                                                                 | Open: a private repo on the free GitHub plan has no branch protection         | 2026-11-14 |
| `removeParent` deletes by user id only, not by family                                                                              | If a person could join two families, removing them from one would remove them from both. Safe today: `accept_invite` allows one family per person | Accepted; fix before allowing more than one family                            | 2026-11-15 |
| Time in a stopped game is not counted toward the daily limit                                                                       | A kid could stop and restart to play longer                                                                                                       | Accepted risk, see [decisions/0004](decisions/0004-stop-discards-the-game.md) | 2026-11-16 |

> Unverified: whether the live Supabase project has any backups, and how to
> restore one. No restore has ever been tried.

## Fixed

- **2026-11-15:** "now" was read only when data loaded, so after midnight the
  daily limit still used yesterday. Now refreshed every minute and when the tab
  becomes visible. Test: `src/App.midnight.test.tsx`.
