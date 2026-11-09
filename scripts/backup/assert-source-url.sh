#!/usr/bin/env bash
# Positively asserts that BACKUP_DATABASE_URL is exactly the read-only backup
# login on a Supabase Session pooler, and nothing else. A pasted URL for the
# wrong user, host, port or database fails here before any connection is made.
#
# The URL is read from the environment, never from argv, and is never printed.
# On failure only the NAME of the failed check is printed.
set -euo pipefail
# Byte-wise character ranges: in a UTF-8 locale [a-z] can also match uppercase.
export LC_ALL=C

fail() {
  echo "assert-source-url: check failed: $1" >&2
  exit 1
}

url="${BACKUP_DATABASE_URL:-}"
[ -n "$url" ] || fail "BACKUP_DATABASE_URL is empty"

generic='^([A-Za-z][A-Za-z0-9+.-]*)://([^:@/?#]*)(:[^@/?#]*)?@([^:/?#]*)(:[0-9]*)?(/[^?#]*)?(\?.*)?$'
[[ "$url" =~ $generic ]] || fail "url shape (scheme://user:password@host:port/db)"

scheme="${BASH_REMATCH[1]}"
user="${BASH_REMATCH[2]}"
password="${BASH_REMATCH[3]}"
host="${BASH_REMATCH[4]}"
port="${BASH_REMATCH[5]}"
path="${BASH_REMATCH[6]}"
query="${BASH_REMATCH[7]}"

[[ "$scheme" =~ ^(postgres|postgresql)$ ]] || fail "scheme"
[[ "$user" =~ ^moneymap_readonly\.[a-z0-9]{10,40}$ ]] || fail "user (must be moneymap_readonly.<project-ref>)"
[[ "$password" =~ ^:[A-Za-z0-9._~%-]+$ ]] || fail "password (missing, or characters outside A-Za-z0-9._~%-)"
[[ "$host" =~ ^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$ ]] || fail "host (must be the Session pooler aws-<n>-<region>.pooler.supabase.com)"
[ "$port" = ":5432" ] || fail "port (must be 5432, the Session pooler)"
[ "$path" = "/postgres" ] || fail "database (must be postgres)"
if [ -n "$query" ] && [ "$query" != "?sslmode=require" ]; then
  fail "query (only ?sslmode=require is allowed)"
fi

# In GitHub Actions only the whole secret is masked automatically, not its
# parts. The repo is public, so mask the project ref and host too: a failed
# login prints them in libpq error messages.
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  echo "::add-mask::${user#moneymap_readonly.}"
  echo "::add-mask::$host"
fi

echo "assert-source-url: ok"
