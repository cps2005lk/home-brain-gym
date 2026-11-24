#!/usr/bin/env bash
# Tests for stop.sh: when it lets the agent stop (exit 0) and when it sends
# it back once (exit 2, the reason on stderr).
set -uo pipefail

script="$(cd "$(dirname "$0")" && pwd)/stop.sh"
fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1${2:+ ($2)}"; fails=$((fails + 1)); }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
git init -q --bare "$tmp/remote.git"
p="$tmp/proj"
git init -q -b main "$p" && cd "$p" || exit 1
git config user.email t@example.com && git config user.name t
git remote add origin "$tmp/remote.git"
mkdir -p scripts
# check.sh counts its runs, and fails when the file FAIL exists.
printf '#!/usr/bin/env bash\necho run >>"%s/check-runs"\n[[ -e FAIL ]] && { echo "3 tests FAILED"; exit 1; }\necho "all green"\n' "$tmp" >scripts/check.sh
chmod +x scripts/check.sh
echo one >a.txt && git add -A && git commit -q -m base && git push -q -u origin main 2>/dev/null

runs() { [[ -e "$tmp/check-runs" ]] && wc -l <"$tmp/check-runs" | tr -d ' ' || echo 0; }
stop() { # [stop_hook_active]
  printf '{"hook_event_name":"Stop","stop_hook_active":%s,"cwd":"%s"}' "${1:-false}" "$p" \
    | CLAUDE_PROJECT_DIR="$p" "$script" >"$tmp/out" 2>"$tmp/err"; echo $?
}

# Lets the agent stop
[[ "$(stop)" == 0 && ! -s "$tmp/err" ]] && pass "clean, nothing unpushed: stops quietly" || fail "clean stop" "$(cat "$tmp/err")"
echo scratch >notes.txt
[[ "$(stop)" == 0 ]] && pass "untracked files don't count" || fail "untracked ignored" "$(cat "$tmp/err")"
rm notes.txt
[[ "$(runs)" == 0 ]] && pass "nothing unpushed: check.sh doesn't run" || fail "no check when nothing unpushed"

# (b) uncommitted changes to tracked files
echo two >>a.txt
[[ "$(stop)" == 2 ]] && grep -q "a.txt" "$tmp/err" && pass "uncommitted change: sent back, file named" || fail "uncommitted change" "$(cat "$tmp/err")"
grep -q "tell the human" "$tmp/err" && pass "says: if not yours, tell the human" || fail "tell the human"
[[ "$(stop true)" == 0 ]] && pass "already sent back once (stop_hook_active): lets it stop" || fail "loop guard"
git add a.txt
[[ "$(stop)" == 2 ]] && pass "staged but not committed: sent back" || fail "staged change"
git reset -q && git checkout -q -- a.txt

# (a) commits on main that no remote has
echo three >b.txt && git add -A && git commit -q -m "on main"
[[ "$(stop)" == 2 ]] && grep -q "main" "$tmp/err" && grep -q "branch" "$tmp/err" && pass "commit on main, not pushed: sent back" || fail "unpushed main" "$(cat "$tmp/err")"
[[ "$(runs)" == 0 ]] && pass "something else is wrong: check.sh isn't run (fix that first)" || fail "no check when sent back already" "runs $(runs)"
git reset -q --hard origin/main

# (c) check.sh on new, unpushed commits
git switch -q -c feature && echo four >c.txt && git add -A && git commit -q -m "feature work"
[[ "$(stop)" == 0 && "$(runs)" == 1 ]] && pass "new unpushed commit, checks green: runs check.sh once, stops" || fail "green check" "runs $(runs); $(cat "$tmp/err")"
[[ "$(stop)" == 0 && "$(runs)" == 1 ]] && pass "same commit again: remembered, check.sh not run again" || fail "remembered green" "runs $(runs)"
touch FAIL && echo five >d.txt && git add d.txt && git commit -q -m "breaks it"
[[ "$(stop)" == 2 && "$(runs)" == 2 ]] && grep -q "3 tests FAILED" "$tmp/err" && pass "new commit, checks fail: sent back with the output" || fail "failing check" "runs $(runs); $(cat "$tmp/err")"
[[ "$(stop)" == 2 && "$(runs)" == 3 ]] && pass "still failing: checked again, not remembered as green" || fail "failure not cached" "runs $(runs)"
[[ "$(stop true)" == 0 ]] && pass "failing checks, already sent back once: lets it stop" || fail "loop guard on failing check"
rm FAIL
git push -q -u origin feature 2>/dev/null
before="$(runs)"
[[ "$(stop)" == 0 && "$(runs)" == "$before" ]] && pass "pushed branch: check.sh not run (pre-push ran it)" || fail "pushed branch" "runs $(runs)"
echo six >e.txt && git add -A && git commit -q -m "more"
git rm -q scripts/check.sh && git commit -q -m "no checks"
[[ "$(stop)" == 2 ]] && grep -q "could not" "$tmp/err" && pass "no scripts/check.sh: could not check, sent back" || fail "missing check.sh" "$(cat "$tmp/err")"

# The Stop command in settings.json, run the way Claude Code runs it
here="$(cd "$(dirname "$script")" && pwd)"
hook_cmd="$(jq -r '.hooks.Stop[0].hooks[0].command // empty' "$here/settings.json")"
if [[ -z "$hook_cmd" ]]; then
  fail "settings.json has a Stop hook"
else
  pass "settings.json has a Stop hook"
  echo seven >>a.txt
  printf '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR="$p" bash -c "$hook_cmd" >/dev/null 2>"$tmp/err"
  [[ $? == 0 ]] && grep -q "stop.sh" "$tmp/err" && pass "no .factory on this branch: lets it stop, says why (no loop)" || fail "no .factory" "$(cat "$tmp/err")"
  mkdir -p "$p/.factory" && cp -R "$here/../../." "$p/.factory/"
  printf '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR="$p" bash -c "$hook_cmd" >/dev/null 2>&1
  [[ $? == 2 ]] && pass "with .factory: uncommitted change sends it back" || fail "with .factory: sends back"
  t="$(jq -r '.hooks.Stop[0].hooks[0].timeout // 0' "$here/settings.json")"
  (( t >= 120 )) && pass "the Stop hook has time for check.sh (timeout $t s)" || fail "Stop timeout" "timeout $t"
  rm -rf "$p/.factory"; git checkout -q -- a.txt
fi

# Outside a git repo
mkdir -p "$tmp/plain"
printf '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR="$tmp/plain" "$script" >/dev/null 2>&1
[[ $? == 0 ]] && pass "not a git repo: stops quietly" || fail "not a git repo"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
