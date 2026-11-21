#!/usr/bin/env bash
# Tests for report.sh, with two usage files and a fake gh on PATH.
set -uo pipefail

report="$(cd "$(dirname "$0")" && pwd)/report.sh"
fails=0
has() { # name, text, wanted line part
  if grep -qF -- "$3" <<<"$2"; then echo "PASS  $1"; else echo "FAIL  $1 (missing: $3)"; fails=$((fails + 1)); fi
}
hasnt() { if grep -qF -- "$3" <<<"$2"; then echo "FAIL  $1 (unwanted: $3)"; fails=$((fails + 1)); else echo "PASS  $1"; fi; }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/proj/docs/usage" "$tmp/bin"
usage() { # file, branch, task line, corrections line, active, output
  cat >"$tmp/proj/docs/usage/$1" <<YML
session: x
branch: $2
started: ${1:0:10}T06:00:00Z
model: claude-opus-5-5
active_minutes: $5
replies: 3
tokens_input: 1
tokens_cache_write: 10
tokens_cache_read: 100
tokens_output: $6
$3
$4
YML
}
usage 2026-11-20-aaaaaaaa.yml fix-timer 'task: "Fix: the midnight bug"' 'corrections: 1' 12 300
usage 2026-11-21-bbbbbbbb.yml brain     'task:'                         'corrections:'  5 40
usage 2026-11-21-cccccccc.yml brain     'task: "Add trust.md"'          'corrections:'  1 10

# A fake gh: answers like `gh pr list --head <branch> ... --jq ...` would.
cat >"$tmp/bin/gh" <<'SH'
#!/usr/bin/env bash
for ((i = 1; i <= $#; i++)); do [[ "${!i}" == --head ]] && { j=$((i + 1)); branch="${!j}"; }; done
case "$branch" in fix-timer) echo "#7 merged" ;; *) echo "" ;; esac
SH
chmod +x "$tmp/bin/gh"

out="$(PATH="$tmp/bin:$PATH" "$report" "$tmp/proj")"; code=$?
[[ $code == 0 ]] && echo "PASS  exit 0" || { echo "FAIL  exit $code"; fails=$((fails + 1)); }
has   "a row per file, quotes removed from the task" "$out" "| 2026-11-20 | fix-timer | opus-5-5 | 12 | 3 | 300 | 111 | Fix: the midnight bug | 1 | #7 merged |"
has   "empty task and corrections shown as ?"        "$out" "| 2026-11-21 | brain | opus-5-5 | 5 | 3 | 40 | 111 | ? | ? | none |"
has   "totals"                                       "$out" "3 sessions, 18 active minutes, 350 output tokens."
has   "lists the file to fill in"                    "$out" "- docs/usage/2026-11-21-bbbbbbbb.yml"
has   "lists a file with only corrections missing"  "$out" "- docs/usage/2026-11-21-cccccccc.yml"
hasnt "a complete file is not listed"                "$out" "- docs/usage/2026-11-20-aaaaaaaa.yml"

out="$(PATH="$tmp/bin:$PATH" "$report" "$tmp/proj" --no-gh)"
has   "--no-gh: no PR lookup"                        "$out" "| 1 | - |"

mkdir -p "$tmp/empty"
"$report" "$tmp/empty" >/dev/null 2>&1; code=$?
[[ $code == 2 ]] && echo "PASS  no usage files: exit 2" || { echo "FAIL  no usage files (want 2, got $code)"; fails=$((fails + 1)); }

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
