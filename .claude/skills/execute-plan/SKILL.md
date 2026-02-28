---
name: execute-plan
description: Finds the latest unarchived Gemini plan in /docs/, reads the paired spec for context, and executes every task block atomically with a commit per task, then produces a verification doc and runs the post-execution checklist. Use when the user says "start developing the plan", "execute the plan", "implement the plan", or "/execute-plan".
---

# execute-plan

You are the **Builder** for Money Map. This skill automates the full Gemini → Claude Code handoff workflow so the user only needs to say one phrase to kick off development.

---

## Step 1 — Discover the Active Plan

Scan `/docs/` for all files matching `*-plan.xml` that have **not** been archived (i.e., not inside `/docs/archive/`).

```bash
ls docs/*-plan.xml 2>/dev/null
```

- If **exactly one** plan file exists → proceed with it automatically.
- If **multiple** plan files exist → list them and ask the user which one to execute. Do not guess.
- If **no** plan file exists → stop and tell the user: "No plan file found in /docs/. Ask Gemini to generate one first."

---

## Step 2 — Read the Spec and Plan

Derive the feature name from the plan filename: `docs/[feature]-plan.xml` → feature = `[feature]`.

Read both files in parallel:

1. `docs/[feature]-spec.md` — full design spec (context, requirements, scope)
2. `docs/[feature]-plan.xml` — atomic task list

If the spec file does not exist, warn the user but proceed with the plan only.

**Do not write any code yet.** Fully understand both documents first.

---

## Step 3 — Summarize and Confirm

Before executing, print a brief summary to the user:

```
## Plan: [feature]

Found X tasks to execute:
1. <task name 1>
2. <task name 2>
...

Proceeding with execution. Each task will get its own atomic commit.
```

Do not ask for approval — the user already triggered this skill intentionally.

---

## Step 4 — Execute Tasks Atomically

Work through each `<task>` block **sequentially**. For each task:

### 4a. Read the task fields

```xml
<task>
  <name>Display Name of Task</name>
  <action>What files to create or modify and how</action>
  <verify>Command or step to verify the change</verify>
</task>
```

### 4b. Implement the action

- Follow the coding standards in `.claude/rules/persona.md`.
- Match existing patterns in the codebase — read relevant files before editing.
- Use TypeScript strictly. Use Zod, React Hook Form, TanStack Query, and Shadcn/ui per the tech stack.

### 4c. Verify

Run the `<verify>` step. If verification fails:
- Diagnose and fix the issue.
- Re-run verification.
- If still blocked after two attempts, **halt** and report the blocker clearly. Do not skip the task.

### 4d. Commit atomically

After each task passes verification, create a git commit immediately:

```bash
git add <relevant files>
git commit -m "feat(<scope>): <task name>"
```

- Follow `.agents/conventions/commit-conventions.md` for type and scope.
- **Never bundle multiple tasks into one commit.**
- **Never commit to `main` directly.** If on `main`, create a feature branch first:
  ```bash
  git checkout -b feature/<feature-name>
  ```

### 4e. Mark progress

After each successful commit, print:
```
✓ Task [N/X]: <task name> — committed
```

If a task is blocked, print:
```
✗ Task [N/X]: <task name> — BLOCKED: <reason>
```
Then halt execution and await user guidance.

---

## Step 5 — Post-Execution

After all tasks complete:

### 5a. Create the verification document

Create `docs/[feature]-verification.md` with the following structure:

```markdown
# [Feature] — Verification

## Status
All X tasks completed and committed.

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | <task name> | <short SHA> | ✓ Done |
...

## Verification Steps

[List what was run to verify each task — commands, outputs, manual checks.]

## Notes

[Any deviations from the spec, edge cases discovered, or follow-up items.]
```

### 5b. Run the post-execution checklist

Follow `.claude/rules/post-execution.md`:

1. **Lint** — Run `npm run lint` and fix any errors.
2. **Build** — Run `npm run build` and ensure zero errors.
3. **QA** — Spawn the `qa-pipeline` agent for every file introduced or significantly changed.
4. **Update task file** — Check off completed items in `PROJECT.md` or the active plan file.
5. **Update Key Docs** — If new files or patterns were introduced, update `CLAUDE.md` if relevant.
6. **Wait for commit** — Do NOT create a final rollup commit. Wait for the user to request it.

---

## Step 6 — Final Report

When everything is complete, print:

```
## Execution Complete: [feature]

**Tasks:** X/X completed
**Commits:** X atomic commits on branch `feature/[feature-name]`
**Verification doc:** docs/[feature]-verification.md

### Post-Execution
- Lint: PASS / FAIL (details if fail)
- Build: PASS / FAIL (details if fail)
- QA: PASS / FAIL (details if fail)

### Next Steps
- Review the verification doc
- Ask Gemini to review the implementation
- Merge when approved
```

---

## Constraints

- **Never skip a task.** If blocked, halt and report — do not silently skip.
- **Never bundle commits.** One commit per task, always.
- **Never commit to `main`.** Always work on a feature branch.
- **Never make architectural decisions** not covered by the spec. If something is ambiguous, ask the user.
- **Read before editing.** Always read a file with the Read tool before modifying it.
