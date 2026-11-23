# Decisions (ADRs)

One file per architecture decision: `NNNN-short-title.md`, made from
[0000-template.md](0000-template.md). An ADR records a choice between real
options that is hard to reverse, or a rule that must hold everywhere.

**Agents follow only ADRs with the status `accepted`.** A `proposed` ADR is
a draft; a `replaced` one is history.

## Statuses

| Status | Means |
| --- | --- |
| `proposed` | A draft. Nobody follows it yet |
| `accepted` | In force. Code and standards must agree with it |
| `replaced by NNNN` | No longer in force. Follow NNNN instead |

## Who writes and who decides

- An agent may draft an ADR, with the status `proposed`.
- A person decides: setting the status to `accepted` (or `replaced`) is a
  pull request that a person merges.

## Changing a decision: by size

- **Small change** (clearer wording, a detail, a new consequence found
  later): edit the ADR in place, and add a line under **Changes** at the
  bottom: the date and what changed.
- **Real change** (we now decide something different): write a new ADR. In
  the old one, set the status to `replaced by NNNN` and add this line at the
  top: `> Replaced by NNNN. Do not follow this decision.` The old file stays
  as history.
- Not sure which? If code that followed the old text would now be wrong, it
  is a real change.

## Numbers

Take the next free number when you create the file. Never reuse a number.
