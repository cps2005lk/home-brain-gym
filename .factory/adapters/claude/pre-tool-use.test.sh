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
expect "Edit another file: exit 0"              0 "" '{"tool_name":"Edit","tool_input":{"file_path":"/p/specs/001-x/spec.md"}}'
expect "Edit review.md: blocked"               2 "" '{"tool_name":"Edit","tool_input":{"file_path":"/p/specs/001-x/review.md"}}'
expect "Write review.md: blocked"              2 "" '{"tool_name":"Write","tool_input":{"file_path":"specs/001-x/review.md"}}'
expect "Write review.md.bak: allowed"         0 "" '{"tool_name":"Write","tool_input":{"file_path":"specs/001-x/review.md.bak"}}'
expect "a non-file tool: exit 0"               0 "" '{"tool_name":"Read","tool_input":{"file_path":"specs/001-x/review.md"}}'
expect "bad JSON: blocked"                    2 "" 'not json'
expect "Bash without a command: blocked"      2 "" '{"tool_name":"Bash","tool_input":{}}'

# Identity guard: GitHub writes without the agent token need a human yes
id_case() { # name, GH_TOKEN value, command, want ("ask" or "none")
  local out; out="$(GH_TOKEN="$2" bash -c '"$0"' "$adapter" <<<"$(bash_json "$3")" 2>/dev/null)"
  if [[ "$4" == ask && "$out" == *'"ask"'* ]] || [[ "$4" == none && -z "$out" ]]; then pass "$1"; else fail "$1" "got: ${out:-<nothing>}"; fi
}
id_case "push without the agent token: ask"       ""                  "git push -u origin fix"        ask
id_case "push with the agent token: no question"   "github_pat_abc123" "git push -u origin fix"        none
id_case "gh pr create without the token: ask"      "gho_abc123"        "gh pr create --fill"           ask
id_case "reading is fine without the token"        ""                  "gh pr view 3 --json state"     none
id_case "git status is fine"                       ""                  "git status"                    none
id_case "push inside a chain: ask"                 ""                  "npm test && git push"         ask
id_case "a word like pushed is not a push"         ""                  "echo pushed"                   none

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
CLAUDE_PROJECT_DIR="$tmp" bash -c "$hook_cmd" <<<'{"tool_name":"Write","tool_input":{"file_path":"specs/x/review.md"}}' >/dev/null 2>&1
[[ $? == 2 ]] && pass "with .factory: Write to review.md blocks" || fail "with .factory: Write to review.md" "want exit 2"
m="$(jq -r '.hooks.PreToolUse[0].matcher' "$here/settings.json")"
for tool in Bash Edit Write; do [[ "|$m|" == *"|$tool|"* ]] || fail "matcher covers $tool" "matcher is $m"; done && pass "the matcher covers Bash, Edit and Write"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
