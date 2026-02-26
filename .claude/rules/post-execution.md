# Post-Execution Checklist

> Run through this checklist after completing any spec execution or significant code change.

## Steps

1. **Lint** — Run `npm run lint` and fix any errors.
2. **Build** — Run `npm run build` and ensure zero errors.
3. **Update task file** — Check off completed items in the relevant `/docs/*-tasks.md` file and note which files were modified.
4. **Update Key Docs** — If new files or patterns were introduced, ensure `CLAUDE.md` references them if relevant.
5. **Commit** — Follow the conventions in `.agents/conventions/commit-conventions.md`. Wait for user to request a commit before committing.