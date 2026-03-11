# UI/UX Overhaul Specification: Money Map

## Overview
This specification outlines the comprehensive UI/UX redesign of the Money Map application. The goal is to eliminate the "dead" feeling of the current dark mode implementation, introduce professional and accessible typography/spacing, and add modern "pizzaz" through subtle micro-interactions based on the `ui-ux-pro-max` guidelines.

## 1. Global Color System & Accessibility
The current implementation suffers from Shadcn's default `--accent` clashing with the brand's gold, and highly saturated reds/greens vibrating against the dark background.

### Backgrounds & Elevation
- **Base Background:** `#121212` (`oklch(0.145 0 0)`) - Avoid pure black to reduce eye strain.
- **Card/Surface:** `#1E1E1E` or slightly lighter tints of the background for elevation. *Never use CSS drop shadows for dark mode elevation.*

### Success & Error States (Text & Badges)
Per WCAG contrast requirements and dark mode best practices:
- **Success (Green):** Must be desaturated. Use a "Mint" or pastel green (e.g., `#6EE7B7` or `emerald-400` equivalent) for text to ensure a minimum 4.5:1 contrast ratio against `#121212`.
- **Error (Red):** Must be desaturated. Use a "Soft Coral" or muted red (e.g., `#FCA5A5` or `red-400` equivalent) for text.
- *Rule:* Never use the highly saturated brand `#F44336` or `#00A9A5` for small text against the dark background.

### Semantic Variable Re-mapping
Update `src/app/globals.css`:
- `--accent`: Map this to a subtle white/gray hover background (e.g., `oklch(1 0 0 / 10%)`), *not* the brand gold.
- `--brand-gold`: Map the actual brand gold here.
- `--brand-teal`: Map the actual brand teal here.

## 2. Typography & Spacing
- **Padding:** Enforce a strict minimum of `24px` (`p-6`) internal padding for all major structural cards to prevent a cramped feeling.
- **Line Height:** Increase body text line height to `leading-relaxed` (1.5x) or `leading-loose` (1.6x).
- **Tracking:** Add `tracking-tight` to headings and `tracking-wide` (or custom `+0.02em`) to dense body data to improve scannability.

## 3. The "Card" Architecture (Utility Composition)
The codebase primarily uses custom `div`s rather than Shadcn `<Card>` components. Instead of rewriting everything to use `<Card>`, we will create standardized CSS classes in `globals.css` (or a tailwind `@layer components`) that can be applied to these `div`s.

- **`.money-map-card`**: The base card style. Needs `bg-card`, `border`, `border-border/50`, `rounded-xl`, and `p-6` (or `p-4 md:p-6`). *Removes heavy shadow-md/lg.*
- **`.money-map-card-interactive`**: Adds the "Pizzaz". Includes `transition-all duration-200`, `hover:bg-card/70` (or `hover:bg-card-foreground/5`), and an inset border glow `hover:ring-1 hover:ring-border/50`. *Removes the harsh `hover:scale-105` which causes layout shifts.*

## 4. Micro-interactions ("Pizzaz")
To make the app feel alive and responsive, implement the following interaction patterns globally:
- **Duration:** All state changes must use `duration-200` or `duration-300` `ease-in-out` transitions. Instant state changes are forbidden.
- **Hover States (Buttons/Cards):** 
  - Buttons: Slight background lightness increase (`hover:bg-accent`).
  - Cards: Do *not* scale up (causes layout shifts). Use the `.money-map-card-interactive` class for inset border highlights or lightness shifts.
- **Active States:** Add `active:scale-95` to buttons for physical feedback.
- **Icons:** Ensure all icons are SVG (e.g., Lucide) with consistent sizing (`w-5 h-5` or `w-6 h-6`). No emojis.

---

## Handoff Note for Builder

**Feature:** Global UI/UX Overhaul & Consistency Sweep
**Branch name suggestion:** `feature/ui-ux-global-overhaul`
**Files most likely to be affected:**
- `src/app/globals.css` (Crucial variable remapping)
- `tailwind.config.ts` (If adding custom animations/colors)
- `src/components/ui/*` (Shadcn base components: buttons, cards, badges)
- `src/app/(dashboard)/*` (Main layout wrappers)

**Watch out for:**
- Shadcn's hidden dependencies on `--accent`. Once you change it from Gold to a subtle gray, check everywhere Gold was expected and manually replace it with `bg-brand-gold` or `text-brand-gold`.
- The existing custom `div` cards (like `AccountCard.tsx`). They currently use `shadow-md hover:scale-105`. These must be stripped out and replaced with standard utility composition (`.money-map-card-interactive`) so the layout doesn't shift on hover.
- Verify the new desaturated text colors (for positive/negative numbers in the transaction list) against the background to ensure they pass WCAG AAA (or at least AA) contrast.

**Verification focus:**
- Does the app still compile?
- Are the hover states on default Shadcn `ghost` and `outline` buttons fixed (i.e., no longer blinding gold)?
- Do the transaction list numbers (green/red) look soft and legible against the dark background rather than vibrating?
