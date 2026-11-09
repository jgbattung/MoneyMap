#!/usr/bin/env bash
# Fails unless the backup recipient file holds exactly one age public key.
# Runs first in the nightly workflow, before anything connects to anything,
# so the placeholder that ships in the repo can never produce a backup.
#
# Usage: check-recipient.sh [recipient-file]   (default .github/backup-recipient.txt)
set -euo pipefail
# Byte-wise character ranges: in a UTF-8 locale [a-z] can also match uppercase.
export LC_ALL=C

file="${1:-.github/backup-recipient.txt}"

if [ ! -f "$file" ]; then
  echo "check-recipient: recipient file not found: $file" >&2
  exit 1
fi

lines=()
while IFS= read -r line || [ -n "$line" ]; do
  lines+=("$line")
done < "$file"

if [ "${#lines[@]}" -ne 1 ]; then
  echo "check-recipient: expected exactly one line in $file, found ${#lines[@]}" >&2
  exit 1
fi

if [ "${lines[0]}" = "REPLACE_WITH_AGE_PUBLIC_KEY" ]; then
  echo "check-recipient: $file still holds the placeholder. Put your age public key in it (see README, Backups)." >&2
  exit 1
fi

if ! [[ "${lines[0]}" =~ ^age1[0-9a-z]{58}$ ]]; then
  echo "check-recipient: $file does not hold a valid age public key (expected age1 followed by 58 lowercase letters or digits)" >&2
  exit 1
fi

echo "check-recipient: ok"
