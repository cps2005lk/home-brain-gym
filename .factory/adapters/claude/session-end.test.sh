#!/usr/bin/env bash
# Tests for session-end.sh, with a small fake transcript whose numbers are known.
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
hook="$here/session-end.sh"
fails=0
check() { # name, file, key, wanted value
  local got; got="$(sed -n "s/^$3: *//p" "$2" 2>/dev/null | head -1)"
  if [[ "$got" == "$4" ]]; then echo "PASS  $1"; else echo "FAIL  $1 ($3: want '$4', got '$got')"; fails=$((fails + 1)); fi
}

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
git init -q -b work "$tmp/proj"
t="$tmp/t.jsonl"
# Reply r1 appears twice (two content blocks): it must be counted once.
# A 2-hour gap (waiting for a human) counts in wall time, not active time.
cat >"$t" <<'JSONL'
{"type":"user","timestamp":"2026-11-21T06:00:00.000Z","message":{"role":"user","content":"hi"}}
{"type":"assistant","timestamp":"2026-11-21T06:01:00.000Z","message":{"id":"r1","role":"assistant","model":"claude-opus-5-5","usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":1000,"output_tokens":5}}}
{"type":"assistant","timestamp":"2026-11-21T06:01:00.500Z","message":{"id":"r1","role":"assistant","model":"claude-opus-5-5","usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":1000,"output_tokens":5}}}
{"type":"assistant","timestamp":"2026-11-21T06:04:00.000Z","message":{"id":"r2","role":"assistant","model":"claude-opus-5-5","usage":{"input_tokens":1,"cache_creation_input_tokens":20,"cache_read_input_tokens":2000,"output_tokens":7}}}
{"type":"user","timestamp":"2026-11-21T08:04:00.000Z","message":{"role":"user","content":"back"}}
{"type":"assistant","timestamp":"2026-11-21T08:06:00.000Z","message":{"id":"r3","role":"assistant","model":"claude-haiku-5-5","usage":{"input_tokens":2,"cache_creation_input_tokens":0,"cache_read_input_tokens":500,"output_tokens":3}}}
JSONL
run() { jq -cn --arg s "$1" --arg t "$2" '{session_id: $s, transcript_path: $t, hook_event_name: "SessionEnd", reason: "other"}' \
  | CLAUDE_PROJECT_DIR="$tmp/proj" "$hook" 2>"$tmp/err"; }

run "abcdef1234567890" "$t"
f="$tmp/proj/docs/usage/2026-11-21-abcdef12.yml"
[[ -f "$f" ]] && echo "PASS  one file per session, named by date and session" || { echo "FAIL  file not written: $(cat "$tmp/err")"; fails=$((fails + 1)); }
check "project is the repo folder"          "$f" project proj
check "branch"                              "$f" branch work
check "started"                             "$f" started 2026-11-21T06:00:00Z
check "wall time includes the wait"         "$f" wall_minutes 126
check "active time skips gaps over 5 min"   "$f" active_minutes 6
check "replies counted once by id"          "$f" replies 3
check "input tokens"                        "$f" tokens_input 13
check "cache write tokens"                  "$f" tokens_cache_write 120
check "cache read tokens"                   "$f" tokens_cache_read 3500
check "output tokens"                       "$f" tokens_output 15
check "model: the one used most"            "$f" model claude-opus-5-5
check "task left for a human"               "$f" task ""
grep -q " $" "$f" && { echo "FAIL  no trailing spaces (Prettier would fail)"; fails=$((fails + 1)); } || echo "PASS  no trailing spaces (Prettier would fail)"

# A human fills task and corrections; resuming the session must keep them.
perl -pi -e 's/^task:.*/task: Fix the midnight bug/; s/^corrections:.*/corrections: 1/' "$f"
run "abcdef1234567890" "$t"
check "resume keeps the human's task"       "$f" task "Fix the midnight bug"
check "resume keeps the corrections"        "$f" corrections 1

# Problems are reported, never fatal (SessionEnd can't block anyway).
run "deadbeef00000000" "$tmp/missing.jsonl"; code=$?
[[ $code == 0 ]] && grep -q "transcript not found" "$tmp/err" && [[ ! -e "$tmp/proj/docs/usage/"*deadbeef* ]] \
  && echo "PASS  missing transcript: reported, no file, exit 0" || { echo "FAIL  missing transcript"; fails=$((fails + 1)); }

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
