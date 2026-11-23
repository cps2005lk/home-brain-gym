#!/usr/bin/env bash
# Once per clone: git asks gh for GitHub credentials instead of the Mac
# keychain. gh uses GH_TOKEN when the session has one (the agent token, see
# claude-agent.sh) and your own login otherwise, so your pushes keep working.
#
# Usage: setup-identity.sh [repo-folder]
# Exit:  0 = set (or already set), 2 = not a git repo
set -euo pipefail
dir="${1:-.}"
git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "setup-identity: not a git repo: $dir" >&2; exit 2; }
key=credential.https://github.com.helper
git -C "$dir" config --local --replace-all "$key" ""
git -C "$dir" config --local --add "$key" '!gh auth git-credential'
echo "setup-identity: git in $(basename "$(git -C "$dir" rev-parse --show-toplevel)") now follows the session's GitHub token."
