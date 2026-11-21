#!/usr/bin/env bash
# Tests for claude-settings-in-sync.sh: a fake project with a kit settings file.
set -uo pipefail

check="$(cd "$(dirname "$0")" && pwd)/claude-settings-in-sync.sh"
fails=0
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/.factory/adapters/claude" "$tmp/.claude"
kit="$tmp/.factory/adapters/claude/settings.json"; mine="$tmp/.claude/settings.json"
cat >"$kit" <<'JSON'
{"hooks": {
  "PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "pre; exit 2"}]}],
  "SessionEnd": [{"hooks": [{"type": "command", "timeout": 10, "command": "end"}]}]
}}
JSON
run_case() { # name, wanted exit, project settings (or "NONE")
  if [[ "$3" == NONE ]]; then rm -f "$mine"; else printf '%s' "$3" >"$mine"; fi
  "$check" "$tmp" >/dev/null 2>&1; local got=$?
  if [[ "$got" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $got)"; fails=$((fails + 1)); fi
}

# Should pass
run_case "exact copy"                 0 "$(cat "$kit")"
run_case "same hooks, other order and spacing" 0 '{"hooks":{"SessionEnd":[{"hooks":[{"command":"end","timeout":10,"type":"command"}]}],"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"pre; exit 2"}]}]}}'
run_case "project adds its own settings and hooks" 0 '{"permissions":{"allow":["Bash(npm test)"]},"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"pre; exit 2"},{"type":"command","command":"mine"}]},{"matcher":"Edit","hooks":[{"type":"command","command":"fmt"}]}],"SessionEnd":[{"hooks":[{"type":"command","timeout":10,"command":"end"}]}]}}'

# Should fail
run_case "a kit hook is missing"      1 '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"pre; exit 2"}]}]}}'
run_case "a kit hook was edited"      1 '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"pre"}]}],"SessionEnd":[{"hooks":[{"type":"command","timeout":10,"command":"end"}]}]}}'
run_case "the timeout was changed"    1 '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"pre; exit 2"}]}],"SessionEnd":[{"hooks":[{"type":"command","timeout":1,"command":"end"}]}]}}'
run_case "under another matcher"      1 '{"hooks":{"PreToolUse":[{"matcher":"Edit","hooks":[{"type":"command","command":"pre; exit 2"}]}],"SessionEnd":[{"hooks":[{"type":"command","timeout":10,"command":"end"}]}]}}'
run_case "no hooks at all"            1 '{}'
run_case "no .claude/settings.json"   1 NONE

# Could not check
run_case "project file is not JSON"   2 '{"hooks": '
rm -f "$kit"
run_case "no kit settings installed"  2 '{}'

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
