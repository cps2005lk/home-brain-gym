# Two parents in one family

Agreed 5 November 2026. Lets a second parent (or more) share the same family,
see the same kids and the same scores, on their own device and their own Google
account.

## How it already works

`family_members` was built as a join table from day one:

```sql
family_members (family_id, user_id, role, created_at, primary key (family_id, user_id))
```

It is already many-to-many. Every policy on `families`, `kids` and `sessions`
asks one question:

```sql
is_family_member(family_id)   -- "does auth.uid() have a row for this family?"
```

**So the moment a second person has a row in `family_members`, they see the
family — with no change to any screen.** What is missing is a safe way to
create that row: `family_members` has no insert policy on purpose, so nobody
can add themselves to someone else's family.

## Roles: equal parents

Chosen option: **every parent is equal**. Both can add and rename kids, set
levels and daily limits, see and delete scores, invite another parent, and
remove a parent — including each other.

The `role` column stays, fixed to `'parent'` by a check constraint, so a later
version can add something like `'viewer'` (a grandparent who may look but not
change) without another redesign.

**One rule that is not about roles:** a family must always keep at least one
parent. A database trigger refuses the delete that would empty it. Without
that, a family's kids and scores would be locked away forever - no one could
read them, and no one could be invited back in.

## The invite flow

```
family_invites
  id          uuid primary key
  family_id   uuid -> families
  code        text unique      e.g. "K7P4-2RMX"
  email       text null        if set, only that signed-in email may use it
  role        text             'parent'
  invited_by  uuid -> auth.users
  created_at  timestamptz
  expires_at  timestamptz      7 days by default
  accepted_at timestamptz null
  accepted_by uuid null
  revoked_at  timestamptz null
```

1. A parent taps **Invite a parent** → `create_invite(email)` returns a short code.
2. They send the code however they like (WhatsApp, or just read it out).
3. The other person signs in with Google, taps **Join a family**, types the code.
4. `accept_invite(code)` checks everything and adds the membership row.

Checks inside `accept_invite`:

| Check                                             | Why                                            |
| ------------------------------------------------- | ---------------------------------------------- |
| Signed in                                         | `auth.uid()` must exist                        |
| Invite exists, not revoked, not already used      | single use                                     |
| `expires_at` in the future                        | 7 days                                         |
| If `email` is set, it matches the signed-in email | a code seen over someone's shoulder is useless |
| The user is not already in a family               | v1 assumes one family per person               |

Why a **code** and not an email link: Supabase's built-in mailer on the free
plan sends 2 emails per hour, only to people in the Supabase organisation. A
code costs nothing and always arrives.

Both `create_invite` and `accept_invite` are `security definer` functions, for
the same reason `create_family` is: the person accepting is **not yet** a
member, so no policy could ever allow them to write that row themselves. In C#
this is the service method that runs with elevated rights and does the checking
itself.

## Security rules

| Table              | Who may read                            | Who may write                                                                                  |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `families`         | members                                 | members (rename)                                                                               |
| `kids`, `sessions` | members                                 | members                                                                                        |
| `family_members`   | members (so parents can see each other) | no direct insert or update; delete = remove a parent or leave, blocked when it is the last one |
| `family_invites`   | members                                 | no direct writes; `create_invite` / `accept_invite` / `revoke_invite` only                     |

`kids` and `sessions` policies do not change at all. They already say "members
of this family", which now means both parents.

`family_members.email` is added so the app can show _who_ is in the family
without reading `auth.users`, which the API never exposes.

## Testing the rules

The rules live in Postgres, so Vitest cannot test them. We use **pgTAP**, run
in the Supabase SQL editor, inside a transaction that is rolled back at the end
so nothing is left behind.

What the script proves:

- a parent sees their own family's kids and scores
- a parent of **another** family sees none of them
- a second parent added to a family sees everything in it
- a visitor who is not signed in sees nothing
- an expired, revoked, already-used or wrong-email invite is refused
- the last parent cannot be removed

## Migration safety

Nothing in `kids` or `sessions` is touched. The migration only adds a table,
some functions, policies, a trigger, a column (`family_members.email`) and a
check constraint, and it is written to be safe to run twice.

No backup was taken before running it (5 Nov 2026): at that point the database
held only test scores, so there was nothing to lose.

**Once the kids really start playing, that changes.** Before any later
migration: export `kids` and `sessions` to CSV from the Table Editor, note
`select count(*)` for both, and check the counts again afterwards. The free
plan has no point-in-time restore, so a CSV is the whole safety net.
