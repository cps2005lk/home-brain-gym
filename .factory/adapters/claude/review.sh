#!/usr/bin/env bash
# Starts the reviewer: a separate, read-only Claude run that reviews a
# finished feature branch against its spec. The implementer doesn't write
# the reviewer's prompt; this script does, the same way every time.
#
# Usage: review.sh [--base <ref>] [--check "<command>"] [--another-round] <spec-folder>
#   --base           branch to compare with (default: main)
#   --check          the project's checks, run before the review (default: scripts/check.sh)
#   --another-round  a human allows a review after 3 rounds of CHANGES NEEDED
#   --model          the reviewer's model (default: the one in agents/reviewer.md);
#                    for comparing models on the same review (M11)
#
# Red proof: every "Red:" commit is checked out and the checks run there. If
# the project has scripts/review-setup.sh, it runs first in each checkout
# (REVIEW_ROOT = the main folder), for things git doesn't hold, like node_modules.
#
# Rounds: each review after a CHANGES NEEDED is the next round. After round 3
# still says CHANGES NEEDED, the script stops: a human decides, not another loop.
# Writes:  <spec-folder>/review.md (not committed: a human reads and commits it)
# Exit:    0 = Verdict: APPROVE
#          1 = Verdict: CHANGES NEEDED
#          2 = could not review (bad input, uncommitted changes, no verdict)
#
# The reviewer gets only Read, Grep and Glob (see agents/reviewer.md). This
# script also removes Bash, Edit and Write, so the role can't be widened.

set -uo pipefail

stop() { echo "review: $1" >&2; exit 2; }

base=main; check="scripts/check.sh"; spec=""; another=0; max_rounds=3
model=""
while (( $# )); do
  case "$1" in
    --base) base="${2:-}"; shift 2 ;;
    --check) check="${2:-}"; shift 2 ;;
    --another-round) another=1; shift ;;
    --model) model="${2:-}"; shift 2 ;;
    -*) stop "unknown option $1" ;;
    *) spec="${1%/}"; shift ;;
  esac
done

root="$(git rev-parse --show-toplevel 2>/dev/null)" || stop "not in a git repo."
cd "$root" || stop "can't open $root."
[[ -n "$spec" && -f "$spec/spec.md" ]] || stop "no spec.md in '${spec:-<none>}'. Usage: review.sh [--base main] <spec-folder>"
[[ -f .claude/agents/reviewer.md ]] || stop "no .claude/agents/reviewer.md. Copy it from .factory/adapters/claude/agents/."
command -v claude >/dev/null || stop "claude not found."
git rev-parse --verify -q "$base^{commit}" >/dev/null || stop "base '$base' not found."
[[ -z "$(git status --porcelain)" ]] || stop "uncommitted changes. Commit first: the reviewer only reviews committed work."

# Which round is this? A review after CHANGES NEEDED is the next round.
round=1
if [[ -f "$spec/review.md" ]]; then
  prev_round="$(sed -n 's/^Round: *\([0-9]*\).*/\1/p' "$spec/review.md" | head -1)"
  prev_verdict="$(grep -v '^[[:space:]]*$' "$spec/review.md" | tail -1 | sed 's/[[:space:]]*$//')"
  [[ "$prev_verdict" == "Verdict: CHANGES NEEDED" ]] && round=$(( ${prev_round:-1} + 1 ))
fi
if (( round > max_rounds && ! another )); then
  stop "$max_rounds reviews in a row said CHANGES NEEDED. A human decides now: read $spec/review.md, then fix it yourself, change the spec, or run again with --another-round."
fi

commits="$(git log --stat --format='%h %s' "$base"..HEAD)"
[[ -n "$commits" ]] || stop "no commits on this branch since '$base': nothing to review."

if [[ -n "$check" ]] && command -v "${check%% *}" >/dev/null 2>&1; then
  check_out="$(bash -c "$check" 2>&1)"; check_code=$?
  checks="Command: $check
Exit code: $check_code
Output (last 60 lines):
$(tail -60 <<<"$check_out")"
else
  checks="No checks ran: '${check:-<none>}' was not found. Treat this as a finding."
fi

