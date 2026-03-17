# Tags Feature — Design Specification

## Overview

Tags allow users to attach free-form, reusable identifiers (e.g., "Bangkok Trip", "Home Renovation") to any transaction type (expense, income, transfer). Tags are **optional**, **backwards-compatible** (can be added to old transactions), and designed to power future report-page filtering / grouping.

## Requirements

1. A transaction can have **0–10** tags.
2. Tags are **not required** on any form.
3. Tags are **shared** across all three transaction types.
4. A tag name is unique per user (case-insensitive).
5. Tags are assigned an **auto-generated color** on creation, using the same HSL color-wheel distribution used in `CategoryBreakdownChart.tsx`:
   ```ts
   const generateTagColor = (index: number, total: number): string =>
     `hsl(${(index * 360) / Math.max(total, 1)}, 65%, 60%)`
   ```
   The color is generated at creation time based on the user's current tag count and stored persistently so it remains stable.
6. Tag management is **inline** within transaction forms (create and edit). No dedicated management page.
7. Existing transactions with no tags continue to work unchanged (backwards compatible).

---

## Data Model

### New `Tag` Model

```prisma
model Tag {
  id                   String                @id @default(cuid())
  userId               String                @map("user_id")
  name                 String                @db.VarChar(50)
  color                String                @db.VarChar(25) // stored as "hsl(120, 65%, 60%)"
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

### Changes to Existing Models

Each transaction model receives one new field:

```prisma
// In ExpenseTransaction
tags Tag[]

// In IncomeTransaction
tags Tag[]

