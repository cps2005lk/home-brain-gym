#!/usr/bin/env bash
# The container version of the isolation probe. Prints only BLOCKED or
# REACHABLE, never a secret.
#
# Usage: probe.sh            inside the box: forbidden must be BLOCKED
#        probe.sh --control  on the host: forbidden must be REACHABLE
# Optional: PROBE_REPO=owner/name also tests the GitHub token's limits.
set -u
fails=0
forbidden=BLOCKED
[[ "${1:-}" == "--control" ]] && forbidden=REACHABLE && echo "Control run (outside the box): forbidden things must be REACHABLE."
expect() {
  local name="$1" want="$2"; shift 2
  if "$@" >/dev/null 2>&1; then got=REACHABLE; else got=BLOCKED; fi
  if [[ "$got" == "$want" ]]; then echo "ok    $name: $got"; else echo "FAIL  $name: $got (want $want)"; fails=$((fails + 1)); fi
}
keychain() { command -v security && security find-generic-password -s "gh:github.com" -w; }
mac_home() { ls /Users/*/Library; }
docker_socket() { [[ -S /var/run/docker.sock ]]; }

# Must be blocked: the Mac and its secrets
expect "read a login from the macOS keychain" "$forbidden" keychain
expect "see the Mac's home folders" "$forbidden" mac_home
expect "reach the Docker engine (a way out of the box)" "$forbidden" docker_socket
expect "reach an unknown website" "$forbidden" curl -sS -m 6 -o /dev/null https://example.com
expect "reach a host not on the list" "$forbidden" curl -sS -m 6 -o /dev/null https://pypi.org

# Must work: the agent's job
expect "reach the GitHub API" REACHABLE curl -sS -m 10 -o /dev/null https://api.github.com
expect "reach the npm registry" REACHABLE curl -sS -m 10 -o /dev/null https://registry.npmjs.org
expect "reach Claude's API" REACHABLE curl -sS -m 10 -o /dev/null https://api.anthropic.com

# The token's limits (same inside and outside: a property of the token)
if [[ -n "${PROBE_REPO:-}" ]]; then
  expect "read the repo with the token" REACHABLE gh api "repos/$PROBE_REPO" --jq .name
  expect "change a repo setting with the token" BLOCKED gh api -X PATCH "repos/$PROBE_REPO" -F delete_branch_on_merge=true
fi

echo
if [[ $fails != 0 ]]; then echo "$fails probe(s) not as expected."; exit 1; fi
if [[ $forbidden == REACHABLE ]]; then echo "Control as expected: the box run can prove something."; else echo "Isolation holds."; fi
