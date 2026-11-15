#!/usr/bin/env bash
# Tests for no-push-to-main.sh: feed it the lines git gives a pre-push hook.
set -uo pipefail

check="$(cd "$(dirname "$0")" && pwd)/no-push-to-main.sh"
fails=0
sha=1111111111111111111111111111111111111111
zero=0000000000000000000000000000000000000000
run_case() { # name, wanted exit code, stdin text
  printf '%b' "$3" | "$check" >/dev/null 2>&1; local got=$?
  if [[ "$got" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $got)"; fails=$((fails + 1)); fi
}

# Should allow
run_case "push a branch"            0 "refs/heads/fix $sha refs/heads/fix $zero\n"
run_case "push a tag"               0 "refs/tags/v1 $sha refs/tags/v1 $zero\n"
run_case "branch named main-docs"   0 "refs/heads/main-docs $sha refs/heads/main-docs $zero\n"
run_case "nothing to push"          0 ""

# Should block
run_case "push to main"             1 "refs/heads/main $sha refs/heads/main $sha\n"
run_case "push to master"           1 "refs/heads/master $sha refs/heads/master $sha\n"
run_case "local branch onto main"   1 "refs/heads/fix $sha refs/heads/main $sha\n"
run_case "delete main"              1 "(delete) $zero refs/heads/main $sha\n"
run_case "main among other refs"    1 "refs/heads/fix $sha refs/heads/fix $zero\nrefs/heads/main $sha refs/heads/main $sha\n"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
