#!/usr/bin/env bash
# coverage-badge.sh — Run tests and generate a shields.io coverage badge URL
# Usage: bash agent/scripts/coverage-badge.sh
# Apache 2.0 — Copyright 2026 Danish A G

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$AGENT_DIR"

echo "Running tests..."
TEST_OUTPUT=$(npx vitest run --reporter=verbose 2>&1) || true

# Extract test counts from vitest output
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -oP 'Tests\s+\K\d+(?=\s+passed)' || echo "0")
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?=\s+failed)' || echo "0")
SUITE_COUNT=$(echo "$TEST_OUTPUT" | grep -oP 'Test Suites\s+\K\d+(?=\s+passed)' || echo "0")

TOTAL=$((PASS_COUNT + FAIL_COUNT))

# Determine badge color
if [ "$FAIL_COUNT" -eq 0 ]; then
  COLOR="brightgreen"
  STATUS="${PASS_COUNT}%20passing"
else
  COLOR="red"
  STATUS="${PASS_COUNT}%20passing%2C%20${FAIL_COUNT}%20failing"
fi

BADGE_URL="https://img.shields.io/badge/tests-${STATUS}-${COLOR}?style=flat-square"
SUITES_BADGE="https://img.shields.io/badge/suites-${SUITE_COUNT}-blue?style=flat-square"

echo ""
echo "==============================="
echo "  Test Coverage Summary"
echo "==============================="
echo "  Tests passed:  $PASS_COUNT"
echo "  Tests failed:  $FAIL_COUNT"
echo "  Total tests:   $TOTAL"
echo "  Test suites:   $SUITE_COUNT"
echo "==============================="
echo ""
echo "Badge URLs:"
echo "  Tests:  $BADGE_URL"
echo "  Suites: $SUITES_BADGE"
echo ""
echo "Markdown:"
echo "  [![Tests]($BADGE_URL)](https://github.com/agdanish/aerofyta)"
echo "  [![Suites]($SUITES_BADGE)](https://github.com/agdanish/aerofyta)"
