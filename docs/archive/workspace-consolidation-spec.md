# Workspace Consolidation — Spec

> Consolidate the dual-AI (Gemini + Claude) workspace into a single all-Claude Code workspace.

---

## Objective

Eliminate the dual-agent architecture where Gemini acts as Architect and Claude Code acts as Builder. Migrate all agents, skills, rules, and conventions into the `.claude/` directory so Claude Code handles every role — planning, building, testing, auditing, and explaining. Remove the `.gemini/` and `.agent/` directories entirely after migration.

## Out of Scope

- Changing any product source code (`src/`, `prisma/`, `public/`, etc.)
- Modifying hooks in `.claude/hooks/`
- Modifying `.claude/settings.json` or `.claude/settings.local.json`
- Changing the `docs/` workflow (spec → plan → verification → archive)
- Changing the XML plan format or commit conventions substance

---

## What Changes

### 1. New Agent: Architect (`.claude/agents/architect.md`)

Create a new Claude Code agent that takes over Gemini's Architect role.

**Identity:** The Architect for Money Map. Responsible for research, analysis, UI/UX design, feature planning, and spec generation. Never writes executable source code — only Markdown specs and XML plans.

**Model:** `claude-opus-4-6` (Opus for planning quality).

**Skills it invokes:**
- `deep-research` — for every planning task
- `design-workflow` + `ui-ux-pro-max` — for any task involving UI/UX design (always together)

**Workflow:**
1. Ask clarifying questions (one at a time)
2. Run deep-research
3. If design task → run design-workflow + ui-ux-pro-max
4. Present findings to user before drafting spec
5. Draft `docs/[feature]-spec.md` (with Handoff Note) + `docs/[feature]-plan.xml`
6. User review before handoff to Builder
7. After Builder + QA finish → conversationally review the `-verification.md`

**Verification role:** After the Builder finishes and the QA agent appends its test results to the verification doc, the user opens a new session with the Architect. The Architect reads the verification doc and does a conversational review (no formal output file — just in-chat feedback on whether things look good or need a fix plan).

**Hard limitation:** NEVER write or modify executable source code. Only create/edit Markdown and XML files in `/docs/`.

### 2. Migrate Skills from `.gemini/` → `.claude/skills/`

#### 2a. `deep-research` skill

Move `.gemini/skills/deep-research/SKILL.md` → `.claude/skills/deep-research/SKILL.md`.

Changes:
- Remove all references to "Gemini" — replace with "the Architect" or neutral phrasing
- Update file path references from `.gemini/` → `.claude/`
- Update `.agent/conventions/` → `.claude/conventions/`
- Adjust web search references to use Claude Code's `WebSearch` tool capabilities
- Keep the quality bar, 5-phase methodology, and output format intact

#### 2b. `design-workflow` skill

Move `.gemini/skills/design-workflow/SKILL.md` → `.claude/skills/design-workflow/SKILL.md`.

Changes:
- Remove "Gemini" references
- Update internal path references from `.gemini/skills/` → `.claude/skills/`
- Update `.agent/conventions/` → `.claude/conventions/`
- Add a note: "This skill must ALWAYS be invoked alongside the `ui-ux-pro-max` skill when the task involves design/UI/UX work."

#### 2c. `ui-ux-pro-max` skill (with data + scripts)

Move the entire `.gemini/skills/ui-ux-pro-max/` directory → `.claude/skills/ui-ux-pro-max/`.

This includes:
- `SKILL.md`
- `scripts/core.py`, `scripts/design_system.py`, `scripts/search.py`
- `data/` directory with all CSV files and `stacks/` subdirectory

Changes to `SKILL.md`:
- Remove any Gemini references
- Update the Python script paths from `skills/ui-ux-pro-max/scripts/search.py` → `.claude/skills/ui-ux-pro-max/scripts/search.py`

Changes to Python scripts:
- `core.py` — `DATA_DIR` uses `Path(__file__).parent.parent / "data"` which is relative, so no changes needed
- `design_system.py` — same, uses relative imports from `core.py`, no changes needed
- `search.py` — same, imports from `core` and `design_system`, no changes needed

### 3. Migrate Conventions from `.agent/` → `.claude/conventions/`

#### 3a. `handoff-protocol.md`

Move `.agent/conventions/handoff-protocol.md` → `.claude/conventions/handoff-protocol.md`.

