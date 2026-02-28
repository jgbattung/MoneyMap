#!/usr/bin/env bash
# pre-bash-guard.sh
# Blocks dangerous database commands before they execute.
# Reads the command from CLAUDE_TOOL_INPUT_COMMAND env var (set by Claude Code).

COMMAND="${CLAUDE_TOOL_INPUT_COMMAND:-}"

# Patterns that are unconditionally blocked
BLOCKED_PATTERNS=(
  "prisma migrate"
  "prisma db push"
  "prisma db seed"
  "prisma db reset"
  "prisma migrate dev"
  "prisma migrate deploy"
  "prisma migrate reset"
  "prisma migrate resolve"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo "BLOCKED: '$pattern' is a destructive database command." >&2
    echo "There is no test database — this would affect the live production database." >&2
    echo "Run this command manually in your terminal after confirming it is safe." >&2
    exit 1
  fi
done

exit 0
