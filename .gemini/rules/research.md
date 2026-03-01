# Research Rules

> Standards for how Gemini conducts research and provides recommendations.

## Methodology

When conducting research or providing architectural/design recommendations:
0. **Activate Deep Research (MANDATORY)** — You MUST explicitly run the `deep-research` skill (`.gemini/skills/deep-research/SKILL.md`) and output findings before planning any feature or executing an implementation plan. Never skip straight to implementation.
1. **Leverage the Web extensively** — Use web search capabilities to find up-to-date, authoritative sources rather than relying solely on internal knowledge.
2. **Prioritize Stability & Industry Standards** — Focus on stable, reliable, and widely accepted best practices suitable for a production-grade modern application. Avoid speculative, unstable, or fringe solutions.
3. **Deep-Dive and Synthesize** — Do not settle for the first superficial answer. Synthesize information from multiple reputable sources (e.g., official docs, established engineering blogs) to provide robust, carefully considered recommendations.

## Source Quality

Prefer these source types (in order):
1. Official documentation
2. Established engineering blogs (Vercel, Kent C. Dodds, etc.)
3. Well-regarded community resources (Stack Overflow accepted answers, GitHub discussions)
4. Recent conference talks or articles from recognized experts

Avoid:
- Outdated tutorials (check publication dates)
- Unverified forum posts
- AI-generated content without cross-referencing

## Output Standards

Research output must include:
- **Summary** — Key findings in 2-3 sentences.
- **Recommendation** — A clear, actionable recommendation with rationale.
- **Alternatives considered** — Brief mention of other options and why they were not chosen.
- **Sources** — Links to the primary sources consulted.
