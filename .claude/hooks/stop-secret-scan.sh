#!/usr/bin/env bash
# stop-secret-scan.sh
# Runs at session end to warn if any secret-like patterns were written to tracked files.
# Non-blocking — exits 0 always, only prints warnings.

SECRET_PATTERNS=(
  "sk-[a-zA-Z0-9]"
  "DATABASE_URL"
  "NEXTAUTH_SECRET"
  "BETTER_AUTH_SECRET"
)

FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  # Only scan staged/modified files, not the whole repo
  MATCHES=$(git diff --name-only 2>/dev/null | xargs grep -li "$pattern" 2>/dev/null)
  if [[ -n "$MATCHES" ]]; then
    echo "WARNING: Possible secret pattern '$pattern' found in: $MATCHES" >&2
    FOUND=1
  fi
done

if [[ "$FOUND" -eq 1 ]]; then
  echo "Review the above files before committing." >&2
fi

exit 0
