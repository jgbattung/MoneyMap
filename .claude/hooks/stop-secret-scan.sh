#!/bin/bash
# stop-secret-scan.sh — Stop event
# Scans git-changed files for common secret/API key patterns.
# Exits 2 (blocks Stop + warns Claude) if anything suspicious is found.

CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
ALL_FILES=$(printf "%s\n%s" "$CHANGED_FILES" "$STAGED_FILES" | sort -u | grep -v '^$')

if [ -z "$ALL_FILES" ]; then
  exit 0
fi

FOUND=0
WARNINGS=""

# Patterns to scan for
declare -A PATTERNS
PATTERNS["AWS Access Key"]='AKIA[0-9A-Z]{16}'
PATTERNS["OpenAI/Anthropic Key"]='sk-[A-Za-z0-9]{32,}'
PATTERNS["Private Key Header"]='-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'
PATTERNS["Generic API Key"]='[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]\s*=\s*["\x27][A-Za-z0-9_\-]{20,}'
PATTERNS["Hardcoded Password"]='[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]\s*=\s*["\x27][^\s"]{8,}["\x27]'
PATTERNS["JWT Token"]='eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
PATTERNS["Database URL with credentials"]='(postgres|mysql|mongodb)://[^:]+:[^@]+@'

while IFS= read -r file; do
  [ -f "$file" ] || continue
  # Skip binary files, lock files, and node_modules
  echo "$file" | grep -qE '(package-lock\.json|yarn\.lock|\.lock$|node_modules/)' && continue

  for label in "${!PATTERNS[@]}"; do
    pattern="${PATTERNS[$label]}"
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n  - ${file} (${label})"
      FOUND=1
    fi
  done
done <<< "$ALL_FILES"

if [ "$FOUND" -eq 1 ]; then
  printf "SECRET SCAN WARNING: Possible secrets detected in changed files:%b\n\nReview these files and ensure no real secrets are exposed before committing." "$WARNINGS" >&2
  exit 2
fi

exit 0
