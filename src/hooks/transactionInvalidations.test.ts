import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateAfterTransactionWrite, DEFERRED_KEYS, EAGER_KEYS } from './transactionInvalidations';

vi.mock('./useRecentTransactions', () => ({
  RECENT_TRANSACTION_QUERY_KEYS: {
    recentTransactions: ['recentTransactions'],
  },
}));

function createMockQueryClient() {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  return {
    invalidateQueries,
  } as unknown as QueryClient;
}

describe('invalidateAfterTransactionWrite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createMockQueryClient();
  });

  it('invalidates the own list key eagerly (no refetchType restriction)', () => {
    invalidateAfterTransactionWrite(queryClient, ['expenseTransactions']);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['expenseTransactions'] })
    );

    // Should NOT have refetchType: 'none' for the own list key
    const ownListCall = vi.mocked(queryClient.invalidateQueries).mock.calls.find(
      ([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey) === JSON.stringify(['expenseTransactions'])
    );
    expect(ownListCall).toBeDefined();
    expect((ownListCall![0] as { refetchType?: string }).refetchType).toBeUndefined();
  });

  it('invalidates all eager keys without refetchType restriction', () => {
    invalidateAfterTransactionWrite(queryClient, ['transferTransactions']);

    for (const key of EAGER_KEYS) {
      const matchingCall = vi.mocked(queryClient.invalidateQueries).mock.calls.find(
        ([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey) === JSON.stringify(key)
      );
      expect(matchingCall).toBeDefined();
      expect((matchingCall![0] as { refetchType?: string }).refetchType).toBeUndefined();
    }
  });

  it('invalidates all deferred keys with refetchType: none', () => {
    invalidateAfterTransactionWrite(queryClient, ['incomeTransactions']);

    for (const key of DEFERRED_KEYS) {
      const matchingCall = vi.mocked(queryClient.invalidateQueries).mock.calls.find(
        ([arg]) =>
          JSON.stringify((arg as { queryKey: unknown }).queryKey) === JSON.stringify(key) &&
          (arg as { refetchType?: string }).refetchType === 'none'
      );
      expect(matchingCall).toBeDefined();
    }
  });

  it('invalidates extra eager keys without refetchType restriction', () => {
    invalidateAfterTransactionWrite(queryClient, ['transfers'], [['expenseTransactions']]);

    const matchingCall = vi.mocked(queryClient.invalidateQueries).mock.calls.find(
      ([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey) === JSON.stringify(['expenseTransactions'])
    );
    expect(matchingCall).toBeDefined();
    expect((matchingCall![0] as { refetchType?: string }).refetchType).toBeUndefined();
  });

  it('does not call invalidateQueries with refetchType: none for eager keys', () => {
    invalidateAfterTransactionWrite(queryClient, ['expenseTransactions']);

    const eagerKeyStrings = EAGER_KEYS.map((k) => JSON.stringify(k));

    const wrongCalls = vi.mocked(queryClient.invalidateQueries).mock.calls.filter(([arg]) => {
      const a = arg as { queryKey: unknown; refetchType?: string };
      return (
        a.refetchType === 'none' &&
        eagerKeyStrings.includes(JSON.stringify(a.queryKey))
      );
    });

    expect(wrongCalls).toHaveLength(0);
  });
});
