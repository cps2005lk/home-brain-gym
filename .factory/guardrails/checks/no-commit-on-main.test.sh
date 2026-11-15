#!/usr/bin/env bash
# Tests for no-commit-on-main.sh: each case makes a tiny repo on some branch.
set -uo pipefail

check="$(cd "$(dirname "$0")" && pwd)/no-commit-on-main.sh"
fails=0
expect() { # name, wanted exit code, actual exit code
  if [[ "$3" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $3)"; fails=$((fails + 1)); fi
}
on_branch() { # branch name -> exit code of the check in a repo on that branch
  local dir; dir="$(mktemp -d)"
  git -C "$dir" init -q -b "$1"
  (cd "$dir" && "$check" >/dev/null 2>&1); local got=$?
  rm -rf "$dir"; return $got
}

# Should allow
on_branch feature/x; expect "feature branch" 0 $?
on_branch mainline;  expect "branch name that starts with main" 0 $?
dir="$(mktemp -d)"; git -C "$dir" init -q -b main
git -C "$dir" -c user.name=t -c user.email=t@example.com commit -q --allow-empty -m one
git -C "$dir" checkout -q --detach
(cd "$dir" && "$check" >/dev/null 2>&1); expect "detached HEAD (during a rebase)" 0 $?
rm -rf "$dir"

# Should block
on_branch main;   expect "main" 1 $?
on_branch master; expect "master" 1 $?

# Could not check
dir="$(mktemp -d)"; (cd "$dir" && "$check" >/dev/null 2>&1); expect "not a git repository" 2 $?; rm -rf "$dir"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
