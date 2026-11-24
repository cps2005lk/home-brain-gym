#!/usr/bin/env bash
# Tests for the kit's skills: the promises in each SKILL.md that keep a human
# in charge. A skill that loses one of them still "works", so only a test
# notices.
set -uo pipefail

dir="$(cd "$(dirname "$0")" && pwd)/skills"
fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; fails=$((fails + 1)); }

f="$dir/review-pr/SKILL.md"
if [[ ! -f "$f" ]]; then
  fail "review-pr: skills/review-pr/SKILL.md exists"
else
  front="$(awk 'NR==1 && /^---$/ {on=1; next} on && /^---$/ {exit} on' "$f")"
  body="$(awk 'NR==1 && /^---$/ {on=1; next} on && /^---$/ {on=0; done=1; next} done' "$f")"
  grep -qx 'name: review-pr' <<<"$front" && pass "review-pr: the command is /review-pr (not the built-in /review)" || fail "review-pr: name is review-pr"
  grep -qx 'disable-model-invocation: true' <<<"$front" && pass "review-pr: only a human starts it" || fail "review-pr: disable-model-invocation: true"
  grep -qx 'allowed-tools: Bash(.factory/adapters/claude/review-pr.sh \*)' <<<"$front" && pass "review-pr: may run only review-pr.sh without asking" || fail "review-pr: allowed-tools is review-pr.sh only"
  grep -q '\.factory/adapters/claude/review-pr\.sh \$ARGUMENTS' <<<"$body" && pass "review-pr: runs review-pr.sh with the human's arguments" || fail "review-pr: runs review-pr.sh \$ARGUMENTS"
  grep -q 'review\.sh specs' <<<"$body" && fail "review-pr: never runs review.sh itself" || pass "review-pr: never runs review.sh itself"
  tr '\n' ' ' <<<"$body" | grep -qiE 'never[^.]*--another-round' && pass "review-pr: says it never uses --another-round" || fail "review-pr: says it never uses --another-round"
fi

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