Changes:
- Remove the "Roles" section that assigns Gemini as Architect and Claude Code as Builder, or rewrite it as: "The Architect agent handles research and planning. The Builder agent handles code execution."
- Remove "Gemini" throughout — replace with "the Architect" where the planning role is referenced
- Remove "Claude Code" where it means "Builder" — use "the Builder" instead
- Remove the Key Docs Management section that says "Gemini must add a reference" — rewrite as "The Architect must add a reference"
- Keep everything else: spec format, Definition of Done, task tracking XML format, atomic commits, DB safety, archiving rules

#### 3b. `commit-conventions.md`

Move `.agent/conventions/commit-conventions.md` → `.claude/conventions/commit-conventions.md`.

Changes:
- Remove "both Gemini and Claude Code" — replace with "all agents"
- Remove "ALL agents — Claude Code AND Gemini/Antigravity" — replace with "ALL agents"
- Keep everything else verbatim

#### 3c. `tech-stack.md`

Move `.agent/conventions/tech-stack.md` → `.claude/conventions/tech-stack.md`.

Changes:
- Remove "Shared source of truth for both Gemini and Claude Code" — replace with "Source of truth for all agents"
- Remove "Both agents must align" — replace with "All agents must align"
- Keep everything else verbatim

### 4. Update Existing `.claude/` Files

#### 4a. `.claude/rules/persona.md`

Changes:
- Remove "Executing XML specs produced by Gemini" — replace with "Executing XML specs produced by the Architect"
- Update all `.agent/conventions/` paths → `.claude/conventions/`
- Update `.claude/rules/gemini-collab.md` reference → `.claude/rules/execution.md`

#### 4b. `.claude/rules/gemini-collab.md` → Rename to `.claude/rules/execution.md`

This file is repurposed from "how to work with Gemini" to "how the Builder executes plans."

Rewrite:
- Title: "Execution Rules"
- Remove all Gemini mentions
- Keep the substance: follow the handoff protocol, read specs first, execute plans atomically, one commit per task, DB safety, create verification doc, ask for ambiguities
- Update path references from `.agent/` → `.claude/`

#### 4c. `.claude/agents/builder.md`

Changes:
- Remove "generated by the Architect" if it implies Gemini — it now just says "the Architect"
- Confirm model is `sonnet` (already correct)
- Update any `.agent/` path references → `.claude/`

#### 4d. `.claude/agents/qa-pipeline.md`

Changes:
- Confirm model is `sonnet` (already correct)
- Add to the output format: the QA agent must append a `## QA Results` section to the existing `docs/[feature]-verification.md` file (if it exists) with test generation summary, test execution results, fixes applied, and final status. This allows the Architect to review a single complete verification doc.

#### 4e. `.claude/agents/security-auditor.md`

Changes:
- Confirm model is `opus` (already correct)
- Update `.agent/conventions/handoff-protocol.md` → `.claude/conventions/handoff-protocol.md`
- Remove "Architect and Builder workflow" phrasing — use "project workflow"

#### 4f. `.claude/agents/dev-explainer.md`

Changes:
- Update the workflow chain from "Architect → Builder → QA → Architect Verification → Dev Explainer" — keep the same chain but remove the implication that Architect = Gemini
- Update `~/.claude/skills/dev-explainer/SKILL.md` path reference if needed

#### 4g. `.claude/skills/execute-plan/SKILL.md`

Changes:
- Remove "Gemini → Claude Code handoff workflow" — replace with "plan execution workflow"
- Remove "Ask Gemini to generate one first" — replace with "Ask the Architect to generate one first" or "Use the Architect agent to generate one first."
- Remove "Ask Gemini to review the implementation" — replace with "Ask the Architect to review the verification doc"
- Update `.agent/conventions/` → `.claude/conventions/`

#### 4h. `.claude/skills/dev-explainer/SKILL.md`

Changes:
- Update "Architect → Builder → QA → Architect verification" chain — keep the same words, they are agent names now not AI names
- No other changes needed — this file doesn't reference Gemini

#### 4i. `.claude/rules/post-execution.md`

Changes:
- Update any `.agent/conventions/` references → `.claude/conventions/` (if present — check)
- No Gemini references to remove

### 5. Update `CLAUDE.md`

