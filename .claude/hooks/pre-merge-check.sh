#!/usr/bin/env bash
# pre-merge-check.sh
# Runs lint, build, and full test suite before Claude creates a PR.
# Triggered by the PreToolUse hook when CLAUDE_TOOL_INPUT_COMMAND contains "gh pr create".
# Exit 0 → allow. Exit 2 → block and return output to Claude as feedback.

COMMAND="${CLAUDE_TOOL_INPUT_COMMAND:-}"

# Only run for PR creation commands
if ! echo "$COMMAND" | grep -qi "gh pr create"; then
  exit 0
fi

# Run from the git root so npm commands resolve correctly
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT" || exit 1

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            PRE-MERGE VALIDATION GATE RUNNING              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASS=true

# ── Step 1: Lint ────────────────────────────────────────────────
echo "▶ [1/3] Lint..."
if npm run lint 2>&1; then
  echo "✓ Lint: PASS"
else
  echo "✗ Lint: FAIL"
  PASS=false
fi
echo ""

# ── Step 2: Build ───────────────────────────────────────────────
echo "▶ [2/3] Build..."
if npm run build 2>&1; then
  echo "✓ Build: PASS"
else
  echo "✗ Build: FAIL"
  PASS=false
fi
echo ""

# ── Step 3: Full test suite ─────────────────────────────────────
echo "▶ [3/3] Tests..."
if npx vitest run 2>&1; then
  echo "✓ Tests: PASS"
else
  echo "✗ Tests: FAIL"
  PASS=false
fi
echo ""

# ── Result ──────────────────────────────────────────────────────
if [ "$PASS" = true ]; then
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   ✓  ALL CHECKS PASSED — branch is ready to merge         ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  exit 0
else
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   ✗  PRE-MERGE FAILED — fix all errors before merging     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Fix the failing checks above, then retry 'gh pr create'."
  exit 2
fi
