/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const recordTransfer = vi.fn();
const undoTransfer = vi.fn();
const toggleEarmark = vi.fn();
const deleteDivision = vi.fn();
let hookState: any;

vi.mock('@/hooks/usePayDivisionsQuery', () => ({
  usePayDivisionsQuery: () => hookState,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Popover renders inline; Calendar forwards onDayClick through a real button.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => React.createElement('div', null, children),
  PopoverTrigger: ({ children }: any) => React.createElement('div', null, children),
  PopoverContent: ({ children }: any) => React.createElement('div', null, children),
}));
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onDayClick }: any) =>
    React.createElement(
      'button',
      { type: 'button', onClick: () => onDayClick(new Date(2026, 5, 18)) },
      'Pick June 18',
    ),
}));

import RecentDivisions from './RecentDivisions';

const item = (over: Record<string, unknown>) => ({
  divisionId: 'div-1',
  detail: null,
  parentItemId: null,
  fromAccountId: null,
  toAccountId: null,
  transferTypeId: null,
  transferTransactionId: null,
  completedAt: null,
  fromAccount: null,
  toAccount: null,
  transferTransaction: null,
  ...over,
});

const openDivision = {
  id: 'div-1',
  planId: 'plan-1',
  planName: 'Jun 15 plan',
  savePercent: '30',
  payAmount: '34495.53',
  saveAmount: '10348.66',
  spendAmount: '23146.87',
  payDate: '2026-06-15T00:00:00.000Z',
  incomeTransactionId: null,
  createdAt: '2026-06-15T01:00:00.000Z',
  items: [
    item({
      id: 'it-savings', kind: 'TRANSFER', label: 'Savings', amount: '11348.66', sortOrder: 0,
      fromAccountId: 'src', toAccountId: 'sav', transferTypeId: 'tt-1',
      fromAccount: { id: 'src', name: 'GoTyme' }, toAccount: { id: 'sav', name: 'Tonik' },
    }),
    item({ id: 'it-ef', kind: 'EARMARK', label: 'EF', detail: '50%', amount: '5174.33', sortOrder: 1, parentItemId: 'it-savings' }),
    item({
      id: 'it-sinking', kind: 'EARMARK', label: 'Sinking', detail: '15%', amount: '1552.30', sortOrder: 2,
      parentItemId: 'it-savings', completedAt: '2026-06-16T00:00:00.000Z',
    }),
    item({
      id: 'it-spending', kind: 'TRANSFER', label: 'Spending', amount: '23146.87', sortOrder: 3,
      fromAccountId: 'src', toAccountId: 'spd', transferTypeId: 'tt-1',
      fromAccount: { id: 'src', name: 'GoTyme' }, toAccount: { id: 'spd', name: 'BPI' },
      transferTransactionId: 'tr-9',
      transferTransaction: { id: 'tr-9', amount: 23000, date: '2026-06-17T00:00:00.000Z' },
    }),
  ],
};

const doneDivision = {
  ...openDivision,
  id: 'div-0',
  planName: 'Old plan',
  payDate: '2026-05-30T00:00:00.000Z',
  items: [
    item({
      id: 'old-1', divisionId: 'div-0', kind: 'EARMARK', label: 'Old bucket', amount: '100', sortOrder: 0,
      completedAt: '2026-05-31T00:00:00.000Z',
    }),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  recordTransfer.mockResolvedValue({});
  undoTransfer.mockResolvedValue({});
  toggleEarmark.mockResolvedValue({});
  deleteDivision.mockResolvedValue({});
  hookState = {
    payDivisions: [openDivision, doneDivision],
    isLoading: false,
    error: null,
    recordTransfer,
    undoTransfer,
    toggleEarmark,
    deleteDivision,
    isDeleting: false,
    pendingItemIds: new Set<string>(),
  };
});

describe('RecentDivisions checklist', () => {
  it('shows the done count derived from the data', () => {
    render(<RecentDivisions />);
    // Spending (transfer linked) and Sinking (earmark completed) are done: 2 of 4.
    expect(screen.getByText(/2 of 4 done/)).toBeTruthy();
  });

  it('ticking a TRANSFER row opens the dialog and Confirm records the edited amount and date', async () => {
    render(<RecentDivisions />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Savings as done' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('GoTyme')).toBeTruthy();
    expect(within(dialog).getByText('Tonik')).toBeTruthy();

    const amount = within(dialog).getByLabelText('Amount') as HTMLInputElement;
    expect(amount.value).toBe('11,348.66');
    fireEvent.change(amount, { target: { value: '11000.50' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pick June 18' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(recordTransfer).toHaveBeenCalledTimes(1));
    expect(recordTransfer).toHaveBeenCalledWith({
      divisionId: 'div-1',
      itemId: 'it-savings',
      amount: '11000.50',
      date: '2026-06-18',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the dialog open when recording fails', async () => {
    recordTransfer.mockRejectedValue(new Error('boom'));
    render(<RecentDivisions />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Savings as done' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(recordTransfer).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeTruthy();
  });

  it('ticking a done TRANSFER row and confirming calls undoTransfer with the linked transfer id', async () => {
    render(<RecentDivisions />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Undo Spending' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Undo this transfer?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo transfer' }));

    await waitFor(() => expect(undoTransfer).toHaveBeenCalledTimes(1));
    expect(undoTransfer).toHaveBeenCalledWith({ itemId: 'it-spending', transferTransactionId: 'tr-9' });
  });

  it('ticking an EARMARK row toggles it without a dialog, and unticking sends done false', async () => {
    render(<RecentDivisions />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark EF as done' }));
    await waitFor(() =>
      expect(toggleEarmark).toHaveBeenCalledWith({ divisionId: 'div-1', itemId: 'it-ef', done: true })
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Undo Sinking' }));
    await waitFor(() =>
      expect(toggleEarmark).toHaveBeenCalledWith({ divisionId: 'div-1', itemId: 'it-sinking', done: false })
    );
  });

  it('shows the actual amount with the planned one when they differ', () => {
    render(<RecentDivisions />);
    expect(screen.getByText('₱23,000.00')).toBeTruthy();
    expect(screen.getByText(/planned/).textContent).toContain('₱23,146.87');
  });

  it('disables a row while its mutation is pending', () => {
    hookState.pendingItemIds = new Set(['it-ef']);
    render(<RecentDivisions />);
    expect((screen.getByRole('checkbox', { name: 'Mark EF as done' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Mark Savings as done' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('delete confirm states that recorded transfers are kept and then deletes', async () => {
    render(<RecentDivisions />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Jun 15 plan checklist' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Transfers already recorded from it are kept/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteDivision).toHaveBeenCalledWith('div-1'));
  });

  it('renders fully done divisions as a compact row that expands', async () => {
    render(<RecentDivisions />);
    expect(screen.queryByRole('checkbox', { name: 'Undo Old bucket' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Old plan/ }));
    expect(await screen.findByRole('checkbox', { name: 'Undo Old bucket' })).toBeTruthy();
  });

  it('shows an empty state when there are no divisions', () => {
    hookState.payDivisions = [];
    render(<RecentDivisions />);
    expect(screen.getByText('No divisions yet')).toBeTruthy();
  });
});
