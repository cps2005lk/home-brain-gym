#!/usr/bin/env bash
# Brain Gym's checks: everything that must pass before code leaves this machine.
# The factory's pre-push hook runs this file; you can also run it by hand.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run -s build          # type-check + production build
npm test --silent         # unit, component and characterization tests
npm run -s lint           # oxlint
npm run -s format:check   # Prettier
.factory/guardrails/checks/no-claude-md.sh .
