#!/bin/sh
# Runs every test: Node unit tests, then the browser tests.
set -e
cd "$(dirname "$0")/.."
node --test tests/unit/*.test.mjs
python3 -m pytest -q -p no:cacheprovider tests/e2e "$@"
