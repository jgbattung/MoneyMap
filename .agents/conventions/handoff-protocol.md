# Handoff Protocol

> Shared conventions for the Gemini (Architect) and Claude Code (Builder) collaboration.
> Both agents must reference this file for spec format, tracking, and Definition of Done.

## Roles

- **Gemini (Architect):** Research, planning, UI/UX design, architecture decisions. Produces specification files. Does NOT write executable source code.
- **Claude Code (Builder):** Executes specs, writes code, runs tests, and reports back. Does NOT make unilateral architectural decisions outside the spec.

## Specification Format

All specs produced by Gemini must be saved in `/docs/` as Markdown files and follow this naming convention:

- `/docs/[feature]-spec.md` — Feature or design specification
- `/docs/[feature]-tasks.md` — Actionable task checklist for Claude Code
- `/docs/architecture-spec.md` — System-wide architectural decisions

Specs must be **highly detailed, perfectly structured in Markdown, and unambiguous** so Claude Code can execute without guesswork.

## Definition of Done (Specs)

A specification is not complete until it includes all of the following:

1. **Clear Objectives & Scope** — What is being solved, and what is explicitly *out* of scope.
2. **Actionable Implementation Steps** — A breakdown of the exact changes Claude Code needs to make.
3. **Verification/Test Plan** — Explicit instructions on how to verify the work (e.g., "write a unit test for X", "verify the API returns 200").
4. **Contextual Pointers** — References to related specs or design standards (e.g., linking to `design-spec.md` for UI tasks) to avoid duplicating information.

## Task Tracking & Execution

When Gemini produces a task list (`-tasks.md`), it must use actionable checklists:

```markdown
- [ ] Task description
```

When Claude Code executes a spec or task list:

1. **Read the full spec** before writing any code.
2. **Check off items** as they are completed: `- [x] Task description`.
3. **Add brief notes** about which files were modified next to each completed item.
4. **Do not skip items** — if a task is blocked, leave it unchecked and note the blocker.

This allows Gemini to quickly catch up on execution progress when it resumes planning.

## Key Docs Management

When Gemini creates a new spec file, it must also add a reference to it under the `## Key Docs` section in `CLAUDE.md`. If that section does not exist, Gemini must create it.

## Archiving Completed Specs

When a feature is fully implemented and verified, move its spec and task files from `/docs/` to `/docs/archive/`. Do not delete specs — archived specs serve as historical context for future planning.
