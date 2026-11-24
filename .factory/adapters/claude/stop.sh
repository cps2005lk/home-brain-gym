#!/usr/bin/env bash
# Claude Code adapter: a Stop hook. Before the agent ends its reply, it checks
# for unfinished work and sends the agent back ONCE with the reason:
#   (a) commits on main (or master) that no remote has;
#   (b) uncommitted changes to tracked files (untracked files don't count);
#   (c) new commits that no remote has, whose last commit hasn't passed
#       scripts/check.sh yet. A green result is remembered per commit, so a
#       reply without a new commit costs nothing.
#
# Claude Code sends JSON on stdin with "stop_hook_active": true when the
# agent is already continuing because of a Stop hook. Then this script lets
# it stop: sent back once, never in a loop.
#   exit 0              = the agent may stop
#   exit 2, stderr text = the agent continues; it reads the text as the reason
# Source: https://code.claude.com/docs/en/hooks (checked 2026-11-24).
#
# Known gaps: it can't tell the agent's changes from a human's, so the
# message says what to do in both cases; work pushed elsewhere, or done
# outside git, isn't seen. The pre-push hook and CI stay the real gates.

set -uo pipefail

input="$(cat)"
grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true' <<<"$input" && exit 0

root="$(git -C "${CLAUDE_PROJECT_DIR:-$PWD}" rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$root" || exit 0

reasons=()
branch="$(git branch --show-current)"
unpushed="$(git rev-list HEAD --not --remotes 2>/dev/null | head -1)"

# (a) main changes only through a pull request.
if [[ "$branch" =~ ^(main|master)$ && -n "$unpushed" ]]; then
  reasons+=("You have commits on '$branch' that no remote has. Work lands on '$branch' only through a pull request: move them to a branch (git switch -c <name>), then reset '$branch' to its remote, or tell the human.")
fi

# (b) Uncommitted changes to tracked files.
dirty="$(git status --porcelain --untracked-files=no)"
if [[ -n "$dirty" ]]; then
  list="$(head -10 <<<"$dirty" | sed 's/^/    /')"
  reasons+=("These tracked files have uncommitted changes:
$list
If they are your work, commit them on a branch, or say why they should stay uncommitted. If they aren't yours, tell the human and leave them alone.")
fi

# (c) The checks, on new work that hasn't been pushed (the pre-push hook ran
# them on anything pushed). Only when nothing above is wrong: the agent has
# to fix that first, and a slow check would be wasted.
green="$(git rev-parse --git-dir)/factory-checks-green"
head_sha="$(git rev-parse HEAD 2>/dev/null)"
if [[ ${#reasons[@]} -eq 0 && -n "$unpushed" && "$(cat "$green" 2>/dev/null)" != "$head_sha" ]]; then
  if [[ ! -x scripts/check.sh ]]; then
    reasons+=("There are commits no remote has, and the checks could not run: scripts/check.sh is missing or not executable. Tell the human.")
  elif out="$(scripts/check.sh 2>&1)"; then
    echo "$head_sha" >"$green"
  else
    reasons+=("scripts/check.sh fails on your last commit (${head_sha:0:7}). Fix it before you stop, or tell the human why you can't. Last lines:
$(tail -15 <<<"$out" | sed 's/^/    /')")
  fi
fi

[[ ${#reasons[@]} -eq 0 ]] && exit 0
{
  echo "factory stop-check: before you stop, there is unfinished work."
  for r in "${reasons[@]}"; do printf -- '- %s\n' "$r"; done
  echo "You are sent back once. If you can't finish it, say so plainly to the human, then stop."
} >&2
exit 2
