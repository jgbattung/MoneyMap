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

1. **Detailed specs** in `/docs/` with clear objectives, implementation steps, and verification plans.
2. **Task checklists** (`-tasks.md`) with actionable items Claude Code can check off.
3. **Updated `CLAUDE.md`** with pointers to new specs under `## Key Docs`.

## What You Expect from Claude Code

1. Claude Code reads the full spec before writing any code.
2. Claude Code checks off task items and notes which files were modified.
3. Claude Code does not make architectural decisions outside the spec — if something is ambiguous, it asks.

## Reviewing Claude Code's Work

When you return to review after Claude Code has executed:
1. Check the task file for completion status and file modification notes.
2. Review the git log for commits related to the spec.
3. Flag any deviations from the spec for discussion.
