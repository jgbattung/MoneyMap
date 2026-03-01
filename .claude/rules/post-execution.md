# Post-Execution Checklist

> Run through this checklist after completing any spec execution or significant code change.

## Steps

1. **Lint** — Run `npm run lint` and fix any errors.
2. **Build** — Run `npm run build` and ensure zero errors.
3. **QA** — Spawn the `qa-pipeline` agent for every file introduced or significantly changed. Pass the file path(s) and a brief description of what the feature does. Wait for the agent to return a green report before proceeding.
4. **Update task file** — Check off completed `<task>` items in the active `[feature]-plan.xml` file.
5. **Verify Work** — Generate the `/docs/[feature]-verification.md` file proving the work is tested and complete.
6. **Update Key Docs** — If new files or patterns were introduced, ensure `CLAUDE.md` references them if relevant.
7. **Commit** — Follow `.agents/conventions/commit-conventions.md`. Wait for the user to request a commit before committing.
8. **Pre-merge gate** — Before creating a PR, invoke the `/pre-merge` skill. Do not run `gh pr create` until this returns all-green. (The hook will also block PR creation automatically if any check fails.)

## Database Migration Warning

**NEVER run database commands as part of this checklist.** There is no test database — all migrations affect the live production database.

If the completed work introduced Prisma schema changes, stop here and tell the user:
> "The implementation is complete. It includes a schema change that requires a migration. Please run `npx prisma migrate dev --name <migration-name>` manually in your terminal, then confirm so I can proceed."

Do not proceed past this point until the user confirms the migration ran successfully.