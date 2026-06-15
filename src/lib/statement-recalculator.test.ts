import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transferType: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/statement-calculator', () => ({
  calculateStatementBalance: vi.fn().mockResolvedValue(100),
}));

import { db } from '@/lib/prisma';
import { onIncomeTransactionChange, onExpenseTransactionChange } from './statement-recalculator';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('accountType hint — non-CREDIT_CARD short-circuit', () => {
  it('skips findUnique when accountType hint is SAVINGS', async () => {
    await onIncomeTransactionChange('acc-1', new Date('2026-01-15'), undefined, 'SAVINGS');

    expect(db.financialAccount.findUnique).not.toHaveBeenCalled();
  });

  it('skips findUnique when accountType hint is CASH', async () => {
    await onExpenseTransactionChange('acc-2', new Date('2026-01-15'), undefined, 'CASH');

    expect(db.financialAccount.findUnique).not.toHaveBeenCalled();
  });

  it('still queries findUnique when no accountType hint is provided', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(null);

    await onIncomeTransactionChange('acc-3', new Date('2026-01-15'));

    expect(db.financialAccount.findUnique).toHaveBeenCalledOnce();
  });

  it('still queries findUnique when accountType hint is CREDIT_CARD', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(null);

    await onExpenseTransactionChange('acc-4', new Date('2026-01-15'), undefined, 'CREDIT_CARD');

    expect(db.financialAccount.findUnique).toHaveBeenCalledOnce();
  });
});
