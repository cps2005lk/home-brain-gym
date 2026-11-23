#!/usr/bin/env bash
# One agent task inside the box: a fresh clone, a branch, the implementer,
# then the script (not the agent) checks the facts, pushes the branch and
# opens a draft pull request. The agent never pushes.
#
# Usage (inside the box): agent-task.sh owner/repo branch  < prompt
# Needs: GH_TOKEN (the agent token), GIT_NAME, GIT_EMAIL, TASK_TITLE.
set -euo pipefail
repo="${1:?owner/repo}"; branch="${2:?branch}"; prompt="$(cat)"
stop() { echo "agent-task: $1" >&2; exit 1; }

git config --global user.name "${GIT_NAME:?}"; git config --global user.email "${GIT_EMAIL:?}"
git clone -q "https://github.com/$repo.git" /work/repo && cd /work/repo
git switch -q -c "$branch"
[[ -x .factory/guardrails/setup-hooks.sh ]] && .factory/guardrails/setup-hooks.sh >/dev/null
[[ -f package-lock.json ]] && npm ci --silent --no-audit --no-fund

printf '%s\n' "$prompt" | claude -p --agent implementer --permission-mode acceptEdits \
  --allowedTools "Bash(npx vitest *)" "Bash(npm test*)" "Bash(scripts/check.sh*)" "Bash(npx tsc*)" \
  "Bash(npx prettier *)" "Bash(npx oxlint*)" "Bash(git add *)" "Bash(git commit *)" \
  "Bash(git status*)" "Bash(git diff*)" "Bash(git log*)" "Bash(ls *)" >/work/agent-report.txt 2>&1 || true

# Facts, checked by the script.
[[ -n "$(git log --oneline main..HEAD)" ]] || { cat /work/agent-report.txt; stop "the agent made no commits, so there is nothing to push."; }
if [[ -n "$(git status --porcelain docs/usage 2>/dev/null)" ]]; then git add docs/usage && git commit -q -m "Usage: agent run in the box"; fi
[[ -z "$(git status --porcelain)" ]] || { git status --short; stop "uncommitted changes are left, so the work is not complete."; }
if [[ -x scripts/check.sh ]]; then scripts/check.sh >/work/check.txt 2>&1 || { tail -20 /work/check.txt; stop "scripts/check.sh fails."; }; fi

# Never lose work: keep a bundle of the commits in the persistent volume
# until the push has worked. "run.sh outbox" copies bundles to the Mac.
mkdir -p /home/node/outbox && bundle="/home/node/outbox/$branch.bundle"
git bundle create -q "$bundle" main..HEAD
pushed=0
for try in 1 2 3; do git push -q -u origin "$branch" && { pushed=1; break; }; sleep 10; done
[[ $pushed == 1 ]] || stop "the push failed 3 times. The commits are safe in $bundle: copy them with run.sh outbox."
rm -f "$bundle"
{ echo "Built inside the factory's agent box (fresh clone, firewall, limited token). A human reads every line before merging."; echo; echo "## The agent's report"; echo; grep -v '^Warning: this sign-in' /work/agent-report.txt; } >/work/pr-body.md
gh pr create --draft --title "${TASK_TITLE:?}" --body-file /work/pr-body.md
