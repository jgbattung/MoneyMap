---
name: Money Map
description: A calm, precise personal net-worth and money-tracking dashboard.
colors:
  teal-primary: "oklch(0.565 0.09 190)"
  gold-accent: "oklch(0.64 0.10 80)"
  slate-secondary: "oklch(0.367 0.015 236.8)"
  ink-bg: "oklch(0.16 0.008 185)"
  surface-card: "oklch(0.225 0.008 185)"
  surface-muted: "oklch(0.285 0.008 185)"
  text-primary: "oklch(0.893 0 0)"
  text-muted: "oklch(0.708 0 0)"
  gain-green: "oklch(0.845 0.094 164.1)"
  loss-coral: "oklch(0.800 0.075 20.5)"
  destructive-red: "oklch(0.627 0.257 27.3)"
  hairline: "oklch(1 0 0 / 10%)"
typography:
  display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  card-sm: "16px"
  card-lg: "24px"
  gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal-primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  badge:
    backgroundColor: "{colors.teal-primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Money Map

## 1. Overview

**Creative North Star: "The Private Instrument"**

Money Map is a personal financial dashboard designed to feel like a well-made instrument the owner reaches for daily — quiet, exact, and trustworthy. It is a dark-only interface built on a teal-tinted near-black canvas (`oklch(0.16 0.008 185)`, ~#111413) where a deepened teal carries identity, brass marks value, and everything else recedes so the numbers can speak. Depth is created almost entirely by tonal layering — flat cards a shade lighter than the background — rather than by shadow theatrics. The whole system is token-driven: an OKLCH palette on CSS custom properties, consumed through shadcn/ui "new-york" primitives and Radix behavior, so a change at the token layer propagates everywhere.

The personality is **calm, trustworthy, precise**. Money is emotionally loaded, so the design's job is to reduce anxiety, not manufacture excitement. Emphasis is rationed: a screen at rest is quiet, and color intensity is spent only where the data earns it — a budget over its limit, a net-worth swing, a gain or a loss. Density is welcome because this is a single power user's daily tool, but rhythm and spacing keep richness from curdling into a spreadsheet.

This system explicitly rejects **enterprise / admin-panel blandness** (gray, dense, soulless back-office aesthetics) and **purple-gradient AI-SaaS** (violet gradients, decorative glassmorphism, AI-startup sheen). It is not a neon-and-glass crypto dashboard and not a gamified consumer app. It stands apart through typographic craft, considered color, and restraint — not gimmicks.

**Key Characteristics:**
- Dark-only, near-black canvas with tonal-layer depth (not shadow-driven)
- Teal identity / brass value / slate structure, on a teal-tinted ink base
- Monospaced numerics for exact, aligned figures
- Restraint: color intensity reserved for data that warrants attention
- Token-first architecture (OKLCH CSS variables → shadcn/Radix primitives)

## 2. Colors

A restrained dark palette: a teal-tinted near-black base, a single deepened-teal identity color, a brass value accent used sparingly, and semantic gain/loss colors deliberately desaturated so they read as calm signals rather than alarms.

### Primary
- **Instrument Teal** (`oklch(0.565 0.09 190)`, ~#178a86): The identity color, deepened and desaturated in the "Deep Teal, Refined" reskin. Primary buttons, active navigation, focus/selection, the net-worth line, and the first chart series. This is the app's voice — used with intent, not sprayed across surfaces.

### Secondary
- **Structural Slate** (`oklch(0.367 0.015 236.8)`): Secondary buttons and structural chrome. A cool, low-chroma gray-blue that gives quiet weight without competing with teal.

### Tertiary
- **Value Brass** (`oklch(0.64 0.10 80)`, ~#b8863b): The value/accent hue, demoted from a bright gold to a deeper brass so it stays rare and grown-up. Reserved for moments that connote worth, a budget nearing its limit, or a second data series in charts. Deliberately rare; note the semantic UI `--accent` is a subtle white-alpha hover (`oklch(1 0 0 / 10%)`) so brass stays special rather than becoming generic hover paint.

### Neutral
- **Ink Base** (`oklch(0.16 0.008 185)`, ~#111413): The app background. A near-black tinted faintly toward the brand teal — the tint is what keeps the dark surface from reading as generic enterprise gray.
- **Card Surface** (`oklch(0.225 0.008 185)`): Cards, popovers, sidebar — one teal-tinted tonal step up from the base. This step *is* the elevation system.
- **Muted Surface** (`oklch(0.285 0.008 185)`): The recessed insights panel and muted fills — a second deliberate tonal step, which is what makes the net-worth panel's two-tone signature intentional.
- **Primary Text** (`oklch(0.893 0 0)`, ~#e0e0e0): Body and heading text. Off-white, never pure #fff, to soften glare on the dark canvas.
- **Muted Text** (`oklch(0.708 0 0)`): Secondary labels, descriptions, timestamps.
- **Hairline** (`oklch(1 0 0 / 10%)`): Borders and dividers as 10% white alpha — visible but never assertive.

### Semantic
- **Gain Green** (`oklch(0.845 0.094 164.1)`, ~#6EE7B7): Positive figures and upward trends. A desaturated mint, tuned for legibility on dark surfaces rather than a saturated "success" green.
- **Loss Coral** (`oklch(0.800 0.075 20.5)`, ~#FCA5A5): Negative figures and downward trends. A soft coral, not an alarm red.
- **Destructive Red** (`oklch(0.627 0.257 27.3)`, ~#f44336): Reserved strictly for destructive actions (delete) and hard error states — distinct from the calm loss-coral used for ordinary negative numbers.

### Named Rules
**The Rationed Accent Rule.** Gold and full-strength teal are earned, not defaulted. If teal or gold is covering large neutral surface just to look "designed," it's wrong — the canvas stays neutral and color marks meaning.

**The Two-Reds Rule.** Ordinary negative money uses the calm **Loss Coral**; only genuinely destructive actions and errors use **Destructive Red**. Never use the alarm red for a routine negative balance.

## 3. Typography

**Display / Body Font:** Geist Sans (with ui-sans-serif, system-ui fallback)
**Numeric / Mono Font:** Geist Mono (with ui-monospace fallback)

**Character:** One family in multiple weights for prose and headings — clean, neutral, contemporary — paired on a true contrast axis with its monospace sibling for figures. Geist Mono gives every currency amount tabular alignment and an unmistakable "this is a precise number" texture, which is the typographic heart of a finance tool.

### Hierarchy
- **Display** (600, clamp(1.5rem, 3vw, 2.25rem), 1.1, -0.02em): Page titles and the net-worth hero figure. Tight tracking, balanced wrapping.
- **Title** (600, 1.125rem, 1.2): Card titles and section headings.
- **Body** (400, 0.875rem, 1.6): Default reading text. Relaxed line-height for calm scanability.
- **Numeric** (500, 0.875rem, mono): All currency amounts, balances, deltas. Tabular, aligned, exact.
- **Label** (500, 0.75rem): Metadata, timestamps, secondary captions; also two custom micro-sizes (`--text-xxs` 10px, `--text-xxxs` 8px) for dense chart and badge annotations.

### Named Rules
**The Monospace Money Rule.** Every currency figure is set in Geist Mono. Amounts must align on the decimal and never reflow between weights — precision you can trust starts with numbers that line up.

## 4. Elevation

Depth is conveyed by **tonal layering, not shadows**. The background is the darkest layer; cards sit one measured step lighter (`oklch(0.225 0.008 185)` over `oklch(0.16 0.008 185)`), and hairline 10%-white borders define edges. shadcn primitives carry a whisper-light `shadow-xs`/`shadow-sm`, but shadow is not the depth mechanism — the tonal step is. This keeps the surface calm and avoids the heavy drop-shadows that make dark UIs feel dated.

### Named Rules
**The Tonal-Step Rule.** Elevation is a lightness step, not a shadow. If a surface needs to feel raised, lighten it toward the card tone and add a hairline border — don't reach for a bigger blur.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`rounded-md`, 8px). Height 36px default (`h-9`), with sm (32px) and lg (40px) sizes; a square 36px icon variant.
- **Primary:** Teal fill, off-white text, whisper `shadow-xs`; hover drops to 90% opacity. Micro-tactility via `active:scale-[0.98]` and a 200ms ease-in-out transition.
- **Secondary / Outline / Ghost:** Slate fill; hairline-bordered translucent input tint; and text-only ghost that reveals a subtle white-alpha hover, respectively.
- **Focus:** 3px `ring-ring/50` focus-visible ring — keyboard focus is always visible.

### Cards / Containers
- **Corner Style:** `rounded-xl` (14px) — the signature `.money-map-card` utility.
- **Background:** Card surface (`oklch(0.205 0 0)`) with a 50%-opacity hairline border.
- **Elevation:** Tonal step + optional `shadow-sm`; never a heavy shadow.
- **Internal Padding:** 16px on mobile, 24px on desktop (`p-4 md:p-6`).
- **Interactive variant:** `.money-map-card-interactive` adds a hover lift to `bg-card/70` plus a 1px ring — the one place cards react.

### Inputs / Fields
- **Style:** Transparent-to-subtle fill over a hairline border, `rounded-md`, 36px tall, 12px horizontal padding. Placeholder uses muted text.
- **Focus:** Border shifts to ring color with a 3px ring; transitions color/box-shadow only.
- **Error:** `aria-invalid` paints the border and ring with the error text color — no layout shift.

### Badges
- **Style:** Fully rounded pill (`rounded-full`), 12px medium label, teal/slate/destructive/outline variants, 3px inline SVG icon support.

### Navigation
- **Style:** Desktop left **Sidebar** and mobile **BottomBar + Floating Action Button**, on the card surface. Active item carries teal; groups expand via a `grid-template-rows: 0fr → 1fr` reveal. Nav respects `prefers-reduced-motion`.

### Signature Numerics
- **AnimatedNumber:** Currency figures animate (count-up) on change via framer-motion, in Geist Mono, with gain-green / loss-coral sign coloring paired with directional cues — the tool's most distinctive, brand-carrying component.

## 6. Do's and Don'ts

### Do:
- **Do** keep the canvas teal-tinted near-black (`oklch(0.16 0.008 185)`) and build depth with a single tonal step to the card surface plus hairline borders.
- **Do** set every currency amount in Geist Mono, aligned on the decimal.
- **Do** ration teal and gold — reserve full-strength color for data that genuinely warrants attention.
- **Do** pair gain/loss color with sign, arrow, or label cues; never rely on hue alone.
- **Do** keep the Rationed Accent, Two-Reds, Tonal-Step, and Monospace Money rules intact through any reskin.
- **Do** honor `prefers-reduced-motion` on every animation (already wired in `globals.css`).

### Don't:
- **Don't** drift toward **enterprise / admin-panel blandness** — no flat gray soulless tables; density must stay legible and calm, never corporate back-office.
- **Don't** introduce **purple-gradient AI-SaaS** cues — no violet/indigo gradients, no decorative glassmorphism, no AI-startup sheen.
- **Don't** use heavy drop-shadows to fake elevation; use the tonal step.
- **Don't** use the alarm **Destructive Red** for ordinary negative balances — that's Loss Coral's job.
- **Don't** spray teal or gold across large neutral surfaces just to look "designed."
- **Don't** use gradient text or `border-left`/`border-right` colored side-stripes as accents.
