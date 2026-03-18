# Cards Tags Display Spec

## Objective

Add tag badge display to the three older transaction card components (`ExpenseCard`, `IncomeCard`, `TransferCard`) to achieve visual parity with `CompactTransactionCard`, which already renders tags as colored outline badges. Because these cards have fundamentally different layouts from `CompactTransactionCard`, tag placement must be designed individually for each card to preserve visual hierarchy and spacing.

## Scope

### In Scope

1. Add an optional `tags` prop to `ExpenseCard`, `IncomeCard`, and `TransferCard`.
2. Render tag badges inside each card, adapting the `CompactTransactionCard` badge pattern to each card's unique vertical layout.
3. Update the parent page components (`src/app/expenses/page.tsx`, `src/app/income/page.tsx`, `src/app/transfers/page.tsx`) to pass the `tags` prop from the hook data to each card.
4. Update existing unit tests (`ExpenseCard.test.tsx`, `IncomeCard.test.tsx`) to cover the new tags rendering. Add a test file for `TransferCard` if one does not exist.

### Out of Scope

- Changes to the `CompactTransactionCard` component (already complete).
- Changes to API routes or hooks (tags are already included in all three hook return types).
- Database or schema changes (none required).
- Desktop table views (tags are rendered separately in table columns, not in cards).

## Design Analysis

### Layout Comparison

The four card components differ substantially in structure:

| Aspect | CompactTransactionCard | ExpenseCard / IncomeCard / TransferCard |
|--------|----------------------|----------------------------------------|
| Direction | Horizontal (icon left, content right) | Vertical (`flex-col gap-3`) |
| Padding | `p-3` (compact) | `p-4 md:p-6` (spacious) |
| Typography | `text-sm` name, `text-xs` metadata | `font-bold md:text-lg lg:text-xl` name |
| Density | Single compact row | Multiple full-width stacked rows |
| Card class | Inline `bg-card border...` | Shared `money-map-card-interactive` |

Because the older cards are vertically stacked with `gap-3` (12px) between rows, tags need to exist as their own row in the vertical flow rather than being tucked into a content column as in `CompactTransactionCard`.

### Design Decisions

#### Badge Sizing: Scale Up for the Larger Cards

The `CompactTransactionCard` uses `text-[10px]` badges with `h-4` (16px) height because it is a dense, small card with `p-3` padding and `text-sm` content. The older cards are significantly larger -- `p-4 md:p-6` padding, `md:text-lg lg:text-xl` headings. Using the same 10px/16px badges would look disproportionately small.

**Decision:** Use `text-xs` (12px) with `h-5` (20px) height and `px-2` horizontal padding for the older cards. This scales proportionally with the larger card typography while remaining clearly secondary to the card title and metadata. The colored dot scales to `w-2 h-2` to match.

**Rationale:** The UI/UX pre-delivery checklist calls for "consistent icon sizing" and visual proportion. Badges should look intentional at the card's scale, not like they were pasted in from a different component. The `text-xs` size matches the existing metadata typography (`text-xs font-bold` for category, `text-xs` for date) so tags sit comfortably alongside that visual tier.

#### Overflow Indicator: Same "+N more" Pattern

