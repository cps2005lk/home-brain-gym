#!/usr/bin/env bash
# Reviews a pull request by its number: finds the PR's spec folder and base
# branch, checks that this checkout is that PR, then runs review.sh. The
# /review command calls it; a human can too.
#
# Usage: review-pr.sh [--model <model>] <PR number>   (2, #2, PR#2 or "PR 2")
# Exit:  review.sh's exit code (0 = APPROVE, 1 = CHANGES NEEDED, 2 = could not review),
#        or 2 when this script refuses (nothing reviewed).
#
# It never switches branches and never passes --another-round: after 3 rounds
# of CHANGES NEEDED, a human decides and runs review.sh directly.
# Needs: gh (logged in), git.

set -uo pipefail

stop() { echo "review-pr: $1" >&2; exit 2; }

model=()
pr=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) [[ -n "${2:-}" ]] || stop "--model needs a model name."; model=(--model "$2"); shift 2 ;;
    --another-round) stop "--another-round is not for this command: after 3 rounds a human decides, and runs review.sh directly." ;;
    -*) stop "unknown option: $1" ;;
    *) pr="$pr$1"; shift ;;
  esac
done

# 2, #2, PR#2, pr#2 and "PR 2" all mean 2.
n="$(printf '%s' "$pr" | sed -E 's/^[Pp][Rr]//; s/^#//')"
[[ "$n" =~ ^[0-9]+$ ]] || stop "give a PR number, for example: review-pr.sh 2"

field() { gh pr view "$n" --json "$1" -q "$2" 2>/dev/null; }
state="$(field state .state)" || stop "could not read PR #$n with gh (does it exist? is gh logged in?)."
[[ "$state" == OPEN ]] || stop "PR #$n is $state, not open: there is nothing to review."
head="$(field headRefName .headRefName)" || stop "could not read PR #$n's branch."
oid="$(field headRefOid .headRefOid)" || stop "could not read PR #$n's last commit."
base="$(field baseRefName .baseRefName)" || stop "could not read PR #$n's base branch."
files="$(field files '.files[].path')" || stop "could not read PR #$n's files."

current="$(git branch --show-current)"
[[ "$current" == "$head" ]] || stop "this checkout is on '${current:-a detached HEAD}', but PR #$n is branch '$head'. Switch first: git switch $head"
[[ "$(git rev-parse HEAD)" == "$oid" ]] || stop "branch '$head' here is not the same as PR #$n on GitHub (last commit ${oid:0:7}). Push or pull first, so the review covers what the PR holds."

folders="$(grep -oE '^specs/[^/]+' <<<"$files" | sort -u)"
count="$(grep -c . <<<"$folders")"
[[ "$count" -ge 1 ]] || stop "PR #$n changes no specs/<feature>/ folder, so review.sh has no spec to review against. For a change without a spec, a human reviews the PR."
[[ "$count" -eq 1 ]] || stop "PR #$n changes more than one spec folder: $(tr '\n' ' ' <<<"$folders")Run review.sh on the one you mean."

exec "$(cd "$(dirname "$0")" && pwd)/review.sh" --base "$base" ${model[@]+"${model[@]}"} "$folders"
