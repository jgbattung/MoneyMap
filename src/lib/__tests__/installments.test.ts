import { describe, it, expect } from 'vitest';
import { INSTALLMENT_STATUS } from '@/lib/installments';

/**
 * These strings are PERSISTED in `ExpenseTransaction.installmentStatus` in the
 * production database, and much of the codebase compares against the raw
 * literals rather than this constant (`installments/[id]/route.ts`,
 * `InstallmentCard.tsx`, `InstallmentTable.tsx`, and their tests all use
 * 'ACTIVE' / 'CANCELLED' / 'COMPLETED' directly).
 *
 * So the values are a data contract, not an implementation detail: changing one
 * would silently orphan every existing row. Pinned here because the constant
 * was moved out of a route file and a move is exactly when a typo slips in.
 */
describe('INSTALLMENT_STATUS', () => {
  it('matches the strings persisted in the database', () => {
    expect(INSTALLMENT_STATUS).toEqual({
      active: 'ACTIVE',
      cancelled: 'CANCELLED',
      completed: 'COMPLETED',
    });
  });
});
