---
description: The standard UI/UX design process to use when building a new app, page layout, or component
---

# UI/UX Design Process

When the user asks you to design or build UI elements, evaluate the scale of their request and follow the appropriate phase below. 

Before doing any work, you MUST read the `.gemini/skills/design-workflow` and `.gemini/skills/ui-ux-pro-max` skills for design guidelines and handoff rules.

## Phase 1: App-Level Design System (New Projects or Global Changes)
If the user asks to "design an app" or "create a brand new project":
1. Do NOT write specific component code yet.
2. Define the global design system: Primary/Secondary Colors, Semantic Colors (Success/Error), Typography scale, Spacing, and Shadow rules.
3. Present the design rationale and variables (e.g., Tailwind config) to the user for approval.

## Phase 2: Page-Level Layouts (New Screens)
If the user asks to "build a page" or "design a screen":
1. Use the established App-Level Design System.
2. Build the structural shell of the page (e.g., Sidebar, Header, Main Grid).
3. Use placeholder blocks or empty containers for the actual content. Ensure responsive behavior across mobile and desktop.
4. Stop and ask for user approval on the layout before filling in data components.

## Phase 3: Component-Level Design (Specific Elements)
If the user asks to "build a component", "create a table", or details a specific feature within a page:
1. Focus your full context on the specific element.
2. Apply the global colors and typography.
3. Add polish: subtle hover states, micro-animations, and empty/error states.
4. Integrate the component into the broader page layout.
