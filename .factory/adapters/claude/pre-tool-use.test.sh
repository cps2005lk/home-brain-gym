#!/usr/bin/env bash
# Tests for the Claude adapter and the hook command in settings.json.
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
adapter="$here/pre-tool-use.sh"
fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1 ($2)"; fails=$((fails + 1)); }
bash_json() { jq -cn --arg c "$1" '{tool_name: "Bash", tool_input: {command: $c}}'; }

expect() { # name, wanted exit, wanted stdout pattern ("" = empty), stdin
  local out got
  out="$(printf '%s' "$4" | "$adapter" 2>/dev/null)"; got=$?
  if [[ "$got" != "$2" ]]; then fail "$1" "want exit $2, got $got"; return; fi
  if [[ -z "$3" && -n "$out" ]]; then fail "$1" "want no output, got: $out"; return; fi
  if [[ -n "$3" ]] && ! grep -q "$3" <<<"$out"; then fail "$1" "output lacks $3"; return; fi
  pass "$1"
}

# The adapter
expect "allowed command: exit 0, no output"   0 "" "$(bash_json 'npm test')"
expect "blocked command: exit 2"              2 "" "$(bash_json 'git push --no-verify')"
expect "ask: exit 0 with ask JSON"            0 '"permissionDecision": "ask"' "$(bash_json 'git push --force origin fix')"
expect "not a Bash tool: exit 0"              0 "" '{"tool_name":"Edit","tool_input":{"file_path":"a.ts"}}'
expect "bad JSON: blocked"                    2 "" 'not json'
expect "Bash without a command: blocked"      2 "" '{"tool_name":"Bash","tool_input":{}}'

# The reason reaches Claude (stderr) when blocked
err="$(bash_json 'gh pr merge 2' | "$adapter" 2>&1 >/dev/null)"
grep -q "merging is a human decision" <<<"$err" && pass "block reason on stderr" || fail "block reason on stderr" "got: $err"

# The hook command in settings.json, run the way Claude Code runs it
hook_cmd="$(jq -r '.hooks.PreToolUse[0].hooks[0].command' "$here/settings.json")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

CLAUDE_PROJECT_DIR="$tmp" bash -c "$hook_cmd" <<<"$(bash_json 'npm test')" >/dev/null 2>&1
[[ $? == 2 ]] && pass "no .factory on this branch: blocked, not a silent pass" || fail "no .factory on this branch" "want exit 2"

mkdir -p "$tmp/.factory" && cp -R "$here/../../." "$tmp/.factory/"
CLAUDE_PROJECT_DIR="$tmp" bash -c "$hook_cmd" <<<"$(bash_json 'npm test')" >/dev/null 2>&1
[[ $? == 0 ]] && pass "with .factory: allowed command passes" || fail "with .factory: allowed" "want exit 0"
CLAUDE_PROJECT_DIR="$tmp" bash -c "$hook_cmd" <<<"$(bash_json 'git commit -n -m x')" >/dev/null 2>&1
[[ $? == 2 ]] && pass "with .factory: blocked command blocks" || fail "with .factory: blocked" "want exit 2"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
