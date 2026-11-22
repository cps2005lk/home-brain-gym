#!/usr/bin/env bash
# Claude Code adapter: runs the factory's risky-command check before every
# Bash command the agent wants to run.
#
# Claude Code sends JSON on stdin, e.g.
#   {"tool_name":"Bash","tool_input":{"command":"git push --no-verify"}}
# and reads the answer from the exit code and output:
#   exit 0, no output            = no objection (the normal permission flow applies)
#   exit 2, reason on stderr     = blocked; Claude sees the reason
#   exit 0, "ask" JSON on stdout = Claude Code shows the human a permission prompt
# Source: https://code.claude.com/docs/en/hooks (checked 2026-11-21).
#
# The check itself knows nothing about Claude. This file only translates.

set -uo pipefail

check="$(cd "$(dirname "$0")/../../guardrails/checks" 2>/dev/null && pwd)/risky-command.sh"
block() { echo "factory: $1" >&2; exit 2; }

command -v jq >/dev/null || block "jq not found, so the command was not checked."
[[ -x "$check" ]] || block "risky-command.sh not found next to this adapter, so the command was not checked."

input="$(cat)"
tool="$(jq -r '.tool_name // empty' <<<"$input" 2>/dev/null)" || block "the hook input was not valid JSON, so the command was not checked."
# File tools: only one rule, the review record is written by review.sh alone.
if [[ "$tool" =~ ^(Edit|Write|MultiEdit|NotebookEdit)$ ]]; then
  path="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")"
  [[ "$path" =~ (^|/)review\.md$ ]] && block "review.md is written only by review.sh: an agent must not change a review.
This is a factory guardrail. Don't look for a way around it: tell the user what you wanted to do and why."
  exit 0
fi
[[ "$tool" == "Bash" ]] || exit 0

cmd="$(jq -r '.tool_input.command // empty' <<<"$input")"
[[ -n "$cmd" ]] || block "no command in the hook input, so nothing was checked."

reason="$("$check" "$cmd" 2>&1 >/dev/null)"
case $? in
  0) exit 0 ;;
  1) block "$reason
This is a factory guardrail. Don't look for a way around it: tell the user what you wanted to do and why." ;;
  3) jq -n --arg r "$reason" '{hookSpecificOutput: {hookEventName: "PreToolUse",
       permissionDecision: "ask", permissionDecisionReason: $r}}'
     exit 0 ;;
  *) block "${reason:-risky-command.sh could not check the command.}" ;;
esac
