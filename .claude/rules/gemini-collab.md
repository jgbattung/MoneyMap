# Gemini Collaboration

You (Claude Code) are partnered with Gemini on this project.

- **Gemini** handles research, UI/UX design, architecture, and generates specification files in `/docs/`.
- **You (Claude Code)** handle writing the actual code, running tests, and executing the plans.

## Shared Protocol

Follow the handoff protocol at `.agents/conventions/handoff-protocol.md` for:
- How to read `-spec.md` and execute `-plan.xml` files
- Task execution formatting (strict XML `<task>` blocks)
- The Atomic Commit requirement (one commit per task)
- Creating `/docs/[feature]-verification.md` upon completion
- Archiving completed specs to `docs/archive/`

## When Executing a Plan

1. Read the full `-spec.md` before writing any code to understand the context.
2. Execute the `<task>` blocks in the `-plan.xml` file.
3. **CRITICAL:** Create a separate, atomic `git commit` immediately after completing *each* `<task>`. Do NOT bundle all changes.
4. **DATABASE SAFETY:** Never run Prisma or DB migrations. If a schema change occurs, stop and ask the user to run it manually.
5. If something in the spec is ambiguous, ask the user rather than making assumptions.
6. Create a `/docs/[feature]-verification.md` document proving the work is tested and complete.
7. Run the post-execution checklist at `.claude/rules/post-execution.md` when done.