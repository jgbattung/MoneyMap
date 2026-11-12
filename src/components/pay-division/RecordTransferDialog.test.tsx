/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

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

import RecordTransferDialog from './RecordTransferDialog';
import { formatDateForAPI } from '@/lib/utils';

const savingsItem: any = {
  id: 'it-savings',
  divisionId: 'div-1',
  kind: 'TRANSFER',
  label: 'Savings',
  detail: null,
  amount: '11348.66',
  sortOrder: 0,
  parentItemId: null,
  fromAccountId: 'src',
  toAccountId: 'sav',
  transferTypeId: 'tt-1',
  transferTransactionId: null,
  completedAt: null,
  fromAccount: { id: 'src', name: 'GoTyme' },
  toAccount: { id: 'sav', name: 'Tonik' },
  transferTransaction: null,
};

const onOpenChange = vi.fn();
const onConfirm = vi.fn();

function renderDialog(item: any = savingsItem) {
  render(<RecordTransferDialog item={item} onOpenChange={onOpenChange} onConfirm={onConfirm} />);
  return screen.getByRole('dialog');
}

function setAmount(dialog: HTMLElement, value: string) {
  fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value } });
}

const confirmButton = (dialog: HTMLElement) =>
  within(dialog).getByRole('button', { name: 'Confirm' }) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  onConfirm.mockResolvedValue({});
});

describe('RecordTransferDialog', () => {
  it('stays closed when no item is selected', () => {
    render(<RecordTransferDialog item={null} onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the read-only From and To names and prefills the planned amount and today', async () => {
    const dialog = renderDialog();
    expect(within(dialog).getByText('GoTyme')).toBeTruthy();
    expect(within(dialog).getByText('Tonik')).toBeTruthy();
    expect((within(dialog).getByLabelText('Amount') as HTMLInputElement).value).toBe('11,348.66');

    fireEvent.click(confirmButton(dialog));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith({ amount: '11348.66', date: formatDateForAPI(new Date()) });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows Unknown account when an account was deleted', () => {
    const dialog = renderDialog({ ...savingsItem, fromAccount: null, toAccount: null });
    expect(within(dialog).getAllByText('Unknown account')).toHaveLength(2);
  });

  it('disables Confirm for an empty amount without showing an error', () => {
    const dialog = renderDialog();
    setAmount(dialog, '');
    expect(confirmButton(dialog).disabled).toBe(true);
    expect(within(dialog).queryByText(/Enter a positive amount/)).toBeNull();
  });

  it.each(['0', '1.234'])('disables Confirm and shows an error for %s', (value) => {
    const dialog = renderDialog();
    setAmount(dialog, value);
    expect(confirmButton(dialog).disabled).toBe(true);
    expect(within(dialog).getByText('Enter a positive amount with at most 2 decimals')).toBeTruthy();
    fireEvent.click(confirmButton(dialog));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('normalizes a trailing dot before sending', async () => {
    const dialog = renderDialog();
    setAmount(dialog, '500.');
    fireEvent.click(confirmButton(dialog));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ amount: '500' })));
  });

  it('Cancel closes without recording', () => {
    const dialog = renderDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('prevents a double submit while recording is in flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    onConfirm.mockReturnValue(new Promise((r) => { resolve = r; }));
    const dialog = renderDialog();
    fireEvent.click(confirmButton(dialog));
    await waitFor(() =>
      expect((within(dialog).getByRole('button', { name: 'Recording' }) as HTMLButtonElement).disabled).toBe(true)
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Recording' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolve({});
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
