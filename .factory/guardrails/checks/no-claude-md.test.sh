#!/usr/bin/env bash
# Tests for no-claude-md.sh: each case builds a tiny fake project and checks the exit code.
set -uo pipefail

check="$(cd "$(dirname "$0")" && pwd)/no-claude-md.sh"
fails=0

run_case() { # name, expected exit code, files to create...
  local name="$1" want="$2"; shift 2
  local dir; dir="$(mktemp -d)"
  for f in "$@"; do mkdir -p "$dir/$(dirname "$f")"; touch "$dir/$f"; done
  "$check" "$dir" >/dev/null 2>&1
  local got=$?
  if [[ "$got" == "$want" ]]; then echo "PASS  $name"; else echo "FAIL  $name (want $want, got $got)"; fails=$((fails + 1)); fi
  rm -rf "$dir"
}

# Should allow
run_case "empty project"                0
run_case "AGENTS.md only"               0 AGENTS.md sub/AGENTS.md
run_case "CLAUDE.md inside node_modules" 0 node_modules/pkg/CLAUDE.md
run_case "similar name"                 0 docs/CLAUDE.md.bak

# Should block
run_case "root CLAUDE.md"               1 CLAUDE.md
run_case "CLAUDE.local.md"              1 CLAUDE.local.md
run_case ".claude/CLAUDE.md"            1 .claude/CLAUDE.md
run_case "nested CLAUDE.md"             1 src/app/CLAUDE.md
run_case "lower-case claude.md"         1 claude.md

# Bad input
"$check" /no/such/folder >/dev/null 2>&1; [[ $? == 2 ]] && echo "PASS  missing folder path" || { echo "FAIL  missing folder path"; fails=$((fails + 1)); }

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
