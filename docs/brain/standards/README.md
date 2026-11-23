# Standards and guidelines

How code is written in this project. Agents follow these files every time
they write or review code. People change them; agents only propose changes.

| File                     | Holds                                              |
| ------------------------ | -------------------------------------------------- |
| [coding.md](coding.md)   | Naming, structure, errors, logging, language rules |
| [testing.md](testing.md) | How tests are written, named and run               |

Add a file per topic when one grows (for example `api.md` or `database.md`)
and add it to this table.

## Two kinds of rule

- **Standard (must):** breaking it is a defect. The reviewer reports it as
  major.
- **Guideline (should):** the normal way. Breaking it needs a reason in the
  commit message. The reviewer reports it as minor.

## How a rule is written

```markdown
### STD-012 (must): Rethrow with `throw;`, never `throw ex;`

Why: `throw ex;` loses the original stack trace.
Checked by: review
```

- **ID:** `STD-` and a number, unique across all files here. Take the next
  free number. Never reuse a number, even after the rule is removed.
- **Level:** `must` (standard) or `should` (guideline).
- **Why:** one or two lines. A rule without a reason gets broken or argued
  about.
- **Checked by:** `review` (the reviewer reads for it), or the tool that
  checks it in `check.sh` (for example a linter, an analyzer or
  `.editorconfig`). A rule a tool can check should move to the tool over
  time: a check refuses, a rule only asks.
- **Example:** optional, only when the rule is unclear without one.

## Changing a rule

- **A person changes rules, through a pull request.** An agent may propose a
  change, but it never changes a rule to make its own code pass. It stops
  and asks.
- **Small change** (clearer wording, an example, a fix): edit the rule in
  place.
- **Removed rule:** keep the heading with `(removed YYYY-MM-DD)` and one line
  saying why, so the ID is never reused and old review findings still make
  sense.
- **A rule that changes an architecture decision** needs an ADR first
  ([decisions/](../decisions/README.md)). The rule then links to it.
- Code that breaks a new rule is fixed when someone touches it, unless the
  change says "fix everywhere".
