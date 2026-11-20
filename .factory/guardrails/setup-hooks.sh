#!/usr/bin/env bash
# Turns on the factory's git hooks for this clone. Run once per clone:
#   .factory/guardrails/setup-hooks.sh
#
# It copies a small launcher into .git/hooks/ as pre-commit and pre-push.
# It never overwrites a hook it didn't install; it stops and tells you.
#
# Exit: 0 = installed (or already installed), 1 = a different hook is in the
#       way, 2 = not inside a git repository

set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
launcher="$here/git-hooks/launcher"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "setup-hooks: not inside a git repository" >&2
  exit 2
fi

# An older setup used core.hooksPath, which hides .git/hooks/. Remove it.
if [[ -n "$(git config --local core.hooksPath)" ]]; then
  git config --local --unset core.hooksPath
  echo "setup-hooks: removed core.hooksPath (the launcher replaces it)"
fi

hooks_dir="$(git rev-parse --git-common-dir)/hooks"
mkdir -p "$hooks_dir"

for name in pre-commit pre-push; do
  target="$hooks_dir/$name"
  if [[ -e "$target" ]] && ! grep -q "factory-launcher" "$target"; then
    echo "setup-hooks: $target already exists and is not the factory's." >&2
    echo "Look at it, move it away if you don't need it, then run this again." >&2
    exit 1
  fi
done

for name in pre-commit pre-push; do
  cp "$launcher" "$hooks_dir/$name"
  chmod +x "$hooks_dir/$name"
done
echo "setup-hooks: pre-commit and pre-push installed in $hooks_dir"