Update path references:
- `.agent/conventions/tech-stack.md` → `.claude/conventions/tech-stack.md`
- `.agent/conventions/handoff-protocol.md` → `.claude/conventions/handoff-protocol.md`
- `.agent/conventions/commit-conventions.md` → `.claude/conventions/commit-conventions.md`

Update the "Agent Rules" section:
- `.claude/rules/gemini-collab.md` → `.claude/rules/execution.md` with updated description

Remove:
- Any mention of Gemini as a collaborator
- Any mention of `.agent/` directory

Add:
- Reference to the Architect agent: "`.claude/agents/architect.md` — Research, planning, and spec generation"

### 6. Update Memory File

Update `.claude/projects/.../memory/MEMORY.md`:
- Update "Doc Files in /docs/" section — remove "Gemini owns these files"
- Update all `.agent/conventions/` → `.claude/conventions/`
- Remove any Gemini references

### 7. Delete Obsolete Directories

#### 7a. `.agent/` directory — DELETE ENTIRELY

All contents have been migrated:
- `.agent/conventions/handoff-protocol.md` → `.claude/conventions/handoff-protocol.md`
- `.agent/conventions/commit-conventions.md` → `.claude/conventions/commit-conventions.md`
- `.agent/conventions/tech-stack.md` → `.claude/conventions/tech-stack.md`
- `.agent/rules/project-rules.md` → content absorbed into updated `.claude/` rules (not migrated as standalone)
- `.agent/workflows/design.md` → confirmed duplicate of design-workflow skill (not migrated)

#### 7b. `.gemini/` directory — DELETE ENTIRELY

All contents have been migrated:
- `.gemini/agents/architect.md` → `.claude/agents/architect.md` (rewritten)
- `.gemini/skills/deep-research/` → `.claude/skills/deep-research/`
- `.gemini/skills/design-workflow/` → `.claude/skills/design-workflow/`
- `.gemini/skills/ui-ux-pro-max/` → `.claude/skills/ui-ux-pro-max/` (including all data/ and scripts/)
- `.gemini/rules/persona.md` → absorbed into architect agent definition
- `.gemini/rules/research.md` → absorbed into deep-research skill
- `.gemini/rules/claude-collab.md` → no longer needed (single-agent system)
- `.gemini/settings.json` → not needed

---

## Handoff Note for Builder

**Feature:** workspace-consolidation
**Branch name suggestion:** `chore/workspace-consolidation`
**Files most likely to be affected:**
- `.claude/agents/` — new architect.md, updates to builder.md, qa-pipeline.md, security-auditor.md, dev-explainer.md
- `.claude/skills/` — new deep-research/, design-workflow/, ui-ux-pro-max/ directories; updates to execute-plan/SKILL.md, dev-explainer/SKILL.md
- `.claude/conventions/` — new directory with handoff-protocol.md, commit-conventions.md, tech-stack.md
- `.claude/rules/` — updates to persona.md, post-execution.md; rename gemini-collab.md → execution.md
- `CLAUDE.md` — path updates and Gemini reference removal
- `.agent/` — entire directory deleted
- `.gemini/` — entire directory deleted

**Watch out for:**
- The `ui-ux-pro-max` skill has Python scripts with relative imports — do NOT change `DATA_DIR` or import paths in the Python files. They use `Path(__file__).parent.parent / "data"` which is relative to the script location and will work in the new location.
- The `search.py` script's CLI help text references `skills/ui-ux-pro-max/scripts/search.py` — update this path in `SKILL.md` but do NOT change the Python code's internal paths.
- When deleting `.gemini/`, ensure the `data/` directory with all CSVs and `stacks/` subdirectory has been fully copied first. Verify file count matches.
- The `design_system.py` file is large (~50KB). Make sure the full file is copied, not truncated.
- Memory file path contains the project hash — make sure to reference the correct memory file.

**Verification focus:**
- After migration, verify all paths referenced in `CLAUDE.md` exist
- Verify all paths referenced in agent/skill files exist
- Verify the `ui-ux-pro-max` Python scripts run successfully from the new location
- Verify no file in `.claude/` still contains the word "Gemini"
- Verify `.agent/` and `.gemini/` directories no longer exist
- Run `grep -r "\.agent/" .claude/` and `grep -r "\.gemini/" .claude/` to catch stale path references
- Run `grep -r "Gemini" .claude/` to catch stale name references