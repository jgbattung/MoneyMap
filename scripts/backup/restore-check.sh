#!/usr/bin/env bash
# Proves a dump restores: restores it into a throwaway Postgres of the same
# major version and writes per-table row counts (tab separated, counts only)
# to the output file. Fails if the restore errors, if no tables came back, or
# if _prisma_migrations is missing or empty. The container is always removed.
#
# Usage: restore-check.sh <dump-path> <pg-major> <out-tsv>
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: restore-check.sh <dump-path> <pg-major> <out-tsv>" >&2
  exit 2
fi

dump="$1"
major="$2"
out="$3"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$major" in
  15 | 16 | 17 | 18) ;;
  *)
    echo "restore-check: unsupported postgres major: $major (allowed: 15 16 17 18)" >&2
    exit 2
    ;;
esac

if [ ! -s "$dump" ]; then
  echo "restore-check: dump is missing or empty" >&2
  exit 1
fi

name="restore-check-$$-$RANDOM"
password="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"

cleanup() {
  docker rm -f "$name" > /dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$name" -e POSTGRES_PASSWORD="$password" "postgres:${major}-alpine" > /dev/null

# The image runs a temporary server on the unix socket during init and then
# restarts. Only the final server listens on TCP, so wait on TCP.
ready=0
for _ in $(seq 1 90); do
  if docker exec "$name" pg_isready -h 127.0.0.1 -U postgres -q; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "restore-check: throwaway postgres did not become ready" >&2
  exit 1
fi

# The dump contains CREATE SCHEMA public. This database is brand new and
# empty, so drop its default public schema to let the restore create it.
docker exec "$name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA public'

docker exec -i "$name" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d postgres < "$dump"

docker exec -i "$name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -tA -F $'\t' < "$here/row-counts.sql" > "$out"

if [ ! -s "$out" ]; then
  echo "restore-check: restore produced no tables" >&2
  exit 1
fi

migrations="$(awk -F '\t' '$1 == "_prisma_migrations" { print $2 }' "$out")"
if [ -z "$migrations" ] || [ "$migrations" -eq 0 ]; then
  echo "restore-check: _prisma_migrations is missing or empty in the restored dump" >&2
  exit 1
fi

echo "restore-check: ok ($(wc -l < "$out" | tr -d ' ') tables)"
