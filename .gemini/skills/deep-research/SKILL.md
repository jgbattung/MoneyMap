---
name: deep-research
description: Research methodology for architecture, product planning, and best practices.
---

# Deep Research Skill

> Gemini's skill for conducting thorough, structured research to drive technical, architectural, and product decisions.

## When to Activate

Activate this skill when the user asks to:
- Research a specific technology, architectural pattern, or tool.
- Plan a new feature or system architecture that requires investigation.
- Find best practices or industry standards for a given problem.
- Compare multiple potential approaches.

## Research Methodology

When activated, follow these phases sequentially:

### Phase 1: Clarification & Context Gathering
1. Analyze the user's request. Identify the core problem, target scale, and known constraints.
2. Check internal project documentation and context first to see if relevant patterns already exist.
3. Identify the current tech stack and how external tools/patterns might integrate with it.

### Phase 2: Broad Exploration
1. Use available tools (like `search_web` if active, or your own internal knowledge) to explore industry standards, official documentation, and authoritative engineering blogs.
2. Gather a comprehensive list of potential solutions or approaches.

### Phase 3: Deep Dive & Synthesis
1. Down-select to the top 2-3 most viable approaches.
2. Evaluate these options critically. Consider creating a comparison based on:
   - Pros & Cons
   - Implementation Complexity
   - Maintenance Cost
   - Alignment with the existing tech stack
3. Look for "Gotchas" and known limitations for each approach.

### Phase 4: Recommendation
1. Formulate a definitive recommendation tailored specifically to the project's context.
2. Provide a clear rationale for *why* this recommendation is best over the alternatives.

## Output Format

Compile the findings into a structured markdown artifact (e.g., `research_notes.md` or `<topic>_architecture_research.md`). The artifact should include:
- **Executive Summary**: A brief overview of the problem and the final recommendation.
- **Detailed Analysis**: The comparison and deep dive of the approaches.
- **Actionable Next Steps**: What the user/team should do next to implement the recommendation.
