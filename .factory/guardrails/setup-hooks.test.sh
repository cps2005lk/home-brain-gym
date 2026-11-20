#!/usr/bin/env bash
# Tests for setup-hooks.sh: install, re-run, refuse to overwrite, old setup.
set -uo pipefail

setup="$(cd "$(dirname "$0")" && pwd)/setup-hooks.sh"
fails=0
expect() { # name, wanted, actual
  if [[ "$3" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $3)"; fails=$((fails + 1)); fi
}
new_repo() { local d; d="$(mktemp -d)"; git init -q -b main "$d"; echo "$d"; }

dir="$(new_repo)"
(cd "$dir" && "$setup" >/dev/null 2>&1); expect "fresh repo: installs" 0 $?
[[ -x "$dir/.git/hooks/pre-commit" && -x "$dir/.git/hooks/pre-push" ]]; expect "both hooks are executable" 0 $?
(cd "$dir" && "$setup" >/dev/null 2>&1); expect "second run: still fine" 0 $?
rm -rf "$dir"

dir="$(new_repo)"
printf '#!/bin/sh\necho mine\n' >"$dir/.git/hooks/pre-commit"
(cd "$dir" && "$setup" >/dev/null 2>&1); expect "someone else's hook: refuses" 1 $?
grep -q "echo mine" "$dir/.git/hooks/pre-commit"; expect "someone else's hook: left untouched" 0 $?
rm -rf "$dir"

dir="$(new_repo)"
git -C "$dir" config core.hooksPath .factory/guardrails/git-hooks
(cd "$dir" && "$setup" >/dev/null 2>&1); expect "old core.hooksPath setup: installs" 0 $?
[[ -z "$(git -C "$dir" config --local core.hooksPath)" ]]; expect "old core.hooksPath setup: setting removed" 0 $?
rm -rf "$dir"

dir="$(mktemp -d)"; (cd "$dir" && "$setup" >/dev/null 2>&1); expect "not a git repository" 2 $?; rm -rf "$dir"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
