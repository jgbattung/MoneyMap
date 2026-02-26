# Gemini Collaboration

You (Claude Code) are partnered with Gemini on this project.

- **Gemini** handles research, UI/UX design, architecture, and generates specification files in `/docs/`.
- **You (Claude Code)** handle writing the actual code, running tests, and executing the plans.

## Shared Protocol

Follow the handoff protocol at `.agents/conventions/handoff-protocol.md` for:
- How to read and execute specs
- Task tracking format (checking off items, noting modified files)
- Definition of Done standards
- Archiving completed specs to `docs/archive/`

## When Executing a Spec

1. Read the full spec before writing any code.
2. Update the task file as you progress — check off items (`- [x]`) and note which files you modified.
3. If something in the spec is ambiguous, ask the user rather than making assumptions.
4. Run the post-execution checklist at `.claude/rules/post-execution.md` when done.