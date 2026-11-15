#!/usr/bin/env bash
# Fails when a push would update or delete main or master on the remote.
#
# Why: pushing to main skips the pull request and, in many projects, deploys.
#
# Usage: called by the pre-push hook, which passes git's lines on stdin:
#   <local-ref> <local-sha> <remote-ref> <remote-sha>
# Exit:  0 = no push to main, 1 = push to main

set -uo pipefail

blocked=0
while read -r _local_ref _local_sha remote_ref _remote_sha; do
  case "$remote_ref" in
    refs/heads/main | refs/heads/master)
      echo "no-push-to-main: pushing to '${remote_ref#refs/heads/}' is not allowed. Push a branch and open a pull request." >&2
      blocked=1
      ;;
  esac
done

exit $blocked
