#!/usr/bin/env bash
# Fails when the current branch is main or master.
#
# Why: in many projects a push to main goes live. Work happens on a branch
# and reaches main through a reviewed pull request.
#
# Usage: no-commit-on-main.sh            (run inside the repository)
# Exit:  0 = on another branch (or detached HEAD), 1 = on main, 2 = not a git repo

set -uo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "no-commit-on-main: not inside a git repository" >&2
  exit 2
fi

# Empty when HEAD is detached (for example during a rebase): allowed.
branch="$(git symbolic-ref --quiet --short HEAD)"

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "no-commit-on-main: you are on '$branch'. Make a branch first:" >&2
  echo "  git switch -c <short-name>" >&2
  exit 1
fi
