# Transaction Tags — Explained

> Generated from: `docs/archive/tags-spec.md`, `docs/archive/tags-plan.xml`, `docs/archive/tags-verification.md`, `docs/archive/tags-v2-spec.md`, `docs/archive/tags-v2-plan.xml`, `docs/archive/tags-v2-verification.md`
> Branch: `feature/transaction-tags`
> Date: 2026-03-17

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 18 (15 V1 + 3 V2) |
| Files created | 7 |
| Files modified | 28 |
| Tests written | 4 test files (1290+ lines) |
| Commits | 22 |
| Phases | 2 (V1 foundation + V2 UX polish) |

**In one sentence:** Users can now attach colored, reusable labels ("tags") to any expense, income, or transfer transaction — creating and selecting them inline from within the form, with tags rendered as colorful pills both inside the input and on transaction cards.

---

## What Was Built

Before this feature, every transaction in Money Map stood alone — no way to group a flight and a hotel under "Bangkok Trip," or track several purchases as "Home Renovation." Tags solve this by letting users attach free-form labels to any transaction type. Tags are shared across expenses, income, and transfers, so "Bangkok Trip" works everywhere.

The experience is fully inline: when creating or editing a transaction, a tag input field appears at the bottom of the form. Users can type to filter existing tags, select them from a dropdown, or type a brand-new name and press Enter to create it on the spot. Created tags automatically get a stable, unique color. On mobile, transaction cards show up to three tag pills below the category line, with a "+N more" overflow indicator.

