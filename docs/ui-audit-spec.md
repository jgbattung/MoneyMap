# UI Redesign & Audit Spec (Phase 2)

## 1. Objectives & Scope
**Objective:** Transform the app into a premium, cohesive dark-mode finance dashboard using OKLCH color theory and research-backed micro-interactions.
**Scope:**
- **Color Scheme Rethink (OKLCH):** 
  - Subdue the harsh Error Reds to reduce eye-strain on dark backgrounds.
  - Fix Shadcn's `--accent` mapping (currently Gold, causing yellow dropdowns) to use soft Slate.
  - Enforce the rich Slate (Blue-Gray) custom palette for structural backgrounds (`--background`, `--card`, `--muted`).
- **Micro-Interactions (CSS):** Research-backed hover pattern using surface lightening (not shadows), 200ms transitions, `:focus-visible` pairing, and `prefers-reduced-motion` support.
- **Component Scrubbing:** Remove hardcoded generic colors (`bg-secondary-500`, `text-red-500`) and replace with semantic variables.

## 2. Execution Strategy (Two-Part Phased Approach)

- **Phase 2A (Foundation & Shared Components):** `docs/ui-audit-part1-plan.xml`
  1. Fix `globals.css` — recalibrate OKLCH colors + define `.interactive-card` utility.
  2. Scrub `src/components/shared/` and `src/components/ui/` — replace hardcoded colors, apply `.interactive-card`.
  3. Verify foundation is solid.

- **Phase 2B (Dashboards & Pages):** `docs/ui-audit-part2-plan.xml`
  1. Scrub `src/components/dashboard/` — replace hardcoded colors.
  2. Apply `.interactive-card` to dashboard card containers.
  3. Audit `src/app/*` page layouts for consistent spacing.

## 3. Deep-Research Findings

### Color Theory
1. **Vibrating Red:** Chroma > 0.20 on dark backgrounds causes eye strain. Current Error Red has Chroma ~0.257 — needs reduction to ~0.15.
2. **Shadcn `--accent`:** Used for hover states (dropdowns, ghost buttons). Currently Gold = yellow hovers everywhere. Must remap to Slate.
3. **Rich Backgrounds:** Pure neutral grays (`C:0`) look flat. Tying to the Slate hue (`H:236.8`) adds depth.

### Micro-Interactions (Card Hover)
Research across Mercury, Wise, Stripe, and Material Design dark theme guidelines shows:
- **Surface lightening** (not shadows) communicates elevation in dark mode.
- Only animate `background-color`, `border-color`, and `transform` — never `box-shadow`.
- **200ms `ease`** is the sweet spot for finance dashboards.
- Always pair `:hover` with `:focus-visible` for keyboard accessibility.
- Wrap `transform` in `@media (prefers-reduced-motion: no-preference)`.

**Recommended `.interactive-card` CSS:**
```css
.interactive-card {
  transition: background-color 200ms ease, border-color 200ms ease;
}
.interactive-card:hover,
.interactive-card:focus-visible {
  background-color: var(--color-secondary-800);
  border-color: oklch(1 0 0 / 8%);
}
@media (prefers-reduced-motion: no-preference) {
  .interactive-card {
    transition: background-color 200ms ease, border-color 200ms ease, transform 200ms ease;
  }
  .interactive-card:hover,
  .interactive-card:focus-visible {
    transform: translateY(-1px);
  }
}
```

### Handling Existing Hover Effects
Many components already have inline `hover:` Tailwind classes. When applying `.interactive-card`:
1. **Remove** any existing `hover:bg-*`, `hover:border-*`, `hover:-translate-*`, `hover:shadow-*` classes from the container.
2. **Replace** with the single `.interactive-card` class.
3. **Do NOT touch** hover effects on buttons, links, or other non-card interactive elements.

## 4. Verification Plan
- Claude Code must load the UI locally after **each phase**.
- Verify dropdowns/selects are slate, not gold.
- Verify reds are softer and readable.
- Verify card hover shows subtle surface lightening with 200ms transition.
- Verify keyboard focus (`Tab`) triggers the same visual state as hover.

---

## Handoff Note for Builder

**Feature:** UI Redesign & Design System Audit
**Branch name suggestion:** `feature/ui-audit-design-system`
**Files most likely to be affected:**
- `src/app/globals.css`
- `src/components/shared/*.tsx`
- `src/components/ui/*.tsx`
- `src/components/dashboard/*.tsx`
- `src/app/**/page.tsx`

**Watch out for:**
- Components that already have `hover:` classes — remove them before adding `.interactive-card`
- The `--accent` variable is used by ALL Shadcn components for hover. Changing it will cascade globally — verify dropdowns, selects, command palettes, etc.
- Skeleton components currently override `bg-secondary-500` manually. After fixing `--muted`, these overrides should be removed (Skeletons use `bg-muted` by default).

**Verification focus:**
- Dropdown/Select hover backgrounds (should be slate, not gold)
- Error/destructive text readability on dark backgrounds
- Card hover transitions (should be 200ms, no jank)
