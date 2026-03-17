# Tags V2 — Bugfixes & UX Improvements Specification

## Overview

The tags feature (V1) is functionally complete but has three issues that degrade the user experience. This spec covers fixing those issues and improving the TagInput component to match industry-standard pill-input UX (as seen in Linear, GitHub, Gmail).

## Issues

### Issue 1: React key prop warning after editing tags in tables

**Symptom:** After adding a tag to a transaction via the table's inline edit mode, a React warning appears: *"Each child in a list should have a unique key prop."*

**Root Cause:** The `TagsCell` component in all three transaction tables (`ExpenseTable`, `IncomeTable`, `TransferTable`) calls `updateData(row.index, "tags", tagIds)` from `TagInput.onChange`, which stores a `string[]` (array of tag IDs) into `row.tags`. On the next render cycle, `TagsCell` reads `getValue()` and casts it to `{ id, name, color }[]` — but the data is actually `string[]`. The read-mode render then does `tags.map(tag => <Badge key={tag.id}>)` where `tag.id` is `undefined` for every string element, causing duplicate `key={undefined}` warnings.

**Fix:** In `TagsCell`, guard the read-mode render path to handle the `string[]` case. Since this state only occurs while the row is still in edit mode (between `updateData` and `saveRow`), the cleanest solution is to check `typeof tags[0] === 'string'` in the read-mode branch and render a dash placeholder, or better — store the full tag objects alongside the IDs when `updateData` is called. The recommended approach: in `TagsCell`'s edit-mode `onChange`, look up the full tag objects from `useTagsQuery` and store those (preserving the full shape), while `saveRow` extracts IDs from those objects.

### Issue 2: Dropdown flickers on focus

**Symptom:** When focusing the Tags input field in a create form (with existing tags in the system), the dropdown briefly appears and immediately disappears.

**Root Cause:** The `onFocus` handler unconditionally calls `setOpen(true)`, which opens the popover. However, when the input is empty, the popover content shows only `CommandEmpty` ("Type to search..."). Radix's popover positioning + the empty state can trigger a layout thrash that causes the popover to appear and disappear. Additionally, the `onBlur` with `setTimeout(150ms)` from a prior interaction can race with the new focus event.

**Fix:** Only open the dropdown on focus if (a) there is existing input text, or (b) there are unselected tags to show as suggestions. When no useful content would appear, keep the popover closed and let it open naturally as the user types.

### Issue 3: Tag input UX — inline pills + Enter-to-create

**Symptom:** The current TagInput renders selected tag pills in a separate area above the input. The desired behavior is the standard pill-input pattern where pills appear **inside** the input container, inline with the text cursor. Additionally, the Enter key logic has priority issues — typing a partial match and pressing Enter creates a new tag instead of selecting the matching one.

**Enter key logic bug:** The first branch (`filteredTags.length > 0 && !exactMatch`) fires when there are partial matches, calling `handleCreate()`. This means typing "Ban" with "Bangkok" in the list creates a new "Ban" tag instead of doing nothing or selecting "Bangkok". The correct priority:
1. Exact match exists → select it
2. No match at all + text is non-empty → create new tag
3. Partial matches exist → do nothing on Enter (user should click or keep typing)