// In TransferTransaction
tags Tag[]
```

The `User` model receives:

```prisma
tags Tag[]
```

Prisma will auto-create three implicit join tables:
- `_ExpenseTransactionToTag`
- `_IncomeTransactionToTag`
- `_TransferTransactionToTag`

---

## API Design

### New: `/api/tags`

| Method | Purpose | Request Body | Response |
|--------|---------|-------------|----------|
| `GET`  | List all tags for the authenticated user | — | `Tag[]` |
| `POST` | Create a new tag | `{ name: string }` (color auto-assigned) | `Tag` |

### New: `/api/tags/[id]`

| Method   | Purpose | Request Body | Response |
|----------|---------|-------------|----------|
| `DELETE` | Delete a tag (disconnects from all transactions) | — | `{ deleted: true }` |
| `PATCH`  | Rename a tag | `{ name: string }` | `Tag` |

### Changes to Existing Transaction Routes

All 6 transaction POST/PATCH routes accept an optional `tagIds: string[]` field:

- **POST** (create): connects the specified tags on creation.
- **PATCH** (edit): replaces the transaction's tag set with the provided `tagIds` (using Prisma `set`).

The GET routes include tags in the response via `include: { tags: true }`.

### Zod Schemas

All transaction validation schemas (client + server) add:
```ts
tagIds: z.array(z.string()).max(10).optional()
```

---

## UI Design

### `TagInput` Component

**Location:** `src/components/shared/TagInput.tsx`

A reusable, controlled component used in all transaction create/edit forms. It receives:

```ts
interface TagInputProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
}
```

**Behavior:**
1. Renders selected tags as `Badge` pills (using the existing `src/components/ui/badge.tsx`) with:
   - Tag name as label
   - Small colored dot using the tag's stored HSL color
   - An ✕ button to remove
2. Shows a text input that triggers a **combobox dropdown** (using the existing `cmdk` / `Command` component):
   - Filters existing user tags as the user types
   - Shows a "Create \<tag-name\>" option at the bottom if no exact match exists
3. Pressing Enter or clicking "Create" creates the tag via `POST /api/tags` and immediately adds it.
4. Enforces the 10-tag limit client-side; hides the input when 10 tags are selected.

**Placement:**
- All 6 **create** forms (Drawers + Sheets for Expense/Income/Transfer) — added after the description/notes field
- All **edit** forms (Edit Drawers + Sheets for Expense/Income/Transfer)

### Tag Display on Transaction Cards

In `CompactTransactionCard.tsx`, tags will render as a row of small `Badge` pills below the category/account line. Each pill shows the tag name with its HSL color as the background or a colored dot, keeping it visually lightweight.

### `useTagsQuery` Hook

**Location:** `src/hooks/useTagsQuery.ts`

Fetches and caches all user tags via TanStack Query. Provides:
- `tags: Tag[]` — all user tags
- `createTag(name: string): Promise<Tag>` — creates a tag via POST, invalidates cache
- `deleteTag(id: string): Promise<void>` — deletes a tag via DELETE, invalidates cache

---

## What NOT To Do

- ❌ **Don't use `String[]` on each transaction** — breaks referential integrity and makes cross-type filtering unreliable.
- ❌ **Don't install a third-party tag input library** — the project has `Badge`, `Popover`, `Command` (cmdk), and `Input` already; adding a library would be unnecessary bloat.
- ❌ **Don't make tags required** — they must always be optional with a default empty array.
- ❌ **Don't create separate tag tables per transaction type** — one shared `Tag` model ensures a tag like "Bangkok" works across expenses, income, and transfers.
- ❌ **Don't assign colors via CSS class** — store the computed HSL string in the database so it's stable and doesn't shift when tags are reordered or deleted.
- ❌ **Don't skip the `@@unique([userId, name])` constraint** — prevents duplicate tag names per user, which would cause confusion.

---

## Handoff Note for Builder

**Feature:** Transaction Tags
**Branch name suggestion:** `feature/transaction-tags`
**Files most likely to be affected:**
- `prisma/schema.prisma` — new `Tag` model + relation fields on all 3 transaction models + `User`
- `src/app/api/tags/route.ts` — new GET/POST endpoint
- `src/app/api/tags/[id]/route.ts` — new DELETE/PATCH endpoint
- `src/app/api/expense-transactions/route.ts` — add `tagIds` to POST schema + `include: { tags: true }`
- `src/app/api/expense-transactions/[id]/route.ts` — add `tagIds` to PATCH schema + `include: { tags: true }`
- `src/app/api/income-transactions/route.ts` + `[id]/route.ts` — same changes
- `src/app/api/transfer-transactions/route.ts` + `[id]/route.ts` — same changes
- `src/lib/validations/expense-transactions.ts` — add optional `tagIds` field
- `src/lib/validations/income-transactions.ts` — add optional `tagIds` field
- `src/lib/validations/transfer-transactions.ts` — add optional `tagIds` field
- `src/hooks/useTagsQuery.ts` — new hook
- `src/hooks/useExpenseTransactionsQuery.ts` — type updates for tags
- `src/hooks/useIncomeTransactionsQuery.ts` — type updates for tags
- `src/hooks/useTransferTransactionsQuery.ts` — type updates for tags
- `src/components/shared/TagInput.tsx` — new component
- `src/components/forms/Create*.tsx` (6 files) — add `TagInput`
- `src/components/forms/Edit*.tsx` (6 files) — add `TagInput`
- `src/components/transactions/CompactTransactionCard.tsx` — display tags

**Watch out for:**
- Prisma migration: implicit M2M creates 3 join tables; migration should be reviewed to confirm no data loss on existing tables
- The `generateTagColor` function assigns colors at creation time; if many tags are deleted and recreated, colors may cluster. This is acceptable for V1.
- Transfer transaction forms don't have `EditTransferSheet.tsx` — verify the edit form pattern for transfers
- All existing tests must continue passing — the new `tagIds` field is optional so existing test payloads should not break
- System-generated installment payments should NOT inherit tags from the parent — they are auto-created records

**Verification focus:**
- Run `prisma migrate dev` and confirm no data loss + join tables created
- Run `npm run build` — must pass with no TypeScript errors
- Run `npm run test` — all existing unit tests must pass
- Manually verify: create an expense with 2 tags, edit an old expense to add a tag, confirm tags appear on the transaction card
- Confirm tag autocomplete shows existing tags and allows inline creation
- Confirm the 10-tag limit is enforced in the UI
