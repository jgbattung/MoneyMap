# Execution Rules

> How the Builder executes plans produced by the Architect.

## Workflow

Follow the handoff protocol at `.claude/conventions/handoff-protocol.md`:

1. **Read the full `-spec.md`** before writing any code to understand the context.
2. **Execute `-plan.xml` tasks atomically** — one commit per task, immediately after verification passes.
3. **One commit per task** — never bundle multiple tasks into one commit.
4. **Database Safety** — Never run Prisma migrations or any DB commands automatically. If a task requires a schema change, stop and ask the user to run it manually.
5. **Create `-verification.md`** upon completion — document what was done and how it was verified.
6. **Ask, don't assume** — If something in the spec is ambiguous, ask the user rather than making assumptions.