#!/usr/bin/env bash
# Tests for setup-identity.sh, in a temporary repo.
set -uo pipefail
s="$(cd "$(dirname "$0")" && pwd)/setup-identity.sh"
fails=0; tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
git init -q "$tmp/r"
"$s" "$tmp/r" >/dev/null; "$s" "$tmp/r" >/dev/null   # twice: must not pile up
got="$(git -C "$tmp/r" config --local --get-all credential.https://github.com.helper | tr '\n' '|')"
[[ "$got" == "|!gh auth git-credential|" ]] && echo "PASS  resets the helper list, then uses gh (idempotent)" || { echo "FAIL  helpers: $got"; fails=$((fails + 1)); }
"$s" "$tmp/nope" >/dev/null 2>&1; [[ $? == 2 ]] && echo "PASS  not a repo: exit 2" || { echo "FAIL  not a repo"; fails=$((fails + 1)); }
echo; [[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
