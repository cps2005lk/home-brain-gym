#!/usr/bin/env bash
# Starts as root only to close the network, then runs everything else as the
# unprivileged "node" user.
set -euo pipefail
/usr/local/bin/firewall.sh
exec gosu node "$@"
