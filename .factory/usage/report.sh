#!/usr/bin/env bash
# Collects a project's usage files (docs/usage/*.yml) into one table,
# and lists the files where a human still has to fill task or corrections.
#
# Usage: report.sh [project-folder] [--no-gh]
#   --no-gh  don't look up pull requests (offline, or no gh)
# The PR column comes from `gh pr list --head <branch>`: the latest PR made
# from that branch, and whether it was merged.
# Exit:  0 = report printed, 2 = no usage files found (nothing to report)

set -uo pipefail

project="."; use_gh=1
for a in "$@"; do case "$a" in --no-gh) use_gh=0 ;; *) project="$a" ;; esac; done
cd "$project" 2>/dev/null || { echo "report: folder not found: $project" >&2; exit 2; }
shopt -s nullglob
files=(docs/usage/*.yml)
(( ${#files[@]} )) || { echo "report: no usage files in $project/docs/usage/." >&2; exit 2; }
command -v gh >/dev/null || use_gh=0

val() { sed -n "s/^$1: *//p" "$2" | head -1 | sed 's/^"\(.*\)"$/\1/'; }
# One gh call per row. (No dictionary cache: macOS bash 3.2 has no declare -A.)
pr_for() {
  (( use_gh )) || { echo "-"; return; }
  local pr; pr="$(gh pr list --head "$1" --state all --limit 1 \
      --json number,state --jq '.[0] | "#\(.number) \(.state | ascii_downcase)"' 2>/dev/null)"
  echo "${pr:-none}"
}

echo "| Date | Branch | Model | Active min | Replies | Output tokens | Input tokens (all) | Task | Corrections | PR |"
echo "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |"
todo=(); sum_min=0; sum_out=0
for f in "${files[@]}"; do
  branch="$(val branch "$f")"; task="$(val task "$f")"; corr="$(val corrections "$f")"
  min="$(val active_minutes "$f")"; out="$(val tokens_output "$f")"
  inp=$(( $(val tokens_input "$f") + $(val tokens_cache_write "$f") + $(val tokens_cache_read "$f") ))
  sum_min=$((sum_min + min)); sum_out=$((sum_out + out))
  echo "| $(val started "$f" | cut -c1-10) | $branch | $(val model "$f" | sed 's/^claude-//') | $min | $(val replies "$f") | $out | $inp | ${task:-?} | ${corr:-?} | $(pr_for "$branch") |"
  [[ -n "$task" && -n "$corr" ]] || todo+=("$f")
done
echo
echo "${#files[@]} sessions, $sum_min active minutes, $sum_out output tokens."
if (( ${#todo[@]} )); then
  echo
  echo "To fill in (task in \"quotes\", corrections as a number):"
  printf -- '- %s\n' "${todo[@]}"
fi
