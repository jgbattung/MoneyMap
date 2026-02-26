# Proposal: Agent Directory Structure

> **Status:** Executed — Migration complete.
> **Date:** 2026-02-26
> **Purpose:** Establish a clean, modular directory layout that makes ownership, shared resources, and handoff conventions obvious for the Claude Code + Gemini collaboration.

---

## 1. Problem

Right now rules, skills, and collaboration protocols are scattered:

- `CLAUDE.md` and `.gemini_rules` are growing into monolithic files.
- Handoff rules are duplicated (`.gemini_rules` "Project Management & Handoff Protocol" section AND `.claude/rules/gemini-collab.md`).
- `.agents/workflows/` exists but its relationship to each agent's own config is unclear.
- There is no dedicated home for Gemini's modular rules/skills (everything lives in the flat `.gemini_rules` file).

## 2. Proposed Directory Tree

```
money-map/
│
│  ── Root files (lightweight routers only) ──
├── CLAUDE.md                        # Quick-reference commands/architecture + pointers to .claude/ and .agents/
├── .gemini_rules                    # Brief identity + pointers to .gemini/ and .agents/
│
│  ── Claude Code exclusive ──
├── .claude/
│   ├── rules/
│   │   ├── persona.md               # Claude's identity, tone, coding standards
│   │   ├── gemini-collab.md         # How Claude interacts with Gemini (exists, will be trimmed)
│   │   └── post-execution.md        # Post-build checklist (lint, test, commit conventions)
│   └── skills/
│       └── ...                      # Claude-only skills (future)
│
│  ── Gemini exclusive ──
├── .gemini/
│   ├── rules/
│   │   ├── persona.md               # Gemini's identity, tone, planning style
│   │   ├── claude-collab.md         # How Gemini interacts with Claude
│   │   └── research.md              # Research methodology, source standards, depth requirements
│   └── skills/
│       └── ui-ux-designer.md        # Gemini's UI/UX design skill
│
│  ── Shared between both agents ──
├── .agents/
│   ├── workflows/
│   │   ├── design.md                # /design workflow (exists)
│   │   ├── feature.md               # Full feature lifecycle: plan → spec → build → verify
│   │   └── bugfix.md                # Bug triage and fix workflow (future)
│   └── conventions/
│       ├── handoff-protocol.md      # Spec format, checklist rules, tracking, Definition of Done
│       └── tech-stack.md            # Shared source of truth on stack & coding patterns
│
│  ── Handoff folder (active specs & tasks) ──
└── docs/
    ├── design-spec.md               # Example spec
    ├── architecture-spec.md         # Example spec
    └── tasks.md                     # Active task checklist
```

## 3. Design Principles

### 3.1 Ownership is directory-based

| Directory | Owner | Purpose |
|-----------|-------|---------|
| `.claude/` | Claude Code | Rules, skills, and config that only Claude reads |
| `.gemini/` | Gemini | Rules, skills, and config that only Gemini reads |
| `.agents/` | Both | Shared workflows and conventions both agents reference |
| `docs/` | Both | Handoff inbox for active specs and task lists |

No agent should write to the other's directory. Both agents read from `.agents/` and `docs/`.

### 3.2 Root files become lightweight routers

**`CLAUDE.md`** keeps its quick-reference sections (Commands, Architecture) but delegates behavioral rules:

```markdown
## Agent Rules
See `.claude/rules/` for behavioral rules and persona.
See `.agents/conventions/` for shared conventions.
See `.agents/workflows/` for cross-agent workflows.
```

**`.gemini_rules`** becomes a brief identity statement with pointers:

```markdown
You are the Project Manager and UI/UX Designer for Money Map.

## Rules & Persona
See `.gemini/rules/persona.md`

## Collaboration Protocol
See `.agents/conventions/handoff-protocol.md`

## Skills
See `.gemini/skills/`

## Workflows
See `.agents/workflows/`
```

### 3.3 Single source of truth for shared protocols

The handoff protocol (spec format, checklist conventions, Definition of Done, tracking rules) currently exists in two places. It will be consolidated into **`.agents/conventions/handoff-protocol.md`** and referenced by both agents' collab rules.

### 3.4 `docs/` stays flat and purpose-driven

`docs/` is a handoff inbox for active work, not a permanent archive. Specs live here during development. Both agents read and write to it.

## 4. Migration Plan

### What moves where

| Current location | Destination | Action |
|---|---|---|
| `.gemini_rules` — persona/identity content | `.gemini/rules/persona.md` | Extract |
| `.gemini_rules` — research rules | `.gemini/rules/research.md` | Extract |
| `.gemini_rules` — handoff/DoD sections | `.agents/conventions/handoff-protocol.md` | Extract & deduplicate |
| `.gemini_rules` — Claude interaction rules | `.gemini/rules/claude-collab.md` | Extract |
| `.gemini_rules` (root file) | `.gemini_rules` | Slim down to router |
| `.claude/rules/gemini-collab.md` | `.claude/rules/gemini-collab.md` | Trim; reference shared `handoff-protocol.md` |
| `.agents/workflows/design.md` | `.agents/workflows/design.md` | No change (already in place) |
| `CLAUDE.md` | `CLAUDE.md` | Add router pointers, keep commands/architecture |
| Tech stack info (in `.gemini_rules`) | `.agents/conventions/tech-stack.md` | Extract shared truth |

### New files to create

| File | Content source |
|---|---|
| `.gemini/rules/persona.md` | Extracted from `.gemini_rules` identity/tone sections |
| `.gemini/rules/claude-collab.md` | Extracted from `.gemini_rules` Claude interaction rules |
| `.gemini/rules/research.md` | Extracted from `.gemini_rules` research section |
| `.gemini/skills/ui-ux-designer.md` | New or moved from `.agents/` if Gemini-only |
| `.agents/conventions/handoff-protocol.md` | Merged from `.gemini_rules` DoD/handoff + `.claude/rules/gemini-collab.md` shared parts |
| `.agents/conventions/tech-stack.md` | Extracted from `.gemini_rules` tech stack reference section |
| `.claude/rules/persona.md` | New — Claude's coding style and behavioral rules |
| `.claude/rules/post-execution.md` | New — lint/test/commit checklist |

## 5. Resolved Questions

- [x] **Workflows reference specific skill paths** — Yes. `.agents/workflows/design.md` now references `.gemini/skills/ui-ux-designer.md` directly.
- [x] **Shared commit conventions** — Yes. Created `.agents/conventions/commit-conventions.md`.
- [x] **Archiving completed specs** — Completed specs move to `docs/archive/` (not deleted) for historical context.

## 6. Migration Log

- [x] Both agents reviewed and approved the proposal.
- [x] Human approved the final structure.
- [x] Claude Code executed the migration.
- [ ] Gemini verifies its files are readable and correctly referenced.