# Product

## Register

product

## Users

A single primary user: the person who built money-map to manage their own money. This is a personal finance tool, not a multi-tenant SaaS. The user checks in daily-to-weekly to see where they stand — net worth, account balances, credit cards, recent transactions, budgets, income, and reports. Because it's one known operator rather than an anonymous audience, the design can assume familiarity and reward return visits: no hand-holding onboarding, no marketing surface, no lowest-common-denominator simplification. The user is comfortable with the vocabulary of personal finance (net worth, assets vs. liabilities, budgets, transfers), so density and precision are assets, not liabilities — as long as the screen stays calm.

## Product Purpose

money-map is a personal net-worth and money-tracking dashboard. It aggregates accounts, credit cards, transactions, expenses, income, transfers, budgets, and reports into one place so the user can answer, at a glance, "where do I stand right now, and which way am I trending?" Success is a tool the user *wants* to open — one that makes the state of their money feel legible and under control, and that surfaces the net-worth trend and recent activity without effort. It is a private instrument, not a product to be sold; craft here is for the user's own daily experience.

## Brand Personality

**Calm, trustworthy, precise.** The interface should feel like a well-made private instrument — quiet confidence over flash. Money is emotionally loaded; the design's job is to reduce anxiety, not manufacture excitement. Voice is understated and exact: real numbers, honest trends, no hype. When the app draws attention, it's because something genuinely warrants it (a budget over its limit, a net-worth swing), never for decoration. Restraint is the personality: the design earns trust by being legible, consistent, and unsurprising in all the right ways, distinctive in the few that matter.

## Anti-references

- **Enterprise / admin-panel blandness.** No gray, dense, soulless SAP/admin aesthetic. Legibility and density must not curdle into a lifeless spreadsheet. The tool is precise, but it is not a corporate back-office.
- **Purple-gradient AI-SaaS.** No violet/indigo gradients, no glassmorphism-by-default, no generic AI-startup marketing sheen. The redesign must not read as "another AI tool."
- (Carried from the design brief) Not a generic neon-and-glass "crypto dashboard," and not a gamified/cartoonish consumer app with mascots and confetti.

## Design Principles

1. **Clarity over cleverness.** Every screen answers a money question first. If a visual flourish costs legibility, the flourish loses.
2. **Calm confidence.** The interface lowers financial anxiety. Emphasis is rationed; a screen at rest is quiet, and attention is spent only where the data earns it.
3. **Precision you can trust.** Numbers are exact, aligned, and unambiguous. Gains and losses read instantly and honestly. The user should never doubt what they're seeing.
4. **Density with breathing room.** This is a power user's daily tool, so it can be information-rich — but rhythm and spacing keep richness from becoming a wall.
5. **Distinct, not decorated.** Stand apart from generic fintech through typographic craft, considered color, and restraint — not through gimmicks, gradients, or glass.

## Accessibility & Inclusion

No formal WCAG conformance target is required (single known user). Baseline good practice still holds because it directly serves this user: body text stays comfortably readable against dark surfaces, focus states remain visible for keyboard use, and all motion respects `prefers-reduced-motion` (already wired in `globals.css`). Because finance relies on red/green gain-loss semantics, color is paired with sign/arrow/label cues rather than carried by hue alone — a correctness concern here, not just an accessibility one.
