import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: { count: vi.fn() },
    expenseType: { count: vi.fn() },
    incomeType: { count: vi.fn() },
    transferType: { count: vi.fn() },
    tag: { count: vi.fn() },
  },
}));

import { findUnownedRef } from './ownership';
import { db } from '@/lib/prisma';

const models = [db.financialAccount, db.expenseType, db.incomeType, db.transferType, db.tag];

beforeEach(() => {
  vi.resetAllMocks();
});

function countsAre(counts: Partial<Record<'financialAccount' | 'expenseType' | 'incomeType' | 'transferType' | 'tag', number>>) {
  for (const [name, n] of Object.entries(counts)) {
    vi.mocked((db as any)[name].count).mockResolvedValue(n);
  }
}

describe('findUnownedRef', () => {
  it('returns null when every count matches', async () => {
    countsAre({ financialAccount: 2, expenseType: 1, tag: 2 });

    const result = await findUnownedRef('user-1', {
      accountIds: ['a1', 'a2'],
      expenseTypeId: 't1',
      tagIds: ['g1', 'g2'],
    });

    expect(result).toBeNull();
    expect(db.financialAccount.count).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] }, userId: 'user-1' },
    });
  });

  it.each([
    ['Account not found', { accountIds: ['a1', 'a2'] }, { financialAccount: 1 }],
    ['Expense type not found', { expenseTypeId: 't1' }, { expenseType: 0 }],
    ['Income type not found', { incomeTypeId: 't1' }, { incomeType: 0 }],
    ['Transfer type not found', { transferTypeId: 't1' }, { transferType: 0 }],
    ['Tag not found', { tagIds: ['g1', 'g2'] }, { tag: 1 }],
  ])('returns "%s" when a count is short', async (message, refs, counts) => {
    countsAre(counts as any);

    expect(await findUnownedRef('user-1', refs)).toBe(message);
  });

  it('returns the first failing kind in the fixed order', async () => {
    countsAre({ financialAccount: 0, expenseType: 0, tag: 0 });

    const result = await findUnownedRef('user-1', {
      accountIds: ['a1'],
      expenseTypeId: 't1',
      tagIds: ['g1'],
    });

    expect(result).toBe('Account not found');
  });

  it('makes no query for omitted or empty kinds', async () => {
    const result = await findUnownedRef('user-1', {
      accountIds: [null, undefined, ''],
      expenseTypeId: null,
      tagIds: [],
    });

    expect(result).toBeNull();
    for (const model of models) expect(model.count).not.toHaveBeenCalled();
  });

  it('counts a duplicate tag id once', async () => {
    countsAre({ tag: 1 });

    const result = await findUnownedRef('user-1', { tagIds: ['g1', 'g1', 'g1'] });

    expect(result).toBeNull();
    expect(db.tag.count).toHaveBeenCalledWith({ where: { id: { in: ['g1'] }, userId: 'user-1' } });
  });

  it('starts every count before any resolves (parallel, not serial)', async () => {
    const started: string[] = [];
    for (const [name, model] of [['account', db.financialAccount], ['type', db.expenseType], ['tag', db.tag]] as const) {
      vi.mocked(model.count).mockImplementation((() => {
        started.push(name);
        return new Promise(() => {});
      }) as any);
    }

    void findUnownedRef('user-1', { accountIds: ['a'], expenseTypeId: 't', tagIds: ['g'] });
    await Promise.resolve();

    expect(started).toEqual(['account', 'type', 'tag']);
  });
});
