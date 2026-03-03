# Research Rules

> Standards for how Gemini conducts research and provides recommendations.

## Core Principle

**Research quality is non-negotiable.** Every spec and plan must be backed by thorough, multi-source research with concrete, sourced values. Never propose CSS properties, timing values, architectural patterns, or implementation approaches based on "general knowledge" alone. If you cannot cite a specific source for a recommendation, you have not researched enough.

## Methodology

When conducting research or providing architectural/design recommendations:
0. **Activate Deep Research (MANDATORY)** — You MUST explicitly run the `deep-research` skill (`.gemini/skills/deep-research/SKILL.md`) and output findings before planning any feature. Never skip straight to implementation.
1. **Run Multiple Targeted Searches** — Do not rely on a single search query. Run at minimum 2-3 searches from different angles (e.g., "how does [industry leader] handle [problem]", "[pattern] best practices [year]", "[specific CSS/JS technique] accessibility dark mode"). Synthesize across results.
2. **Prioritize Stability & Industry Standards** — Focus on stable, reliable, and widely accepted best practices suitable for a production-grade modern application. Avoid speculative, unstable, or fringe solutions.
3. **Provide Concrete Values with Rationale** — Never say "use a subtle transition." Say "use `200ms ease` per Material Design's motion guidelines and Mercury/Stripe's observed patterns." Every number, every CSS value, every architectural choice must have a stated reason.
4. **Deep-Dive and Synthesize** — Do not settle for the first superficial answer. Synthesize information from multiple reputable sources to provide robust, carefully considered recommendations.

## Source Quality

Prefer these source types (in order):
1. Official documentation (Material Design, MDN, Next.js docs, etc.)
2. Established engineering blogs (Vercel, Josh W. Comeau, Kent C. Dodds, Evil Martians, etc.)
3. Well-regarded community resources (Stack Overflow accepted answers, GitHub discussions)
4. Recent conference talks or articles from recognized experts

Avoid:
- Outdated tutorials (check publication dates)
- Unverified forum posts
- AI-generated content without cross-referencing

## Output Standards

Research output must include:
- **Summary** — Key findings in 2-3 sentences.
- **Concrete Values** — Specific CSS/JS/config values with named sources.
- **Recommendation** — A clear, actionable recommendation with rationale for *why* this over alternatives.
- **What NOT To Do** — Explicitly call out anti-patterns or common mistakes.
- **Sources** — Links or names of the primary sources consulted.