Keep the same `+N more` overflow text at `text-xs` (matching the card's metadata size rather than the `text-[10px]` used in the compact card). Max visible tags remains 3 -- this prevents the tag row from dominating the card.

#### Tag Row Placement: Per-Card Analysis

Each card has a different information hierarchy. Tag placement must respect that hierarchy by appearing in the metadata tier (below category/type, above or alongside the date/amount footer).

### Card-by-Card Design

---

#### ExpenseCard

**Current visual structure (top to bottom):**
```
Row 1: [Icon] Transaction Name          (flex items-center gap-2)
Row 2: [Installment badge]              (conditional)
Row 3: ExpenseType > Subcategory        (text-xs font-bold, muted)
Row 4: Date | [Installment details] | PHP Amount + Account  (flex justify-between)
Row 5: [Installment details panel]      (conditional, animated)
```

**Tag placement: Between Row 3 (category) and Row 4 (date/amount footer).**

This is the metadata zone. Category tells you "what kind" of expense; tags tell you "how it's classified." They belong together visually. Placing tags after the category line and before the date/amount footer creates a natural reading flow: Name -> Type -> Tags -> Financial details.

The tag row should use no additional top margin since the parent `gap-3` already provides 12px separation from the category line above. The conditional rendering (`tags && tags.length > 0`) ensures no empty space when tags are absent.

**Special consideration:** ExpenseCard already has a conditional `Badge variant="secondary"` for installments on Row 2. Tag badges use `variant="outline"` which is visually distinct -- the installment badge is a solid secondary fill, while tag badges are outlined with a colored dot. No visual conflict.

---

#### IncomeCard

**Current visual structure (top to bottom):**
```
Row 1: [Icon] Transaction Name          (flex items-center gap-2)
Row 2: IncomeType                       (text-xs font-bold, muted)
Row 3: Date | PHP Amount + Account      (flex justify-between)
```

**Tag placement: Between Row 2 (income type) and Row 3 (date/amount footer).**

Same rationale as ExpenseCard. The income type line is the metadata; tags extend that metadata. The card is simpler (no installment badge, no expandable section), so the tag row is the only potential addition.

---

#### TransferCard

**Current visual structure (top to bottom):**
```
Row 1 (wrapped in flex-col gap-1):
  - [Icon] Transaction Name             (flex items-center gap-2)
  - TransferType                        (text-xs font-bold, muted)
  - Date                                (text-xs, muted)
Row 2: PHP Amount + FromAccount -> ToAccount  (flex flex-col items-end)
```

**Tag placement: After the date line inside the Row 1 wrapper (flex-col gap-1), before Row 2 (amount).**

TransferCard groups its metadata (name, type, date) into a single `flex-col gap-1` wrapper. Tags logically belong at the bottom of this metadata group, after the date. This keeps the tag badges within the left-aligned metadata block, visually separated from the right-aligned amount block below.

The `gap-1` (4px) within the metadata wrapper is tighter than the card-level `gap-3`. The tag row should add `mt-1` (4px) to maintain consistent internal spacing within this group, matching the gap between type and date.

---

### Badge Markup (Adapted for Older Cards)

The following JSX block should be used in all three cards, with the adapted sizing:

```tsx
{tags && tags.length > 0 && (
  <div className="flex flex-wrap gap-1.5">
    {tags.slice(0, 3).map((tag) => (
      <Badge
        key={tag.id}
        variant="outline"
        className="text-xs px-2 py-0 h-5 gap-1"
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color }}
        />
        {tag.name}
      </Badge>
    ))}
    {tags.length > 3 && (
      <span className="text-xs text-muted-foreground self-center">
        +{tags.length - 3} more
      </span>
    )}
  </div>
)}
```

**Differences from `CompactTransactionCard` badge markup:**

| Property | CompactTransactionCard | Older Cards | Reason |
|----------|----------------------|-------------|--------|
| Badge text | `text-[10px]` | `text-xs` (12px) | Proportional to larger card typography |
| Badge height | `h-4` (16px) | `h-5` (20px) | Scaled up for spacious card padding |
| Badge padding | `px-1.5` | `px-2` | More breathing room at larger size |
| Dot size | `w-1.5 h-1.5` | `w-2 h-2` | Proportional to larger badge |
| Wrap gap | `gap-1` | `gap-1.5` | More spacing between larger badges |
| Overflow text | `text-[10px]` | `text-xs` | Matches card metadata size |
| Container margin | `mt-1` | None (parent gap handles it) | Vertical cards use `gap-3` between rows |

### Accessibility Considerations

- **Color is not the only indicator:** Tags include both a colored dot AND a text label, satisfying WCAG 1.4.1 (Use of Color). The color dot is supplementary.
- **Touch targets:** Badge height of `h-5` (20px) with `gap-1.5` (6px) between badges provides adequate spacing. Tags are not independently clickable -- they are informational only, so minimum touch target size (44px) does not apply.
- **Contrast:** `variant="outline"` badges use `border-input` (existing shadcn token), which is already validated for contrast in the app's dark theme. Tag name text uses `foreground` color.

### State Variations

- **No tags (undefined or empty array):** The entire tag row is conditionally rendered. No empty space, no layout shift.
- **1-3 tags:** All tags render as badges in a flex-wrap row.
- **4+ tags:** First 3 tags render as badges, followed by "+N more" overflow text.
- **Loading state:** No change needed -- the card skeleton (`SkeletonIncomeTypeCard`) already covers the full card area. Tags are part of the populated state only.

## Tag Data Shape

All three transaction hooks already expose tags:

```ts
tags?: {
  id: string;
  name: string;
  color: string;
}[];
```

## Implementation Details

### 1. ExpenseCard (`src/components/shared/ExpenseCard.tsx`)

- **Props:** Add `tags?: { id: string; name: string; color: string }[]` to `ExpenseCardProps`.
- **Destructure:** Add `tags` to the component function signature.
- **Import:** Already imports `Badge` (used for installment badge). No new import needed.
- **JSX:** Insert the adapted badge block (shown above) as a new row after the `expenseType`/`expenseSubcategory` paragraph (line 98), before the `<div className='flex items-end justify-between'>` on line 100.

### 2. IncomeCard (`src/components/shared/IncomeCard.tsx`)

- **Props:** Add `tags?: { id: string; name: string; color: string }[]` to `IncomeCardProps`.
- **Destructure:** Add `tags` to the component function signature.
- **Import:** Add `import { Badge } from '../ui/badge'` -- this component does not currently import Badge.
- **JSX:** Insert the adapted badge block after the `incomeType.name` paragraph (line 53), before the `<div className='flex items-end justify-between'>` on line 55.

### 3. TransferCard (`src/components/shared/TransferCard.tsx`)

- **Props:** Add `tags?: { id: string; name: string; color: string }[]` to `TransferCardProps`.
- **Destructure:** Add `tags` to the component function signature.
- **Import:** Add `import { Badge } from '../ui/badge'`.
- **JSX:** Insert the adapted badge block with an additional `mt-1` on the container (`<div className="flex flex-wrap gap-1.5 mt-1">`) inside the metadata wrapper (after the date paragraph on line 55, but still inside the `<div className='flex flex-col gap-1'>` that ends on line 56). This keeps tags grouped with the metadata, not floating as a separate card-level row.

### 4. Parent Pages

Each parent page renders cards in a `.map()` loop. The hook data already includes `tags` on each transaction object.

- **`src/app/expenses/page.tsx`** (~line 217-239): Add `tags={expense.tags}` to the `<ExpenseCard>` component.
- **`src/app/income/page.tsx`** (~line 315-325): Add `tags={income.tags}` to the `<IncomeCard>` component.
- **`src/app/transfers/page.tsx`** (~line 149-159): Add `tags={transfer.tags}` to the `<TransferCard>` component.

### 5. Tests

- **`ExpenseCard.test.tsx`**: Add test cases for: (a) tags render with 1-3 tags showing badge text, (b) overflow "+2 more" indicator with 5 tags, (c) no tag elements when `tags` is undefined.
- **`IncomeCard.test.tsx`**: Same three test cases.
- **`TransferCard.test.tsx`**: Create if it does not exist. Include basic rendering test plus the same three tag test cases. Mock `../icons`, `../ui/badge`, and `lucide-react` ArrowRight.

## Verification Plan

1. `npm run lint` passes with zero errors.
2. `npm run build` passes with zero errors.
3. `npx vitest run src/components/shared/ExpenseCard.test.tsx` passes.
4. `npx vitest run src/components/shared/IncomeCard.test.tsx` passes.
5. `npx vitest run src/components/shared/TransferCard.test.tsx` passes.
6. Manual verification: on mobile viewport (< 768px) of each page (Expenses, Income, Transfers), transaction cards with tags display proportionally-sized badge pills with colored dots; cards without tags show no tag row and no extra whitespace.

---

## Handoff Note

**Builder:** Pay close attention to the **badge sizing differences** between this spec and the `CompactTransactionCard` implementation. These older cards use larger typography and more padding, so the badges are intentionally scaled up (`text-xs`/`h-5`/`px-2`/`w-2 h-2` dot) compared to the compact card's `text-[10px]`/`h-4`/`px-1.5`/`w-1.5 h-1.5`. Do NOT copy the compact card's classes directly.

Also note the **TransferCard placement difference**: tags go INSIDE the `flex-col gap-1` metadata wrapper (after the date, still inside the wrapper div), not as a separate card-level row. This is because TransferCard groups its metadata differently from ExpenseCard and IncomeCard.

All data is already available from the hooks -- no API or schema changes needed. `Badge` is already imported in `ExpenseCard` but must be added to `IncomeCard` and `TransferCard`. Commit each task atomically per the plan.