**Inline pill UX pattern:** The outer container should be a `div` styled as an input field (`flex flex-wrap items-center gap-1` with border/ring styles matching the project's `Input` component). Selected tags render as `Badge` pills inside this container, followed by the actual `<input>` element (unstyled, no border). This is how Linear, GitHub labels, and Gmail's "To" field work.

---

## UI Design

### Revised `TagInput` Layout

```
┌─────────────────────────────────────────────────┐
│ [Bangkok ✕] [Food ✕] [type here...          ]  │
└─────────────────────────────────────────────────┘
  ┌───────────────────────────────────────────┐
  │  Existing tags                            │
  │  ● Shopping                               │
  │  ● Entertainment                          │
  │  ─────────────────────────────────────    │
  │  Create "Ban..."                          │
  └───────────────────────────────────────────┘
```

**Container:** A `div` with `flex flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[36px]`.

**Pills:** Inline `Badge` components with the colored dot, name, and ✕ button — same as current but now inside the container div.

**Input:** A bare `<input>` with `className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"` — no border, no ring (the container handles that).

**Dropdown:** Same `Popover` + `Command` pattern, anchored to the outer container div.

### Interaction Specification

| Action | Behavior |
|--------|----------|
| Focus input | Open dropdown only if there are unselected tags to show |
| Type text | Open dropdown, filter existing tags, show "Create" option if no exact match |
| Enter (exact match) | Select the matching tag, add as pill, clear input |
| Enter (no match, text non-empty) | Create new tag via API, add as pill, clear input |
| Enter (partial matches only) | Create new tag via API, add as pill, clear input |
| Enter (empty input) | Do nothing |
| Click dropdown item | Select that tag, add as pill, clear input |
| Click "Create ..." | Create new tag via API, add as pill, clear input |
| Click ✕ on pill | Remove that tag |
| Backspace on empty input | Remove the last tag pill (optional enhancement) |
| Escape | Close dropdown |
| Tab | Close dropdown, move focus to next field |

### TagsCell Fix for Tables

The `TagsCell` component in all three tables needs to:
1. Import `useTagsQuery` to look up tag objects by ID
2. In edit mode's `onChange`, store the tag IDs as `string[]` (current behavior is fine)
3. In read mode, check if the data is `string[]` vs `object[]` and handle both:
   - If `string[]`: look up objects from `useTagsQuery` for display, or show a dash since the row is being edited
   - If `object[]`: render badges as before

---

## What NOT To Do

- ❌ **Don't install `emblor` or any tag input library** — the custom component needs 3 targeted fixes, not a replacement. Adding a dependency for this is overkill and couples the project to a single-maintainer library.
- ❌ **Don't store JSON strings in `updateData`** — keep the data model clean; handle the type mismatch in the render path.
- ❌ **Don't remove the `PopoverAnchor` pattern** — it's the correct Radix approach for input-anchored popovers. The flicker is a logic issue in the open-state management.
- ❌ **Don't open the dropdown on every bare focus** — only show it when there's useful content (existing tags to suggest).
- ❌ **Don't use array index as key** — always use stable `tag.id`.

---

## Handoff Note for Builder

**Feature:** Tags V2 — Bugfixes & UX Improvements
**Branch name suggestion:** Continue on existing `feature/transaction-tags`
**Files most likely to be affected:**
- `src/components/shared/TagInput.tsx` — major refactor (inline pills, Enter key fix, focus fix)
- `src/components/shared/TagInput.test.tsx` — update tests for new layout and behavior
- `src/components/tables/expenses/ExpenseTable.tsx` — fix `TagsCell` key warning
- `src/components/tables/income/IncomeTable.tsx` — fix `TagsCell` key warning
- `src/components/tables/transfers/TransferTable.tsx` — fix `TagsCell` key warning

**Watch out for:**
- The `TagInput` is used in 11 files (5 create forms, 3 edit forms, 3 tables). The props interface (`selectedTagIds`, `onChange`, `disabled`) must remain the same to avoid cascading changes.
- The inline pill layout changes the DOM structure — the `PopoverAnchor` must wrap the new container div, not just the input.
- `focus-within` on the container div must provide the same visual ring feedback as the current `Input` component.
- The `TagsCell` fix must be applied identically to all 3 table files.

**Verification focus:**
- After fixing TagsCell: edit a tag on a table row → no React key warning in console
- After fixing flicker: focus the tag input on a create form → dropdown does NOT appear and immediately disappear
- After inline pill UX: type "Bangkok", press Enter → pill appears inline, input clears, can type another tag immediately
- All 11 consumer files must continue working without prop changes
- `npm run build` must pass
- Existing TagInput tests must be updated and pass