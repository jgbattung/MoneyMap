---
name: dev-explainer
description: Generates a [feature]-explained.md doc that teaches the developer what was built, how it works, and why. Use when the user says "/dev-explainer", "explain what was built", "explain this feature", or "generate explained doc". Reads spec, plan, verification docs and git history to produce a two-layer explanation — product summary and technical deep dive.
---

# dev-explainer

You are generating a learning document for the developer of Money Map. The goal is to explain a completed feature clearly enough that the developer builds a genuine mental model of what was implemented — both at the product level and the technical level.

This skill is invoked **after** the full workflow is complete: Architect → Builder → QA → Architect verification. It is the final step before closing out a feature.

---

## Step 1 — Discover the Feature Scope

### 1a. Identify the current branch

```bash
git branch --show-current
```

### 1b. Find all spec and plan files touched on this branch

Get every commit on this branch that is not on `main`:

```bash
git log main..HEAD --name-only --pretty=format: | sort -u
```

From this list, extract all filenames matching:
- `docs/*-spec.md`
- `docs/*-plan.xml`
- `docs/*-verification.md`

These files define the scope of the explanation.

If no spec or plan files are found in the branch diff, fall back to scanning `docs/` for unarchived files:

```bash
ls docs/*-spec.md docs/*-plan.xml docs/*-verification.md 2>/dev/null
```

### 1c. Derive the feature name(s)

Extract unique feature slugs from the filenames (e.g., `tags-part1-spec.md` → feature slug `tags`).

If multiple distinct feature slugs are found (e.g., `tags` and `budgets`), treat each as a separate sub-feature within the same explanation document.

---

## Step 2 — Gather All Source Material

Read all discovered files in parallel:

1. **Spec files** (`docs/[feature]-spec.md`) — requirements, design decisions, UX rationale
2. **Plan files** (`docs/[feature]-plan.xml`) — atomic task breakdown, what was built phase by phase
3. **Verification docs** (`docs/[feature]-verification.md`) — what was actually implemented, any deviations, commit SHAs

### 2b. Pull the full git commit log for this branch

```bash
git log main..HEAD --pretty=format:"%h %s" --stat
```

This shows every file changed per commit. Use this to build a precise picture of what changed and where.

---

## Step 3 — Synthesize

Before writing, mentally build these models from the source material:

- **What the feature does** from a user's perspective
- **What files were created or modified** and what role each plays
- **What patterns and technologies were used** (e.g., TanStack Query mutation, Zod schema, Prisma relation, Optimistic update)
- **Why** each technical decision was made (derive from spec rationale and plan actions)
- **How the data flows** end-to-end (user action → component → hook → API route → Prisma → DB → response → UI update)
- **What tests cover** the feature and what edge cases they guard

---

## Step 4 — Write the Explained Doc

Create `docs/[feature]-explained.md` with the structure below.

If multiple spec/plan pairs exist (multi-part feature), the doc should cover all of them as a unified explanation.

---

### Document Structure

```markdown
# [Feature Name] — Explained

> Generated from: [list all spec/plan/verification files used as source]
> Branch: [branch name]
> Date: [today's date]

---

## Summary

A quick-reference snapshot of what was shipped.

| Metric | Value |
|--------|-------|
| Tasks completed | X |
| Files created | X |
| Files modified | X |
| Tests written | X |
| Commits | X |
| Phases | X |

**In one sentence:** [Plain-language description of what the feature does for the user.]

---

## What Was Built

A brief product-level explanation (3–6 sentences). Describe the feature as if explaining it to someone who uses the app but doesn't write code. What can the user now do? What problem does it solve?

---

## Deep Dive

This is the main learning section. Walk through the implementation layer by layer. Be technical, specific, and educational. For every significant piece of code, explain:
- **What it is** (file path, component/hook/route name)
- **What it does** (its responsibility)
- **How it works** (the mechanism — what pattern, what library, what data shape)
- **Why it was built this way** (derive from spec rationale where available)

Structure the deep dive by architectural layer, working from data outward:

### Data Layer
Explain any Prisma schema changes, new models, fields, or relations. Describe what data is stored and why. Include the migration if one was run.

### API Layer
Explain each API route created or modified (`src/app/api/...`). Describe:
- The HTTP method and endpoint
- What it reads from the request (params, body, session)
- What Prisma queries it runs
- What it returns

### State & Data Fetching Layer
Explain each custom hook (`src/hooks/...`). Describe:
- What TanStack Query hook it wraps (`useQuery` / `useMutation`)
- What API route it calls
- What it exposes to the component (data, loading, error, mutation fn)
- Any optimistic update logic

### UI Layer
Explain each component created or modified. Describe:
- What it renders
- What props/state it consumes
- How user interactions flow (e.g., "clicking X triggers mutation Y, which invalidates query Z, causing the list to re-fetch")
- Any Shadcn/ui primitives used and why

### Validation Layer
Explain any Zod schemas added. What shape do they validate? Where are they used (client-side form validation vs. server-side API guard)?

---

## Data Flow

A step-by-step trace of the most important user action in the feature, from click to UI update:

```
1. User does [X] in [Component]
2. Component calls [hook fn] with [payload]
3. Hook fires POST/PATCH/DELETE to [/api/route]
4. API route validates with [ZodSchema]
5. Prisma runs [query] on [Model]
6. DB returns [result]
7. API responds with [shape]
8. TanStack Query [invalidates / updates cache]
9. UI re-renders showing [outcome]
```

---

## Files Changed

A reference table of every file touched, with a one-line description of what changed.

| File | Change Type | What Changed |
|------|------------|--------------|
| `src/...` | Created / Modified | [description] |

---

## Tests Added

List every test file written and what it covers.

| Test File | What It Tests | Key Cases |
|-----------|--------------|-----------|
| `src/...` | [component/hook/route] | happy path, error state, empty state, ... |

---

## Key Concepts Used

A glossary of the technical patterns and tools used in this feature. Helpful for building vocabulary.

| Concept | What It Is | How It Was Used Here |
|---------|-----------|----------------------|
| TanStack Query `useMutation` | ... | ... |
| Zod schema | ... | ... |
| Prisma `include` | ... | ... |
| Optimistic update | ... | ... |

Only include concepts that were actually used. Add a one-line plain-language definition.

---

## What To Look At Next

Suggest 2–3 specific files or areas in the codebase the developer should read to deepen their understanding of the patterns used here.

- `[file path]` — [why it's worth reading]
```

---

## Step 5 — Output

After creating the file, print to the user:

```
## Dev Explainer Complete

**Feature:** [feature name]
**Output:** docs/[feature]-explained.md
**Source material used:**
- [list spec/plan/verification files read]
- [X commits analyzed]

Open docs/[feature]-explained.md to read your explanation.
```

---

## Constraints

- **Never fabricate.** Every claim about what was implemented must be traceable to the spec, plan, verification doc, or git diff. If something is unclear, note it explicitly in the doc with `> Note: Could not determine this from source material.`
- **Never run database or migration commands.**
- **Never modify source code.** This skill is read-only with respect to the codebase.
- **Be genuinely educational.** Avoid surface-level summaries. The developer should finish reading this document with a clear mental model of how the feature works end-to-end.
- **Use exact file paths** from the git log — do not guess or generalize.
