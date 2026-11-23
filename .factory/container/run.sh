#!/usr/bin/env bash
# Starts the factory's agent box (a Docker container) from your Mac.
#
# Usage: run.sh build              build the image
#        run.sh probe owner/repo   prove the box (forbidden blocked, the job works)
#        run.sh login              log Claude Code in, inside the box (once)
#        run.sh shell              a shell inside the box, for looking around
#        run.sh outbox             copy unpushed work (git bundles) to ./outbox/
#        run.sh task owner/repo branch "PR title" < prompt
#                                   one agent task: clone, implement, check, push, draft PR
#
# The agent's GitHub token comes from the Mac keychain (item
# "factory-agents-gh") and is handed over as an environment variable, never
# written to a file. Claude Code's login is kept in the Docker volume
# "factory-agent-home", not on the Mac.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
image="factory-agent:0.1"
box=(--rm --cap-add NET_ADMIN --cap-add NET_RAW -e GH_TOKEN -v factory-agent-home:/home/node)
token() { security find-generic-password -a "$USER" -s factory-agents-gh -w; }

case "${1:-}" in
  build) docker build -t "$image" "$here" ;;
  probe) GH_TOKEN="$(token)" docker run "${box[@]}" -e PROBE_REPO="${2:?usage: run.sh probe owner/repo}" "$image" probe.sh ;;
  login) docker run -it "${box[@]}" "$image" claude ;;
  task) GH_TOKEN="$(token)" docker run -i "${box[@]}" -e GIT_NAME="$(git config user.name)" -e GIT_EMAIL="$(git config user.email)" \
          -e TASK_TITLE="${4:?usage: run.sh task owner/repo branch title < prompt}" "$image" agent-task.sh "$2" "$3" ;;
  outbox) mkdir -p ./outbox && docker run --rm -v factory-agent-home:/home/node --entrypoint sh "$image" -c 'cd /home/node/outbox 2>/dev/null && tar -cf - *.bundle 2>/dev/null' | tar -xf - -C ./outbox && ls ./outbox ;;
  shell) GH_TOKEN="$(token)" docker run -it "${box[@]}" "$image" bash ;;
  *) sed -n 2,16p "$0"; exit 2 ;;
esac
