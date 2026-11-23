#!/usr/bin/env bash
# Tries what an agent must NOT be able to do, and what it must still do, from
# inside the agent's environment. Prints only BLOCKED / REACHABLE per probe:
# never the content of a secret.
#
# Usage: isolation-probe.sh            inside the box: forbidden must be BLOCKED
#        isolation-probe.sh --control  outside the box: forbidden must be REACHABLE
# Run both, from the project folder. Only the pair proves isolation: the control
# shows each secret exists and that the probe can see it; the box run shows the
# box hides it. A probe that is blocked in both runs proves nothing. Never skip:
# inside a good box a denied file can even look missing.
# Exit:  0 = every probe as expected for this mode
#        1 = something forbidden is reachable in the box (or hidden outside it),
#            or something the agent needs is blocked

set -u
fails=0
forbidden=BLOCKED
[[ "${1:-}" == "--control" ]] && forbidden=REACHABLE && echo "Control run (outside the box): forbidden things must be REACHABLE."
tmp_out="${TMPDIR:-/tmp}"

expect() { # name, wanted (BLOCKED or REACHABLE), command...
  local name="$1" want="$2"; shift 2
  if "$@" >/dev/null 2>&1; then got=REACHABLE; else got=BLOCKED; fi
  if [[ "$got" == "$want" ]]; then echo "ok    $name: $got"; else echo "FAIL  $name: $got (want $want)"; fails=$((fails + 1)); fi
}
readable() { cat "$1" >/dev/null; }

# Must be blocked: secrets
expect "read the project's .env.local" "$forbidden" readable .env.local
expect "read the GitHub CLI config" "$forbidden" ls "$HOME/.config/gh"
expect "get the GitHub login token" "$forbidden" gh auth token
keychain() { command -v security >/dev/null && security find-generic-password -s "gh:github.com" -w >/dev/null; }
if command -v security >/dev/null; then
  expect "read a login from the macOS keychain" "$forbidden" keychain
else
  echo "ok    read a login from the macOS keychain: BLOCKED (no keychain here)"
fi

# Must be blocked: the network and writing outside the project
expect "reach an unknown website" "$forbidden" curl -sS -m 8 -o /dev/null https://example.com
expect "reach the GitHub API" "$forbidden" curl -sS -m 8 -o /dev/null https://api.github.com
probe="$HOME/.isolation-probe-$$"
expect "write in the home folder" "$forbidden" touch "$probe"; rm -f "$probe" 2>/dev/null

# Must still work: the agent's real job
expect "write inside the project" REACHABLE sh -c 'touch .isolation-probe && rm .isolation-probe'
expect "run a local program" REACHABLE git status --short

echo
if [[ $fails != 0 ]]; then echo "$fails probe(s) not as expected."; exit 1; fi
if [[ $forbidden == REACHABLE ]]; then echo "Control as expected: every forbidden thing is reachable here, so a box run can prove something."; else echo "Isolation holds."; fi
