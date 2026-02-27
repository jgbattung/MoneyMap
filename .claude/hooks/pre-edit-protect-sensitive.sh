#!/bin/bash
# pre-edit-protect-sensitive.sh — PreToolUse > Write/Edit
# Blocks edits to .env files, private keys, and credential files.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).tool_input?.file_path??'')}catch(e){}})")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Block .env files (.env, .env.local, .env.production, etc.)
if echo "$FILE_PATH" | grep -qE '(^|[/\\])\.env($|\.)'; then
  echo "BLOCKED: Editing .env files is not allowed. Ask the user to make changes manually." >&2
  exit 2
fi

# Block private key and certificate files
if echo "$FILE_PATH" | grep -qE '\.(pem|key|p12|pfx|crt|cer)$|id_rsa|id_ed25519|id_ecdsa'; then
  echo "BLOCKED: Editing private key or certificate files is not allowed." >&2
  exit 2
fi

# Block common credential/secret config files
if echo "$FILE_PATH" | grep -qiE '(^|[/\\])(secrets?|credentials?)(\.json|\.yaml|\.yml|\.toml|\.env)?$'; then
  echo "BLOCKED: Editing credential or secret files is not allowed." >&2
  exit 2
fi

# Block .npmrc and .netrc (can contain auth tokens)
if echo "$FILE_PATH" | grep -qE '(^|[/\\])\.(npmrc|netrc)$'; then
  echo "BLOCKED: Editing .npmrc/.netrc is not allowed as they may contain auth tokens." >&2
  exit 2
fi

exit 0
