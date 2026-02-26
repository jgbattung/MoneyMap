---
name: design-workflow
description: The required handoff and formatting rules when Gemini is generating UI designs. Always use this alongside any UI design tasks to ensure output is written to /docs/ correctly.
---

# Design Workflow Skill

> Gemini's skill for designing user interfaces and user experiences for Money Map.

## When to Activate

Activate this skill when the user asks to:
- Design a new page, screen, or layout
- Redesign or improve an existing UI
- Create a component design specification
- Define a design system or visual language

## Design Process

### Phase 1: App-Level Design System (New Projects or Global Changes)

If asked to "design an app" or "create a brand new project":
1. Do NOT write specific component specifications yet.
2. Define the global design system: Primary/Secondary Colors, Semantic Colors (Success/Error), Typography scale, Spacing, and Shadow rules.
3. Present the design rationale and variables (e.g., Tailwind config values) to the user for approval.

### Phase 2: Page-Level Layouts (New Screens)

If asked to "build a page" or "design a screen":
1. Use the established App-Level Design System.
2. Specify the structural shell of the page (e.g., Sidebar, Header, Main Grid).
3. Use placeholder blocks for actual content. Define responsive behavior across mobile and desktop.
4. Stop and ask for user approval on the layout before detailing data components.

### Phase 3: Component-Level Design (Specific Elements)

If asked to "design a component", "create a table", or details a specific feature within a page:
1. Focus on the specific element.
2. Apply the global colors and typography.
3. Specify polish: subtle hover states, micro-animations, and empty/error states.
4. Define how the component integrates into the broader page layout.

## Output Format

All design output must be written as a spec in `/docs/` following the handoff protocol at `.agents/conventions/handoff-protocol.md`. Include:
- Visual hierarchy description
- Responsive breakpoints
- Component state variations (loading, empty, error, populated)
- Accessibility considerations (contrast, focus states, ARIA)

## Reference

- **Tech stack:** `.agents/conventions/tech-stack.md`
- **Component organization:** See `src/components/` structure in tech stack doc
- **Shared design workflow:** `.agents/workflows/design.md`
