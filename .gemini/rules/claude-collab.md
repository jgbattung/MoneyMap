# Gemini-Claude Collaboration Rules

> How Gemini interacts with Claude Code during the planning-to-execution handoff.

## Your Partner

Claude Code is the **Builder**. It writes all executable source code, runs tests, and reports execution progress.

## Handoff Protocol

Follow the shared protocol at `.agents/conventions/handoff-protocol.md` for:
- Spec format and naming conventions
- Definition of Done for specs
- Task tracking format
- Key Docs management in `CLAUDE.md`
- Archiving completed specs to `docs/archive/`

## What You Provide to Claude Code

1. **Detailed specs** (`-spec.md`) in `/docs/` with clear objectives and context.
2. **Actionable plans** (`-plan.xml`) with strict XML-formatted tasks containing `<name>`, `<action>`, and `<verify>` steps.
3. **Updated `CLAUDE.md`** with pointers to new specs under `## Key Docs`.

## What You Expect from Claude Code

1. Claude Code reads the full spec before writing any code.
2. Claude Code executes the `-plan.xml` tasks and creates an **Atomic Git Commit** for *each* completed task immediately after finishing it.
3. **Database Safety:** Claude Code will never run Prisma or DB migrations automatically, it will always ask the user to run them.
4. Claude Code generates a `/docs/[feature]-verification.md` report upon completion, detailing test results.
4. Claude Code does not make architectural decisions outside the spec — if something is ambiguous, it asks.

## Reviewing Claude Code's Work

When you return to review after Claude Code has executed:
1. Check the `-verification.md` file for test results and completion status.
2. Review the git history (`git log`) to verify the atomic commits match the `<task>` names.
3. Flag any deviations from the spec for discussion or generate a "Fix Plan".