# Red proof: check out every "Red:" commit and run the checks there. A Red
# step is proven only if the checks fail at that commit. The reviewer has no
# shell, so the script proves it and gives the result as a fact.
red="No commit message starts with \"Red:\", so no Red step can be proven."
if [[ -n "$check" ]] && command -v "${check%% *}" >/dev/null 2>&1; then
  wt="$(mktemp -d)"; rmdir "$wt"
  reds="$(git log --reverse --format='%h %s' "$base"..HEAD | grep -E '^[0-9a-f]+ Red:' || true)"
  if [[ -n "$reds" ]]; then
    red=""
    while read -r sha subject; do
      git worktree add -q --detach "$wt" "$sha" 2>/dev/null || { red="$red
- $sha $subject: could not check out."; continue; }
      # A proof must run where the real thing runs: the project may prepare each
      # checkout (for example link node_modules). The kit owns when, the project
      # owns what, like scripts/check.sh.
      if [[ -x "$root/scripts/review-setup.sh" ]] && ! (cd "$wt" && REVIEW_ROOT="$root" "$root/scripts/review-setup.sh" >/dev/null 2>&1); then
        git worktree remove --force "$wt"
        red="$red
- $sha $subject: could not prepare the checkout (scripts/review-setup.sh failed). NOT proven."
        continue
      fi
      out="$(cd "$wt" && bash -c "$check" 2>&1)"; code=$?
      git worktree remove --force "$wt"
      if (( code != 0 )); then
        red="$red
- $sha $subject: checks FAIL (exit $code), as a Red step should. Last lines:
$(tail -5 <<<"$out" | sed 's/^/    /')"
      else
        red="$red
- $sha $subject: checks PASS (exit 0). This Red step is NOT proven: its test did not fail."
      fi
    done <<<"$reds"
    red="Checks run at each Red commit ($check). Look at the last lines: a test must fail for the right reason, not because a tool is missing.$red"
  fi
fi

# Every feature file goes into the prompt in full, so none can be skipped.
# The old review.md is left out: the reviewer judges the code, not the last review.
feature_files=""
while IFS= read -r f; do
  feature_files="$feature_files
<file path=\"$f\">
$(cat "$f")
</file>"
done < <(find "$spec" -type f -name '*.md' ! -name review.md | LC_ALL=C sort)

# The project rules too: the standard the reviewer judges against.
rules=""
for f in AGENTS.md .specify/memory/constitution.md; do
  [[ -f "$f" ]] && rules="$rules
<file path=\"$f\">
$(cat "$f")
</file>"
done
[[ -n "$rules" ]] || rules="No AGENTS.md and no constitution in this project."

prompt="Review this feature branch. Follow your instructions in full.

Branch: $(git branch --show-current), at $(git rev-parse --short HEAD). Base: $base.

## Project rules, in full
$rules

## Feature files, in full
$feature_files

## Commits since $base
$commits

## Red steps, checked by the script
$red

## Checks, run just before this review
$checks

## Full diff ($base...HEAD)
$(git diff "$base"...HEAD)"

err="$(mktemp)"; trap 'rm -f "$err"' EXIT
model_args=(); [[ -n "$model" ]] && model_args=(--model "$model")
# Isolation: the reviewer's Read tool must not see secrets either.
box="$(cd "$(dirname "$0")" && pwd)/sandbox-agent.json"
[[ -f "$box" ]] || stop "no sandbox-agent.json next to review.sh, so the reviewer would run without isolation."
review="$(printf '%s\n' "$prompt" | claude -p --agent reviewer --settings "$box" ${model_args[@]+"${model_args[@]}"} --disallowedTools Bash Edit Write NotebookEdit 2>"$err")" \
  || stop "the reviewer run failed: $(tail -3 "$err")"

{
  echo "# Review: $spec"
  echo
  echo "Reviewer: \`.claude/agents/reviewer.md\` (read-only). Branch $(git branch --show-current), base $base, $(date -u +%Y-%m-%dT%H:%MZ)."
  echo
  echo "Reviewed-commit: $(git rev-parse HEAD)"
  echo "Round: $round"
  echo
  printf '%s\n' "$review"
} >"$spec/review.md"

verdict="$(grep -v '^[[:space:]]*$' <<<"$review" | tail -1 | sed 's/[[:space:]]*$//')"
case "$verdict" in
  "Verdict: APPROVE") echo "review: APPROVE. See $spec/review.md"; exit 0 ;;
  "Verdict: CHANGES NEEDED") echo "review: CHANGES NEEDED. See $spec/review.md"; exit 1 ;;
  *) stop "no verdict on the last line, so the review is not complete. See $spec/review.md" ;;
esac
