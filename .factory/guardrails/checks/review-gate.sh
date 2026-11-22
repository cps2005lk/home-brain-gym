#!/usr/bin/env bash
# Fails when a branch changes code for a feature (a specs/<feature>/ folder)
# without a current, approved review.
#
# Why: a review that is ignored or never run protects nothing. Run in CI as
# part of the required check, this turns the review from a request into a
# lock. It runs in CI only, not in the pre-push hook: pushing a half-done
# branch is fine, merging it without a review is not.
#
# The rule, for every specs/<feature>/ folder the branch touches, when the
# branch also changes code:
#   - specs/<feature>/review.md exists and its last line is "Verdict: APPROVE";
#   - its "Reviewed-commit:" is in this branch's history;
#   - no code changed after that commit (only specs/, docs/, *.md, .factory/).
#   - every task in specs/<feature>/tasks.md is ticked ("- [x]"): an approved
#     review of an unfinished feature is not enough. Counting is a fact, not
#     a judgement, so the gate does it, not the reviewer.
# Branches that touch no specs/ folder are not gated (small fixes and docs:
# on the trust ladder a human reads every line of those).
#
# Usage: review-gate.sh [--base <ref>]   (default: origin/main, else main)
# Exit:  0 = no review needed, or every review is current and approved
#        1 = a review is missing, not approved, or out of date
#        2 = could not check (no base, shallow clone, not a repo)

set -uo pipefail

stop() { echo "review-gate: $1" >&2; exit 2; }
base=""
[[ "${1:-}" == "--base" ]] && base="${2:-}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || stop "not in a git repo, so nothing was checked."
[[ "$(git rev-parse --is-shallow-repository)" == false ]] \
  || stop "shallow clone, so the history can't be checked. In CI, check out with fetch-depth: 0."
if [[ -z "$base" ]]; then
  if git rev-parse -q --verify origin/main >/dev/null; then base=origin/main; else base=main; fi
fi
git rev-parse -q --verify "$base^{commit}" >/dev/null || stop "base '$base' not found, so nothing was checked."

# Code = anything that is not a spec, a doc, Markdown, or the installed kit.
# Files under .claude/ (agent roles, settings) count as code even when they
# are Markdown: weakening the reviewer's instructions needs a new review.
code_only() { awk '!/^(specs|docs|\.factory)\// && !(/\.md$/ && !/^\.claude\//)'; }

changed="$(git diff --name-only "$base"...HEAD)"
features="$(sed -n 's|^specs/\([^/]*\)/.*|\1|p' <<<"$changed" | sort -u)"
code="$(code_only <<<"$changed")"

if [[ -z "$features" || -z "$code" ]]; then
  exit 0
fi

failed=0
fail() { echo "review-gate: specs/$1: $2" >&2; failed=1; }
for f in $features; do
  r="specs/$f/review.md"
  open="$(grep -oE '^[[:space:]]*- \[ \] T[0-9]+' "specs/$f/tasks.md" 2>/dev/null | grep -oE 'T[0-9]+' | tr '\n' ' ')"
  [[ -z "$open" ]] || fail "$f" "tasks not done: $open(tick them, or remove them from tasks.md with a reason)."
  if [[ ! -f "$r" ]]; then
    fail "$f" "no review.md. Run .factory/adapters/claude/review.sh specs/$f, then commit the review."
    continue
  fi
  verdict="$(grep -v '^[[:space:]]*$' "$r" | tail -1 | sed 's/[[:space:]]*$//')"
  if [[ "$verdict" != "Verdict: APPROVE" ]]; then
    fail "$f" "the review does not approve (last line: '${verdict:-<empty>}')."
    continue
  fi
  reviewed="$(sed -n 's/^Reviewed-commit: *\([0-9a-f]\{40\}\).*/\1/p' "$r" | head -1)"
  if [[ -z "$reviewed" ]] || ! git merge-base --is-ancestor "$reviewed" HEAD 2>/dev/null; then
    fail "$f" "the review names no reviewed commit from this branch, so it can't be trusted. Run review.sh again."
    continue
  fi
  after="$(git diff --name-only "$reviewed" HEAD | code_only)"
  if [[ -n "$after" ]]; then
    fail "$f" "code changed after the review ($(head -3 <<<"$after" | tr '\n' ' ')). Run review.sh again."
  fi
done
exit $failed
