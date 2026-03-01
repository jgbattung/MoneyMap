---
name: pre-merge
description: Runs the full pre-merge validation gate — lint, build, and complete test suite — and reports a clear pass/fail summary. Use before creating a PR or merging a branch. Invoke with "/pre-merge".
---

# pre-merge

You are running the **pre-merge validation gate** for Money Map. Your job is to verify the current branch is safe to merge by running three sequential checks. Do not skip any check. Do not create a PR until all three pass.

---

## Step 1 — Lint

```bash
npm run lint
```

- If it exits 0: mark **Lint: PASS**
- If it exits non-zero: fix all lint errors, then re-run. Do not proceed until lint passes.

---

## Step 2 — Build

```bash
npm run build
```

- If it exits 0: mark **Build: PASS**
- If it exits non-zero: fix all build errors, then re-run. Do not proceed until the build is clean.

---

## Step 3 — Full Test Suite

```bash
npx vitest run
```

Run the **entire** test suite — not just files you changed. This catches regressions across the codebase.

- If all tests pass: mark **Tests: PASS**
- If any tests fail: fix them (or invoke `/run-and-heal-tests`), then re-run. Do not proceed until the suite is green.

---

## Step 4 — Report

Print this summary:

```
## Pre-Merge Validation

| Check  | Result |
|--------|--------|
| Lint   | ✓ PASS / ✗ FAIL |
| Build  | ✓ PASS / ✗ FAIL |
| Tests  | ✓ PASS / ✗ FAIL (X passed, Y failed) |

**Branch status: READY TO MERGE** ✓
— or —
**Branch status: NOT READY** ✗ — fix the failing checks above before creating a PR.
```

Only proceed to `gh pr create` when all three checks show PASS.

---

## Constraints

- Never skip a check to save time.
- Never run database commands (`prisma migrate`, `prisma db push`, etc.).
- If the build fails due to a type error in a file you didn't touch, investigate before changing that file — it may be a pre-existing issue that should be reported, not silently fixed.
