#!/usr/bin/env bash
# Runs the unit + integration tests together (so -coverpkg attributes store
# coverage from the integration package) and prints a per-package table.
# In CI it also appends it to the job summary. Report-only - the summary
# never fails the run, only a test failure does.
set -euo pipefail

cd "$(dirname "$0")/.."

go test -tags=integration -coverpkg=./internal/... -coverprofile=coverage.out ./... "$@"

func=$(go tool cover -func=coverage.out)
packages=$(echo "$func" | awk '
  /^total:/ { next }
  { pkg = $1; sub(/\/[^/]+\.go:.*/, "", pkg); sub(/.*\/profile\//, "", pkg); cov[pkg] += $3 + 0; n[pkg]++ }
  END { for (p in cov) printf "  %-22s %6.1f%%\n", p, cov[p] / n[p] }' | sort)
total=$(echo "$func" | awk '/^total:/ { print $NF }')

out=$(printf '%s\n  %s\n  %-22s %7s' "$packages" "----------------------------" "total" "$total")

printf '\nCoverage (unit + integration)\n\n%s\n' "$out"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  printf '### Coverage (unit + integration)\n\n```\n%s\n```\n' "$out" \
    >> "$GITHUB_STEP_SUMMARY"
fi
