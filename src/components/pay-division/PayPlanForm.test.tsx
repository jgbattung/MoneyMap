/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const updatePayPlan = vi.fn();
const createPayPlan = vi.fn();
const deletePayPlan = vi.fn();

vi.mock('@/hooks/usePayPlansQuery', () => ({
  usePayPlansQuery: () => ({
    createPayPlan,
    updatePayPlan,
    deletePayPlan,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: () => ({
    accounts: [
      { id: 'acc-bpi', name: 'BPI' },
      { id: 'acc-tonik', name: 'Tonik' },
    ],
  }),
}));

vi.mock('@/hooks/useTransferTypesQuery', () => ({
  useTransferTypesQuery: () => ({ transferTypes: [{ id: 'tt-1', name: 'Saving' }] }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Select forwards its callback through a native select so interactions are real.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue, value, disabled }: any) =>
    React.createElement(
      'select',
      {
        defaultValue,
        value,
        disabled,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
      },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  SelectItem: ({ children, value }: any) => React.createElement('option', { value }, children),
}));

import PayPlanForm from './PayPlanForm';
import PayPlanList from './PayPlanList';
import type { PayPlan } from '@/hooks/usePayPlansQuery';

const basePlan: PayPlan = {
  id: 'plan-1',
  name: 'Standard',
  savePercent: '30',
  sourceAccountId: 'acc-bpi',
  saveAccountId: 'acc-tonik',
  spendAccountId: 'acc-bpi',
  transferTypeId: 'tt-1',
  lines: [
    { name: 'EF', kind: 'PERCENT', value: '60' },
    { name: 'Sinking', kind: 'PERCENT', value: '40' },
    { name: 'Rent', kind: 'FIXED', value: '1000', from: 'SPEND' },
  ],
  sourceAccount: { id: 'acc-bpi', name: 'BPI' },
  saveAccount: { id: 'acc-tonik', name: 'Tonik' },
  spendAccount: { id: 'acc-bpi', name: 'BPI' },
  transferType: { id: 'tt-1', name: 'Saving' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  updatePayPlan.mockResolvedValue({});
  createPayPlan.mockResolvedValue({});
});

describe('PayPlanForm', () => {
  it('shows the live % total and blocks save when the lines total 90', async () => {
    const onDone = vi.fn();
    render(<PayPlanForm plan={basePlan} onDone={onDone} />);

    expect(screen.getByText(/% lines total 100/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Line 2 value'), { target: { value: '30' } });
    await waitFor(() => expect(screen.getByText(/% lines total 90/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/must total exactly 100/)
    );
    expect(updatePayPlan).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('submits a valid plan with the expected payload', async () => {
    const onDone = vi.fn();
    render(<PayPlanForm plan={basePlan} onDone={onDone} />);

    fireEvent.change(screen.getByPlaceholderText('30'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updatePayPlan).toHaveBeenCalledTimes(1));
    expect(updatePayPlan).toHaveBeenCalledWith({
      id: 'plan-1',
      name: 'Standard',
      savePercent: '35',
      sourceAccountId: 'acc-bpi',
      saveAccountId: 'acc-tonik',
      spendAccountId: 'acc-bpi',
      transferTypeId: 'tt-1',
      lines: [
        { name: 'EF', kind: 'PERCENT', value: '60' },
        { name: 'Sinking', kind: 'PERCENT', value: '40' },
        { name: 'Rent', kind: 'FIXED', value: '1000', from: 'SPEND' },
      ],
    });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('changing a line type to Fixed (Save) sets kind and from', async () => {
    render(<PayPlanForm plan={basePlan} onDone={vi.fn()} />);

    // Line 2 (Sinking, 40%) becomes a fixed amount from Save.
    const percentSelects = screen
      .getAllByRole('combobox')
      .filter((s) => (s as HTMLSelectElement).value === 'PERCENT');
    expect(percentSelects).toHaveLength(2);
    fireEvent.change(percentSelects[1], { target: { value: 'FIXED_SAVE' } });

    await waitFor(() => expect(screen.getByText(/% lines total 60/)).toBeTruthy());
  });

  it('creates a new plan and lets the user add and remove lines', async () => {
    const onDone = vi.fn();
    render(<PayPlanForm onDone={onDone} />);

    expect(screen.queryByLabelText('Line 1 name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Add line/ }));
    expect(screen.getByLabelText('Line 1 name')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove line 1' }));
    expect(screen.queryByLabelText('Line 1 name')).toBeNull();

    // Empty required fields: nothing is submitted.
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    await waitFor(() => expect(screen.getAllByText(/is required/).length).toBeGreaterThan(0));
    expect(createPayPlan).not.toHaveBeenCalled();
  });
});

describe('PayPlanList', () => {
  it('shows an Incomplete badge for a plan whose account was deleted and calls onSelect', () => {
    const onSelect = vi.fn();
    const incomplete: PayPlan = { ...basePlan, id: 'plan-2', name: 'Broken', saveAccountId: null, saveAccount: null };
    render(<PayPlanList plans={[basePlan, incomplete]} onSelect={onSelect} />);

    expect(screen.getAllByText('Incomplete')).toHaveLength(1);
    expect(screen.getByText(/missing account/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Broken/ }));
    expect(onSelect).toHaveBeenCalledWith(incomplete);
  });

  it('marks a plan with a deleted transfer type as Incomplete and says so', () => {
    const noType: PayPlan = { ...basePlan, transferTypeId: null, transferType: null };
    render(<PayPlanList plans={[noType]} onSelect={vi.fn()} />);
    expect(screen.getByText('Incomplete')).toBeTruthy();
    expect(screen.getByText(/no transfer type/)).toBeTruthy();
  });

  it.each(['sourceAccount', 'spendAccount'] as const)('marks a plan with a deleted %s as Incomplete', (field) => {
    const broken: PayPlan = { ...basePlan, [`${field}Id`]: null, [field]: null };
    render(<PayPlanList plans={[broken]} onSelect={vi.fn()} />);
    expect(screen.getByText('Incomplete')).toBeTruthy();
    expect(screen.getByText(/missing account/)).toBeTruthy();
  });
});
