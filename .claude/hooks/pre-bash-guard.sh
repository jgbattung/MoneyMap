#!/bin/bash
# pre-bash-guard.sh — PreToolUse > Bash
# Blocks dangerous bash commands before they execute.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).tool_input?.command??'')}catch(e){}})")

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block catastrophic recursive deletions
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+/|--force\s+/)'; then
  echo "BLOCKED: Recursive deletion from root (rm -rf /) is not allowed." >&2
  exit 2
fi

# Block force-push to protected branches
if echo "$COMMAND" | grep -qE 'git push.*(--force|-f).*(main|master|develop)|(main|master|develop).*(--force|-f)'; then
  echo "BLOCKED: Force-pushing to main/master/develop is not allowed. Ask the user to do this manually if truly needed." >&2
  exit 2
fi

# Block DROP DATABASE
if echo "$COMMAND" | grep -qiE '\bDROP\s+DATABASE\b'; then
  echo "BLOCKED: DROP DATABASE is not allowed." >&2
  exit 2
fi

# Block prisma migrate reset (destructive — wipes all data)
if echo "$COMMAND" | grep -qE 'prisma migrate reset'; then
  echo "BLOCKED: 'prisma migrate reset' wipes all data. Ask the user to run this manually." >&2
  exit 2
fi

exit 0
