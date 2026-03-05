---
name: deep-research
description: Research methodology for architecture, product planning, and best practices.
---

# Deep Research Skill

> Gemini's skill for conducting thorough, structured research to drive technical, architectural, and product decisions.

## IMPORTANT: Quality Bar

This skill exists because **shallow research leads to bad specs.** The baseline expectation is:
- Minimum **2-3 web searches** from different angles per topic
- Every recommendation includes **concrete values** (e.g., "200ms ease", "Chroma ~0.15", "translateY(-1px)") with **named sources**
- A **"What NOT to do"** section that explicitly warns against common mistakes
- Research findings are **presented to the user before drafting any spec**

If you cannot cite a source for a specific value you're recommending, you have not done enough research. Go back and search more.

## When to Activate

Activate this skill for **every planning task**. Not just "complex" ones. This includes:
- Planning a new feature or system architecture
- Designing UI/UX interactions (colors, hover states, animations, layouts)
- Choosing between architectural patterns or tools
- Auditing or redesigning existing systems
- Any task where a `-spec.md` or `-plan.xml` will be produced

## Research Methodology

When activated, follow these phases sequentially:

### Phase 1: Clarification & Context Gathering
1. Analyze the user's request. Identify the core problem, target scale, and known constraints.
2. Ask clarifying questions **one at a time** to fully understand intent before proceeding.
3. Check internal project documentation and context first to see if relevant patterns already exist.
4. Identify the current tech stack and how external tools/patterns might integrate with it.

### Phase 2: Broad Exploration
1. Run **at minimum 2-3 targeted web searches** from different angles:
   - How do industry leaders handle this? (e.g., "Mercury bank dashboard hover effects")
   - What are current best practices? (e.g., "CSS card hover dark mode best practice 2024")
   - What are the accessibility/performance implications? (e.g., "hover effect accessibility prefers-reduced-motion")
2. Gather a comprehensive list of potential solutions or approaches.

### Phase 3: Deep Dive & Synthesis
1. Down-select to the top 2-3 most viable approaches.
2. Evaluate these options critically. Consider:
   - Pros & Cons
   - Implementation Complexity
   - Maintenance Cost
   - Alignment with the existing tech stack
   - **Specific values used in practice** (timing, easing, colors, sizes)
3. Look for "Gotchas" and known limitations for each approach.
4. Document **what NOT to do** — common anti-patterns found in the research.

### Phase 4: Recommendation
1. Formulate a definitive recommendation tailored specifically to the project's context.
2. Every value must have a stated reason (e.g., "200ms ease — recommended by Material Design motion guidelines and observed in Mercury/Stripe dashboards").
3. **Present findings to the user** before drafting specs. Let them react and adjust direction.

### Phase 5: Alignment Check (HARD STOP)
1. Present a concise summary of your research findings and proposed approach in the chat.
2. Ask the user: *"Does this approach look correct? Please answer any questions, or say `/approve` to have me generate the spec and plan files."*
3. **Do not use any file-creation tools until the user explicitly aligns with your proposal.**

## Output Format

Compile the findings into a structured markdown artifact (e.g., `research_notes.md` or `<topic>_architecture_research.md`). The artifact should include:
- **Executive Summary**: A brief overview of the problem and the final recommendation.
- **Detailed Analysis**: The comparison and deep dive of the approaches, with concrete values.
- **What NOT To Do**: Anti-patterns or common mistakes to avoid.
- **Actionable Next Steps**: What the user/team should do next to implement the recommendation.
- **Sources**: Named sources for every key recommendation.

When planning a feature (spec + plan output), generate:

1. **`docs/[feature]-spec.md`** — The full design spec. Always append a **Handoff Note** at the bottom using this template:

```markdown
---

## Handoff Note for Builder

**Feature:** [feature name]
**Branch name suggestion:** `feature/[feature-kebab-name]`
**Files most likely to be affected:**
- [list key files/directories]

**Watch out for:**
- [gotchas, edge cases, or constraints the Builder should know before starting]

**Verification focus:**
- [what the Builder should pay extra attention to when verifying tasks]
```

2. **`docs/[feature]-plan.xml`** — An atomic task list for Claude to execute. Follow the format strictly:
   - Group tasks into `<phase>` blocks based on architectural layers or verifiable milestones (e.g., `<phase name="1: Types & Data Models">`). 
   - A phase **must** represent a stable checkpoint where the codebase compiles and the user can safely review progress.
   - Aim for **1 to 5 closely related tasks per phase**. Default to smaller, more reviewable phases.
   - Each `<task>` must sit inside a `<phase>` and contain `<name>`, `<action>`, and `<verify>` tags.
   - Each task must be independently actionable and verifiable.
   - The `<action>` should be specific enough for a developer to implement without guessing.
   - The `<verify>` should describe a concrete check (command, manual test, or assertion) to be run during that phase.

> **CRITICAL NAMING RULE:** The file MUST end with `-plan.xml` (e.g., `ui-audit-plan.xml`, `ui-audit-part1-plan.xml`). Claude's `execute-plan` skill uses the glob `docs/*-plan.xml` to auto-discover plan files. A file named `ui-audit-plan-part1.xml` will NOT be found. If splitting a plan into multiple parts, use the pattern `[feature]-part1-plan.xml`, `[feature]-part2-plan.xml`, etc.
