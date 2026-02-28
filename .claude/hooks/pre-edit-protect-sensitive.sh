#!/usr/bin/env bash
# pre-edit-protect-sensitive.sh
# Guards against editing sensitive files like .env variants.

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"

BLOCKED_PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  ".env.development"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if [[ "$FILE" == *"$pattern"* ]]; then
    echo "BLOCKED: Editing '$FILE' is not allowed." >&2
    echo "Environment files must be edited manually." >&2
    exit 1
  fi
done

exit 0
