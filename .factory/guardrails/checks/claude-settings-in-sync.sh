#!/usr/bin/env bash
# Fails when the project's .claude/settings.json is missing a hook from the
# installed kit (.factory/adapters/claude/settings.json), or has an edited one.
#
# Why: install.sh updates .factory/, but .claude/settings.json is the
# project's own file. When the kit adds or changes a hook, the copy drifts
# and the new hook silently never runs.
# The project may add its own settings and hooks: only the kit's must match.
#
# Usage: claude-settings-in-sync.sh [project-folder]
# Exit:  0 = every kit hook is present, unchanged
#        1 = a kit hook is missing or edited (listed on stderr)
#        2 = could not check (no kit settings, bad JSON, no jq)

set -uo pipefail

root="${1:-.}"
kit="$root/.factory/adapters/claude/settings.json"
mine="$root/.claude/settings.json"
fix="Fix: merge the hooks from .factory/adapters/claude/settings.json into .claude/settings.json (or copy the file if you have no settings of your own)."

command -v jq >/dev/null || { echo "claude-settings-in-sync: jq not found, so nothing was checked." >&2; exit 2; }
[[ -f "$kit" ]] || { echo "claude-settings-in-sync: $kit not found, so nothing was checked." >&2; exit 2; }
jq empty "$kit" 2>/dev/null || { echo "claude-settings-in-sync: $kit is not valid JSON." >&2; exit 2; }
[[ -f "$mine" ]] || { echo "claude-settings-in-sync: $mine is missing, so the kit's agent hooks never run. $fix" >&2; exit 1; }
jq empty "$mine" 2>/dev/null || { echo "claude-settings-in-sync: $mine is not valid JSON, so nothing was checked." >&2; exit 2; }

# For every hook in the kit: is the same hook, unchanged, under the same
# event and matcher in the project's file?
missing="$(jq -rn --slurpfile k "$kit" --slurpfile m "$mine" '
  $k[0].hooks // {} | to_entries[] | .key as $event | .value[] as $group | $group.hooks[] as $hook
  | select(
      [ $m[0].hooks[$event][]? | select((.matcher // "") == ($group.matcher // "")) | .hooks[]? ]
      | any(. == $hook) | not)
  | "  \($event), matcher \"\($group.matcher // "")\": \($hook.command | .[0:70])..."')"

if [[ -n "$missing" ]]; then
  echo "claude-settings-in-sync: these kit hooks are missing or edited in .claude/settings.json:" >&2
  echo "$missing" >&2
  echo "$fix" >&2
  exit 1
fi
exit 0
