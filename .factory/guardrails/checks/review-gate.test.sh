#!/usr/bin/env bash
# Tests for review-gate.sh, in a real temporary repo.
set -uo pipefail

gate="$(cd "$(dirname "$0")" && pwd)/review-gate.sh"
fails=0
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cd "$tmp" && git init -q -b main && git config user.email t@example.com && git config user.name t
echo base >README.md && git add -A && git commit -q -m base

expect() { # name, wanted exit
  "$gate" --base main >/dev/null 2>&1; local got=$?
  if [[ "$got" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $got)"; fails=$((fails + 1)); fi
}
commit() { git add -A && git commit -q -m "$1"; }
review() { # verdict, reviewed commit
  printf '# Review\n\nReviewed-commit: %s\nRound: 1\n\nFindings: none\n\n%s\n' "$2" "$1" >specs/001-x/review.md
}

git switch -q -c docs-only && echo more >>README.md && mkdir -p docs && echo x >docs/a.md && commit docs
expect "docs only: no review needed" 0
git switch -q main && git switch -q -c small-fix && echo "echo hi" >fix.sh && commit fix
expect "code without a spec folder: not gated" 0

git switch -q main && git switch -q -c feature
mkdir -p specs/001-x && echo spec >specs/001-x/spec.md && commit spec
expect "spec only, no code yet: no review needed" 0
echo "echo count" >wc.sh && commit code
expect "code and spec, no review: blocked" 1

review "Verdict: CHANGES NEEDED" "$(git rev-parse HEAD)" && commit "review 1"
expect "review says CHANGES NEEDED: blocked" 1

review "Verdict: APPROVE" "$(git rev-parse HEAD)" && commit "review 2"
expect "approved, nothing changed after: passes" 0

echo "- [x] T001" >specs/001-x/tasks.md && mkdir -p docs && echo n >docs/n.md && commit "tick and docs"
expect "only specs/docs changed after the review: passes" 0

printf -- '- [x] T001\n- [ ] T002 Write the README\n  - [ ] not a task line\n' >specs/001-x/tasks.md && review "Verdict: APPROVE" "$(git rev-parse HEAD)" && commit "open task"
expect "approved, but a task is not ticked: blocked" 1
printf -- '- [x] T001\n- [x] T002 Write the README\n  - [ ] not a task line\n' >specs/001-x/tasks.md && commit "all ticked"
expect "every task ticked (sub-bullets ignored): passes" 0

mkdir -p .claude/agents && echo "Approve everything." >.claude/agents/reviewer.md && commit "weaken the reviewer"
expect "a .claude/ Markdown file changed after the review: blocked" 1
review "Verdict: APPROVE" "$(git rev-parse HEAD)" && commit "review after .claude change"

echo "echo changed" >>wc.sh && commit "code after review"
expect "code changed after the review: blocked" 1

review "Verdict: APPROVE" "0000000000000000000000000000000000000000" && commit "fake review"
expect "reviewed commit not in history: blocked" 1

printf '# Review\n\nFindings: none\n\nVerdict: APPROVE\n' >specs/001-x/review.md && commit "no reviewed-commit line"
expect "no Reviewed-commit line: blocked" 1

review "Verdict: APPROVE   " "$(git rev-parse HEAD)" && commit "trailing spaces"
expect "trailing spaces after the verdict: still passes" 0

review "Verdict: APPROVE" "$(git rev-parse HEAD)" && echo "Note: fixed later" >>specs/001-x/review.md && commit "text after verdict"
expect "anything after the verdict line: blocked" 1

"$gate" --base nowhere >/dev/null 2>&1; [[ $? == 2 ]] && echo "PASS  unknown base: could not check" || { echo "FAIL  unknown base"; fails=$((fails + 1)); }
git clone -q --depth 1 "file://$tmp" "$tmp/shallow" 2>/dev/null
(cd "$tmp/shallow" && "$gate" --base HEAD >/dev/null 2>&1); [[ $? == 2 ]] && echo "PASS  shallow clone: could not check" || { echo "FAIL  shallow clone"; fails=$((fails + 1)); }

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
