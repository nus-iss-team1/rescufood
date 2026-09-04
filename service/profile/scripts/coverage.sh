#!/usr/bin/env bash
# Runs the unit + integration tests together (so -coverpkg attributes store
# coverage from the integration package) and prints a Markdown summary.
# In CI it also appends to the job summary. Report-only - the summary never
# fails the run, only a test failure does.
set -euo pipefail

cd "$(dirname "$0")/.."

go test -tags=integration -coverpkg=./internal/... -coverprofile=coverage.out ./... "$@"

report() {
  local func
  func=$(go tool cover -func=coverage.out)
  echo '### Coverage (unit + integration)'
  echo
  echo '| Package | % |'
  echo '|---|---|'
  echo "$func" | awk '
    /^total:/ { next }
    { pkg = $1; sub(/\/[^/]+\.go:.*/, "", pkg); sub(/.*\/profile\//, "", pkg); c[pkg] += $3 + 0; n[pkg]++ }
    END { for (p in c) printf "| %s | %.1f%% |\n", p, c[p] / n[p] }' | sort
  echo
  echo "**Total:** $(echo "$func" | awk '/^total:/ { print $NF }')"
}

report 2>&1 | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}" || true
