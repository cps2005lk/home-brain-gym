---
name: review-pr
description: Runs the factory's read-only reviewer on one pull request, by its number, and reports the verdict. Started only by a human typing /review-pr <PR number>.
argument-hint: <PR number> [--model opus]
disable-model-invocation: true
allowed-tools: Bash(.factory/adapters/claude/review-pr.sh *)
---

# Review a pull request

The human asked for a review of a pull request: `$ARGUMENTS`.

You don't review it yourself. A separate, read-only reviewer does, started
by the factory's script with a fixed prompt. Your job is to start it, then
report what it said.

1. If no PR number was given, ask for one and stop.
2. Run exactly this one command, and nothing else:

   ```sh
   .factory/adapters/claude/review-pr.sh $ARGUMENTS
   ```

   Pass `--model opus` only if the human typed it. Never use
   `--another-round`: after 3 rounds of CHANGES NEEDED, the human decides.
3. Read the exit code:
   - **0 (APPROVE) or 1 (CHANGES NEEDED):** read `specs/<feature>/review.md`
     (the script names the file) and report, in short lines: the verdict;
     each finding with its severity, where, and the rule ID if it has one
     (for example STD-012 or ADR 0004); what the reviewer could not check;
     and anything under "Waiting for the human".
   - **2 (refused or could not review):** show the reason from the script and
     what the human can do about it. Don't look for another way.
4. End with the next step for the human: read `review.md` and commit it;
   on CHANGES NEEDED, the implementer fixes the critical and major findings
   and the human runs `/review-pr` again.

Never edit `review.md`, never fix a finding yourself, never commit, push or
merge. A blocked command is a stop sign: say what was blocked and why.
