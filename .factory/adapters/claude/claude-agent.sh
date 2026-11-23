#!/usr/bin/env bash
# Starts Claude Code with the agent's limited GitHub token (keychain item
# "factory-agents-gh"), so gh and git push in that session act with the agent
# token, not your full login. The token is never printed or written down.
#
# Usage: claude-agent.sh [claude options]     (tip: alias claude-agent=…)
# Needs: setup-identity.sh run once per clone, so git follows the token.
set -euo pipefail
token="$(security find-generic-password -a "$USER" -s factory-agents-gh -w 2>/dev/null)" \
  || { echo "claude-agent: no keychain item 'factory-agents-gh', so Claude was not started." >&2; exit 2; }
[[ "$token" == github_pat_* ]] \
  || { echo "claude-agent: the keychain item is not a fine-grained token, so Claude was not started." >&2; exit 2; }
GH_TOKEN="$token" exec claude "$@"