V2 refined the UX after V1 shipped: pills now appear inline inside the input field (like Gmail's "To:" field) instead of above it, focus no longer causes a flickering dropdown, and Enter key behavior was corrected to prioritize selection over creation when an exact match exists.

---

## Deep Dive

### Data Layer

**File:** [prisma/schema.prisma](prisma/schema.prisma) — commit `be1ddbd`

A new `Tag` model was added:

```prisma
model Tag {
  id                   String                @id @default(cuid())
  userId               String                @map("user_id")
  name                 String                @db.VarChar(50)
  color                String                @db.VarChar(25)  // stored as "hsl(120, 65%, 60%)"
  createdAt            DateTime              @default(now()) @map("created_at")
  updatedAt            DateTime              @updatedAt @map("updated_at")
  expenseTransactions  ExpenseTransaction[]
  incomeTransactions   IncomeTransaction[]
  transferTransactions TransferTransaction[]
  user                 User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@map("tags")
}
```

Key design decisions:
- **`@@unique([userId, name])`** — prevents duplicate tag names per user. Case-insensitive enforcement is handled in the API layer.
- **Color stored as a string** — e.g., `"hsl(120, 65%, 60%)"` — computed once at creation and stored so it never shifts if tags are reordered or deleted. This mirrors the pattern used in `CategoryBreakdownChart.tsx`.
- **Many-to-many via implicit join tables** — Prisma auto-creates `_ExpenseTransactionToTag`, `_IncomeTransactionToTag`, and `_TransferTransactionToTag`. No explicit junction model is needed because there are no extra columns on the join (just IDs).
- **`onDelete: Cascade`** on `user` — deleting a user deletes all their tags. Deleting a tag disconnects it from all transactions (Prisma's default many-to-many behavior).

Each of the three transaction models and the `User` model each received a `tags Tag[]` relation field, wiring up the many-to-many.

The migration was run manually by the user after the schema was committed — Money Map has a single production database with no test environment, so migrations are never automated.

---

### API Layer

#### `GET/POST /api/tags` — [src/app/api/tags/route.ts](src/app/api/tags/route.ts)

**GET** — Returns all tags for the authenticated user, ordered by name ascending:
```ts
db.tag.findMany({ where: { userId }, orderBy: { name: "asc" } })
```
No pagination — the assumption is that a user's tag count is small enough for a flat list.

**POST** — Creates a new tag. The color assignment algorithm:
```ts
const existingCount = await db.tag.count({ where: { userId } });
const color = `hsl(${Math.round((existingCount * 360) / Math.max(existingCount + 1, 1))}, 65%, 60%)`;
```
This distributes colors evenly around the HSL color wheel based on how many tags already exist. If the user has 3 tags, the 4th gets `hsl(270, 65%, 60%)` (evenly spaced at 90° intervals). The color is computed once and stored — it won't change even if other tags are deleted.

A `@@unique([userId, name])` constraint on the DB means duplicate names return a Prisma error. The API catches this and returns HTTP 409.

#### `DELETE/PATCH /api/tags/[id]` — [src/app/api/tags/[id]/route.ts](src/app/api/tags/[id]/route.ts)

**DELETE** — Verifies ownership (`tag.userId === session.user.id`), then `db.tag.delete`. Prisma automatically disconnects the tag from all transactions via the implicit join tables. Returns `{ deleted: true }`.

**PATCH** — Renames a tag. Validated by `RenameTagSchema` (1–50 chars). Same ownership check. Returns the updated tag object.

#### Transaction routes — commits `bfc99ea`, `1b772b1`, `41a5f26`

All 6 transaction routes (POST + PATCH for expense, income, transfer) were updated to:

1. Accept an optional `tagIds: z.array(z.string()).max(10).optional()` field in their Zod schemas.
2. **On POST (create):** Use Prisma's `connect` syntax to link tags to the new transaction:
   ```ts
   tags: { connect: tagIds.map((id) => ({ id })) }
   ```
3. **On PATCH (edit):** Use Prisma's `set` syntax to fully replace the transaction's tag list:
   ```ts
   tags: { set: tagIds.map((id) => ({ id })) }
   ```
   The `set` operation is a complete replacement — it disconnects all current tags and connects the new set atomically.
4. **On GET:** Include `tags: true` in the Prisma `include` clause so the response carries full tag objects (`{ id, name, color, ... }`).

---

### State & Data Fetching Layer

**File:** [src/hooks/useTagsQuery.ts](src/hooks/useTagsQuery.ts) — commits `aeff086`, `7dcc141`

The hook wraps TanStack Query and exposes:

| Export | What it does |
|--------|-------------|
| `tags` | All user tags, fetched from `GET /api/tags`, cached for 5 minutes (`staleTime: 5 * 60 * 1000`) |
| `isLoading` | Loading state from `useQuery` |
| `createTag(name)` | Simple async create: fires `POST /api/tags`, then invalidates the `["tags"]` query key |
| `createTagOptimistic(name)` | Instant optimistic create (see below) |
| `deleteTag(id)` | Fires `DELETE /api/tags/:id`, invalidates cache on success |
| `isCreating`, `isDeleting` | Pending states for mutations |

**Optimistic tag creation** (`createTagOptimistic`) is the most technically interesting part of the hook. The problem it solves: when a user types "Bangkok" and presses Enter, there's a network round-trip before the API responds. Without optimism, the pill would only appear after the server responds (~200–500ms), creating a noticeable lag.

The solution:
```ts
const createTagOptimistic = (name: string) => {
  const optimisticId = `optimistic-${Date.now()}`;

  // 1. Inject a fake tag into the cache immediately
  queryClient.setQueryData<Tag[]>(["tags"], (old = []) => [
    ...old,
    { id: optimisticId, name, color: "hsl(0, 0%, 60%)" /* grey */ , ... }
  ]);

  // 2. Fire the real API call in the background
  const settle = createTagMutation.mutateAsync(name).then((realTag) => {
    // 3. Atomically swap optimistic entry for real entry (preserves position)
    queryClient.setQueryData<Tag[]>(["tags"], (old = []) =>
      old.map((t) => (t.id === optimisticId ? realTag : t))
    );
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    return realTag;
  });

  return { optimisticId, settle };
};
```

The caller (`TagInput`) uses the `optimisticId` to immediately add the pill to `selectedTagIds`. When `settle` resolves, it swaps the temporary ID for the real one. On failure, the pill is removed. The optimistic tag gets a grey color (`hsl(0, 0%, 60%)`) since the real color (computed server-side from current tag count) isn't known yet — it gets replaced with the real color when the API responds.

The three transaction query hooks (`useExpenseTransactionsQuery`, `useIncomeTransactionsQuery`, `useTransferTransactionsQuery`) were updated to add `tags?: { id: string; name: string; color: string }[]` as an optional field on each transaction type, matching what the GET endpoints now return.

---

### UI Layer

#### `TagInput` component — [src/components/shared/TagInput.tsx](src/components/shared/TagInput.tsx) — commits `0f96dc1`, `eed02da`, `62270ae`

This is the centerpiece of the feature — used in 11 places (5 create forms, 3 edit forms, 3 tables).

**Props interface** (intentionally minimal and stable):
```ts
interface TagInputProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}
```

The component is "controlled" — the parent manages the selected tag IDs via React Hook Form, and `TagInput` derives everything from those IDs by looking up the full tag objects from `useTagsQuery`.

**Structure after V2 redesign:**

```
<Popover>           ← controls dropdown open/close state
  <PopoverAnchor>   ← anchors dropdown to the pill container
    <div>           ← styled like an Input (border, focus-within ring)
      <Badge />     ← one per selected tag, inline in the container
      <Badge />
      <input />     ← bare input, no border (container handles the ring)
    </div>
  </PopoverAnchor>
  <PopoverContent>  ← dropdown: filtered tag list + "Create" option
    <Command>
      <CommandList>
        <CommandGroup> ← existing tags
        <CommandGroup> ← "Create '...'" option
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Why `PopoverAnchor` wrapping the entire container `div` (not just the `<input>`)? Radix's Popover needs to know what element to anchor the dropdown to. Wrapping the full pill container means the dropdown aligns to the left edge of the container and matches its width (`w-[var(--radix-popover-trigger-width)]`), not just the bare input.

**Enter key priority** (fixed in V2):
```
1. Exact match exists → select that tag (even if it's already a partial match)
2. No exact match, text is non-empty → create new tag (even if partial matches exist)
3. Empty input → do nothing
```

The original V1 bug: the first branch fired on any partial match, meaning typing "Ban" with "Bangkok" in the list would create a new "Ban" tag. The fix checks `exactMatch` first.

**Focus behavior** (fixed in V2):
```ts
const handleFocus = () => {
  const hasUnselectedTags = tags.some((t) => !selectedTagIds.includes(t.id));
  setOpen(hasUnselectedTags);
};
```
Only opens the dropdown on focus if there are tags to suggest. This prevents the "flicker" where the dropdown appears then disappears on empty focus.

**Inline pill layout:** Each selected tag renders as a `<Badge variant="secondary">` inside the container div, with a 2×2px colored dot (`<span style={{ backgroundColor: tag.color }} />`), the tag name, and an ✕ button. The ✕ button uses `e.stopPropagation()` to prevent the container's `onClick` (which re-focuses the input) from interfering.

**10-tag limit:** When `selectedTagIds.length >= 10`, the `<input>` is hidden and a `(max 10 tags)` message renders instead. The `handleSelect` guard also checks `selectedTagIds.length < MAX_TAGS` before adding.

#### Tags in transaction forms — commits `d378b27`, `8e0cd55`, `2d70d87`

`TagInput` was added to all 6 create forms and all 3 edit forms. The integration pattern is identical across all of them:

1. Add `tagIds: []` to the React Hook Form `defaultValues`.
2. Place `<TagInput>` in the JSX, connected to the form:
   ```tsx
   <TagInput
     selectedTagIds={form.watch("tagIds") ?? []}
     onChange={(ids) => form.setValue("tagIds", ids)}
   />
   ```
3. Include `tagIds` in the payload sent to the mutation.

#### `TagsCell` in tables — commit `975cafa`

**Files:** [src/components/tables/expenses/ExpenseTable.tsx](src/components/tables/expenses/ExpenseTable.tsx), [src/components/tables/income/IncomeTable.tsx](src/components/tables/income/IncomeTable.tsx), [src/components/tables/transfers/TransferTable.tsx](src/components/tables/transfers/TransferTable.tsx)

Each table has a `TagsCell` component for inline editing. The V2 bug: when a user edits tags in a table row, `onChange` stores `string[]` (tag IDs) into the table's local state via `updateData`. On the next render, the read-mode branch reads this data and tries to render it as `{ id, name, color }[]` — but it's still `string[]`. Every badge gets `key={undefined}`, causing React's key warning.

**Fix:** Import `useTagsQuery` into each table component and use it to normalize tag data in the read-mode render path:
```ts
const { tags: allTags } = useTagsQuery();

// In read mode, normalize: if data is string[], look up full objects
const normalizedTags = Array.isArray(rawTags)
  ? rawTags.map((item) =>
      typeof item === "string"
        ? allTags.find((t) => t.id === item)
        : item
    ).filter(Boolean)
  : [];
```
Now badges always have stable `key={tag.id}` values.

#### `CompactTransactionCard` — [src/components/transactions/CompactTransactionCard.tsx](src/components/transactions/CompactTransactionCard.tsx) — commit `53ca87a`

Tags are displayed on mobile transaction cards:
```tsx
{tags && tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {tags.slice(0, 3).map((tag) => (
      <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
        {tag.name}
      </Badge>
    ))}
    {tags.length > 3 && (
      <span className="text-[10px] text-muted-foreground">+{tags.length - 3} more</span>
    )}
  </div>
)}
```

The `tags` prop is optional (`tags?: { id: string; name: string; color: string }[]`) — the block only renders when tags exist. `TransactionsMobileView.tsx` was updated to pass `tags={transaction.tags}` from the query response.

---

### Validation Layer

**File:** [src/lib/validations/expense-transactions.ts](src/lib/validations/expense-transactions.ts) (and income + transfer equivalents) — commit `d14b638`

One line was added to each transaction schema:
```ts
tagIds: z.array(z.string()).max(10).optional(),
```

This validation runs on the client side (React Hook Form uses it to validate the form before submission) and mirrors the server-side validation in the API routes. The `.optional()` ensures all existing form submissions without tags continue to work unchanged — full backwards compatibility.

---

## Data Flow

The most important user action: **creating a new tag by typing its name and pressing Enter**.

```
1. User types "Bangkok" in the TagInput inside CreateExpenseTransactionDrawer
2. TagInput's handleKeyDown fires on Enter
3. No exact match found → handleCreate() is called
4. createTagOptimistic("Bangkok") is called on useTagsQuery
5. Optimistic tag { id: "optimistic-1234", name: "Bangkok", color: "hsl(0, 0%, 60%)" }
   is injected into the ["tags"] query cache via queryClient.setQueryData
6. TagInput calls onChange([...selectedTagIds, "optimistic-1234"])
7. React Hook Form's tagIds field now includes "optimistic-1234"
8. A grey "Bangkok ✕" pill renders immediately inside the input container
9. In the background, POST /api/tags fires with { name: "Bangkok" }
10. API validates with CreateTagSchema (Zod)
11. db.tag.count runs to determine color index
12. db.tag.create runs: { userId, name: "Bangkok", color: "hsl(240, 65%, 60%)" }
13. API responds 201 with the real Tag object (including real id and real color)
14. settle promise resolves — queryClient.setQueryData swaps optimistic entry for real tag
15. TagInput swaps "optimistic-1234" for the real ID in selectedTagIds
16. The pill color updates from grey to "hsl(240, 65%, 60%)"
17. User submits the form → POST /api/expense-transactions fires with tagIds: [realTagId]
18. Transaction API runs db.expenseTransaction.create with tags: { connect: [{ id: realTagId }] }
19. useExpenseTransactionsQuery is invalidated
20. Transaction list re-fetches and the new expense shows the "Bangkok" tag badge
```

---

## Files Changed

| File | Change Type | What Changed |
|------|------------|--------------|
| [prisma/schema.prisma](prisma/schema.prisma) | Modified | Added `Tag` model, `tags Tag[]` on all 3 transaction models and `User` |
| [src/app/api/tags/route.ts](src/app/api/tags/route.ts) | Created | GET (list tags) + POST (create tag with auto color) |
| [src/app/api/tags/[id]/route.ts](src/app/api/tags/[id]/route.ts) | Created | DELETE (remove tag) + PATCH (rename tag) |
| [src/hooks/useTagsQuery.ts](src/hooks/useTagsQuery.ts) | Created | TanStack Query hook for tags with optimistic create |
| [src/components/shared/TagInput.tsx](src/components/shared/TagInput.tsx) | Created | Inline pill tag input with combobox dropdown |
| [src/app/api/expense-transactions/route.ts](src/app/api/expense-transactions/route.ts) | Modified | Added `tagIds` to Zod schema, `connect` in POST, `tags: true` in GET include |
| [src/app/api/expense-transactions/[id]/route.ts](src/app/api/expense-transactions/[id]/route.ts) | Modified | Added `tagIds` to Zod schema, `set` in PATCH, `tags: true` in GET include |
| [src/app/api/income-transactions/route.ts](src/app/api/income-transactions/route.ts) | Modified | Same pattern as expense — tagIds in POST + GET |
| [src/app/api/income-transactions/[id]/route.ts](src/app/api/income-transactions/[id]/route.ts) | Modified | Same pattern as expense — tagIds in PATCH + GET |
| [src/app/api/transfer-transactions/route.ts](src/app/api/transfer-transactions/route.ts) | Modified | Same pattern as expense — tagIds in POST + GET |
| [src/app/api/transfer-transactions/[id]/route.ts](src/app/api/transfer-transactions/[id]/route.ts) | Modified | Same pattern as expense — tagIds in PATCH + GET |
| [src/lib/validations/expense-transactions.ts](src/lib/validations/expense-transactions.ts) | Modified | Added `tagIds: z.array(z.string()).max(10).optional()` |
| [src/lib/validations/income-transactions.ts](src/lib/validations/income-transactions.ts) | Modified | Same — added tagIds field |
| [src/lib/validations/transfer-transactions.ts](src/lib/validations/transfer-transactions.ts) | Modified | Same — added tagIds field |
| [src/hooks/useExpenseTransactionsQuery.ts](src/hooks/useExpenseTransactionsQuery.ts) | Modified | Added `tags?` field to `ExpenseTransaction` type |
| [src/hooks/useIncomeTransactionsQuery.ts](src/hooks/useIncomeTransactionsQuery.ts) | Modified | Added `tags?` field to `IncomeTransaction` type |
| [src/hooks/useTransferTransactionsQuery.ts](src/hooks/useTransferTransactionsQuery.ts) | Modified | Added `tags?` field to `TransferTransaction` type |
| [src/components/forms/CreateExpenseTransactionDrawer.tsx](src/components/forms/CreateExpenseTransactionDrawer.tsx) | Modified | Added TagInput, `tagIds` in defaultValues and payload |
| [src/components/forms/CreateExpenseTransactionSheet.tsx](src/components/forms/CreateExpenseTransactionSheet.tsx) | Modified | Same as Drawer |
| [src/components/forms/EditExpenseDrawer.tsx](src/components/forms/EditExpenseDrawer.tsx) | Modified | Added TagInput, `tagIds` pre-populated from transaction |
| [src/components/forms/CreateIncomeTransactionDrawer.tsx](src/components/forms/CreateIncomeTransactionDrawer.tsx) | Modified | Added TagInput |
| [src/components/forms/CreateIncomeTransactionSheet.tsx](src/components/forms/CreateIncomeTransactionSheet.tsx) | Modified | Added TagInput |
| [src/components/forms/EditIncomeDrawer.tsx](src/components/forms/EditIncomeDrawer.tsx) | Modified | Added TagInput pre-populated from transaction |
| [src/components/forms/CreateTransferDrawer.tsx](src/components/forms/CreateTransferDrawer.tsx) | Modified | Added TagInput |
| [src/components/forms/EditTransferDrawer.tsx](src/components/forms/EditTransferDrawer.tsx) | Modified | Added TagInput pre-populated from transaction |
| [src/components/tables/expenses/ExpenseTable.tsx](src/components/tables/expenses/ExpenseTable.tsx) | Modified | Fixed TagsCell key warning — normalize string[] to tag objects using useTagsQuery |
| [src/components/tables/income/IncomeTable.tsx](src/components/tables/income/IncomeTable.tsx) | Modified | Same TagsCell fix |
| [src/components/tables/transfers/TransferTable.tsx](src/components/tables/transfers/TransferTable.tsx) | Modified | Same TagsCell fix |
| [src/components/transactions/CompactTransactionCard.tsx](src/components/transactions/CompactTransactionCard.tsx) | Modified | Added optional `tags` prop, renders up to 3 tag badges + overflow count |
| [src/components/transactions/TransactionsMobileView.tsx](src/components/transactions/TransactionsMobileView.tsx) | Modified | Passes `tags={transaction.tags}` to CompactTransactionCard |

---

## Tests Added

| Test File | What It Tests | Key Cases |
|-----------|--------------|-----------|
| [src/app/api/tags/route.test.ts](src/app/api/tags/route.test.ts) | `GET /api/tags` and `POST /api/tags` | Authenticated list, unauthenticated 401, successful create, duplicate name 409, name too long 400 |
| [src/app/api/tags/[id]/route.test.ts](src/app/api/tags/[id]/route.test.ts) | `DELETE /api/tags/[id]` and `PATCH /api/tags/[id]` | Successful delete, delete 404, wrong owner 404, successful rename, rename duplicate 409 |
| [src/hooks/useTagsQuery.test.ts](src/hooks/useTagsQuery.test.ts) | `useTagsQuery` hook | Fetch tags, create tag + cache update, optimistic create + ID swap, delete tag + invalidate, loading states |
| [src/components/shared/TagInput.test.tsx](src/components/shared/TagInput.test.tsx) | `TagInput` component | Render with no tags, add existing tag from dropdown, create new tag on Enter, exact-match Enter selects (doesn't create), partial-match Enter creates new, remove pill via ✕, disabled state, 10-tag limit hides input |

Final test suite: **686 tests across 43 test files** — all passing.

---

## Key Concepts Used

| Concept | What It Is | How It Was Used Here |
|---------|-----------|----------------------|
| Prisma implicit many-to-many | When two models reference each other via `Model[]` arrays without an explicit join model, Prisma auto-creates a hidden join table | `Tag` ↔ `ExpenseTransaction`, `IncomeTransaction`, `TransferTransaction` — Prisma created three join tables automatically |
| Prisma `connect` | Links existing records in a many-to-many on create | `tags: { connect: tagIds.map(id => ({ id })) }` — attaches selected tags to a new transaction |
| Prisma `set` | Replaces an entire many-to-many relation in one atomic operation | `tags: { set: tagIds.map(id => ({ id })) }` — replaces a transaction's tags on edit |
| TanStack Query `useQuery` | Fetches and caches server data, with configurable staleness | `useTagsQuery` fetches all user tags and caches for 5 minutes |
| TanStack Query `useMutation` | Manages server-side writes with loading/error states | `createTagMutation`, `deleteTagMutation` wrap API calls |
| `queryClient.setQueryData` | Directly writes to the TanStack Query cache without a network request | Used in optimistic creation to inject a fake tag immediately, then swap it for the real one |
| `queryClient.invalidateQueries` | Marks a query as stale, triggering a background refetch | Called after tag create/delete to sync the cache |
| Optimistic update | Updating the UI before the server confirms, then reconciling | `createTagOptimistic` shows a grey pill instantly, then swaps color/ID once the API responds |
| Radix `PopoverAnchor` | Positions a Popover relative to a specific element (not necessarily the trigger) | Wraps the full pill container so the dropdown anchors to and matches the width of the entire input |
| `cmdk` `Command` component | A headless, accessible command palette / combobox | Powers the tag search dropdown — `CommandList`, `CommandItem`, `CommandEmpty`, `CommandGroup` |
| Zod `.optional()` on existing schemas | Extending a validated shape without breaking existing consumers | `tagIds: z.array(z.string()).max(10).optional()` — existing form submissions without tagIds still pass validation |
| `focus-within` CSS pseudo-class | Applies styles to a container when any child has focus | The pill container `div` uses `focus-within:ring-2` to show the same focus ring as a standard `<Input>` component, even though the actual `<input>` is unstyled |

---

## What To Look At Next

- [src/hooks/useExpenseTransactionsQuery.ts](src/hooks/useExpenseTransactionsQuery.ts) — See how the `tags?` field was added to the `ExpenseTransaction` type and how TanStack Query pagination/caching works for the main transaction list. The tags feature plugs into this established pattern.
- [src/components/forms/EditExpenseDrawer.tsx](src/components/forms/EditExpenseDrawer.tsx) — The edit form shows the full lifecycle: loading existing tag IDs from the transaction into React Hook Form's `defaultValues`, then submitting them via PATCH. It's the clearest example of the round-trip from DB → form → API.
- [src/app/api/expense-transactions/[id]/route.ts](src/app/api/expense-transactions/[id]/route.ts) — The PATCH handler demonstrates Prisma's `set` operation and how `include: { tags: true }` propagates tag objects back to the client. This pattern is the same in all three transaction types.
