#!/usr/bin/env bash
# Prepares a clean checkout for the review's Red proof (run by the factory's
# review.sh inside each checkout). Git doesn't hold node_modules, and the
# checks need it: a proof must run where the real thing runs.
set -euo pipefail
[[ -e node_modules ]] || ln -s "$REVIEW_ROOT/node_modules" node_modules
