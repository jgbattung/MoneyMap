# Task Completion Checklist

After completing any implementation task:

1. **Lint** — `npm run lint` — fix all errors
2. **Build** — `npm run build` — must pass with zero errors
3. **Tests** — `npx vitest run` for unit tests; spawn qa-pipeline agent for new/changed files
4. **Update plan** — check off completed `<task>` items in the active `[feature]-plan.xml`
5. **Verification doc** — create `docs/[feature]-verification.md` proving work is tested and complete
6. **Commit** — wait for user to request a commit; follow commit conventions
7. **Pre-merge** — run `/pre-merge` skill before creating a PR

## Database Warning
NEVER run Prisma migration commands automatically. If a schema change is needed:
- Stop and tell the user: "This requires a migration. Please run `npx prisma migrate dev --name <name>` manually."
- Wait for user confirmation before proceeding.
