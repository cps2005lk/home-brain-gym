#!/usr/bin/env bash
# Fails if a CLAUDE.md or CLAUDE.local.md exists anywhere in the project.
#
# Why: Claude Code reads AGENTS.md only when no CLAUDE.md is found. One stray
# CLAUDE.md silently switches the AGENTS.md files off (tested in M1).
#
# Usage: no-claude-md.sh [project-folder]   (default: current folder)
# Exit:  0 = none found, 1 = found (paths printed), 2 = bad folder

set -euo pipefail

root="${1:-.}"
if [[ ! -d "$root" ]]; then
  echo "no-claude-md: folder not found: $root" >&2
  exit 2
fi

# -iname: macOS ignores letter case, so claude.md opens as CLAUDE.md too.
found="$(find "$root" \
  \( -name .git -o -name node_modules \) -prune -o \
  -type f \( -iname 'CLAUDE.md' -o -iname 'CLAUDE.local.md' \) -print)"

if [[ -n "$found" ]]; then
  echo "no-claude-md: these files switch off AGENTS.md loading:" >&2
  echo "$found" >&2
  echo "Move their rules into AGENTS.md, then delete them." >&2
  exit 1
fi
