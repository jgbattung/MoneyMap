/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const createDivision = vi.fn();
let plansState: { payPlans: any[]; isLoading: boolean } = { payPlans: [], isLoading: false };
let divisionsState: any[] = [];

vi.mock('@/hooks/usePayPlansQuery', () => ({
  usePayPlansQuery: () => plansState,
}));

vi.mock('@/hooks/usePayDivisionsQuery', () => ({
  usePayDivisionsQuery: () => ({ payDivisions: divisionsState, createDivision, isCreating: false }),
}));

vi.mock('@/hooks/useIncomeTransactionsQuery', () => ({
  useIncomeTransactionsQuery: () => ({
    incomeTransactions: [
      { id: 'inc-1', name: 'Salary Jun 15', amount: '34495.53', date: '2026-06-15T00:00:00.000Z' },
      { id: 'inc-2', name: 'Salary May 30', amount: '30000', date: '2026-05-30T00:00:00.000Z' },
    ],
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Select forwards its callback through a native select so interactions are real.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) =>
    React.createElement(
      'select',
      {
        value,
        disabled,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
      },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  SelectItem: ({ children, value, disabled }: any) => React.createElement('option', { value, disabled }, children),
}));

import NewDivisionCard from './NewDivisionCard';

const junPlan = {
  id: 'plan-jun',
  name: 'Jun 15 plan',
  savePercent: '30',
  sourceAccountId: 'src',
  saveAccountId: 'sav',
  spendAccountId: 'spd',
  transferTypeId: 'tt-1',
  lines: [
    { name: 'EF', kind: 'PERCENT', value: '50' },
    { name: 'Gotrade', kind: 'PERCENT', value: '17.5' },
    { name: 'MP2', kind: 'PERCENT', value: '17.5' },
    { name: 'Sinking', kind: 'PERCENT', value: '15' },
    { name: 'Papa TW', kind: 'FIXED', value: '1000', from: 'SPEND' },
  ],
};

const brokenPlan = { ...junPlan, id: 'plan-broken', name: 'Broken plan', saveAccountId: null };

function selects() {
  const all = screen.getAllByRole('combobox') as HTMLSelectElement[];
  return { income: all[0], plan: all[1] };
}

beforeEach(() => {
  vi.clearAllMocks();
  createDivision.mockResolvedValue({ id: 'div-1' });
  plansState = { payPlans: [junPlan, brokenPlan], isLoading: false };
  divisionsState = [];
});

describe('NewDivisionCard', () => {
  it('renders the live split for the Jun 15 fixture', () => {
    render(<NewDivisionCard onGoToPlans={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '34495.53' } });
    fireEvent.change(selects().plan, { target: { value: 'plan-jun' } });

    for (const amount of ['₱23,146.87', '₱10,348.66', '₱5,174.33', '₱1,811.02', '₱1,811.01', '₱1,552.30']) {
      expect(screen.getByText(amount)).toBeTruthy();
    }
    expect(screen.getByText(/Save \(30%\)/)).toBeTruthy();
  });

  it('disables Start checklist without a pay or a plan and calls createDivision when valid', async () => {
    render(<NewDivisionCard onGoToPlans={vi.fn()} />);
    const start = screen.getByRole('button', { name: 'Start checklist' }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '34495.53' } });
    expect(start.disabled).toBe(true);

    fireEvent.change(selects().plan, { target: { value: 'plan-jun' } });
    expect(start.disabled).toBe(false);

    fireEvent.click(start);
    await waitFor(() => expect(createDivision).toHaveBeenCalledTimes(1));
    const arg = createDivision.mock.calls[0][0];
    expect(arg).toMatchObject({ planId: 'plan-jun', payAmount: '34495.53' });
    expect(arg.payDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(arg.incomeTransactionId).toBeUndefined();
  });

  it('shows the calc error inline and keeps Start disabled', () => {
    plansState = {
      payPlans: [{ ...junPlan, lines: [...junPlan.lines.slice(0, 4), { name: 'Big', kind: 'FIXED', value: '99999', from: 'SPEND' }] }],
      isLoading: false,
    };
    render(<NewDivisionCard onGoToPlans={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '1000' } });
    fireEvent.change(selects().plan, { target: { value: 'plan-jun' } });

    expect(screen.getByText('Fixed lines from Spend exceed the Spend amount')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Start checklist' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables incomplete plans and already-divided incomes', () => {
    divisionsState = [{ id: 'd1', incomeTransactionId: 'inc-2' }];
    render(<NewDivisionCard onGoToPlans={vi.fn()} />);

    const broken = screen.getByRole('option', { name: /Broken plan/ }) as HTMLOptionElement;
    expect(broken.disabled).toBe(true);
    expect(broken.textContent).toMatch(/incomplete/);
    const divided = screen.getByRole('option', { name: /Salary May 30/ }) as HTMLOptionElement;
    expect(divided.disabled).toBe(true);
    expect((screen.getByRole('option', { name: /Salary Jun 15/ }) as HTMLOptionElement).disabled).toBe(false);
  });

  it('picking a recent income fills the amount and links it', async () => {
    render(<NewDivisionCard onGoToPlans={vi.fn()} />);
    fireEvent.change(selects().income, { target: { value: 'inc-1' } });
    fireEvent.change(selects().plan, { target: { value: 'plan-jun' } });

    expect((screen.getByLabelText('Pay amount') as HTMLInputElement).value).toBe('34,495.53');
    fireEvent.click(screen.getByRole('button', { name: 'Start checklist' }));
    await waitFor(() => expect(createDivision).toHaveBeenCalled());
    expect(createDivision.mock.calls[0][0]).toMatchObject({
      planId: 'plan-jun',
      payAmount: '34495.53',
      payDate: '2026-06-15',
      incomeTransactionId: 'inc-1',
    });
  });

  it('points to the Plans tab when there are no plans', () => {
    plansState = { payPlans: [], isLoading: false };
    const onGoToPlans = vi.fn();
    render(<NewDivisionCard onGoToPlans={onGoToPlans} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to Plans' }));
    expect(onGoToPlans).toHaveBeenCalled();
  });
});
