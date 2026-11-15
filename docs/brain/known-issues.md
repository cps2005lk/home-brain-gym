# Known issues

| Issue                                                            | Risk                                                                                                                                      | Status                                    | Since      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------- |
| Game times come from the device's clock                          | A wrong or changed clock moves games to another day and resets the limit                                                                  | Accepted risk for a family app            | 2026-11-14 |
| The daily limit is checked only in the browser                   | A determined kid could get around it; the database doesn't enforce it                                                                     | Accepted risk                             | 2026-11-14 |
| Migrations are run by hand, so nothing records which are applied | Nobody can tell which migrations the live database has without a manual check. Last check: see [runbooks/migrate.md](runbooks/migrate.md) | Open                                      | 2026-11-15 |
| No CI. Checks only run when someone runs them                    | A broken change can reach `main` and deploy                                                                                               | Open; planned with the factory guardrails | 2026-11-14 |

> Unverified: whether the live Supabase project has any backups, and how to
> restore one. No restore has ever been tried.

## Fixed

- **2026-11-15:** "now" was read only when data loaded, so after midnight the
  daily limit still used yesterday. Now refreshed every minute and when the tab
  becomes visible. Test: `src/App.midnight.test.tsx`.
