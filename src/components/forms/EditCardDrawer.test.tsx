/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditCardDrawer from './EditCardDrawer';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useCardsQuery', () => ({
  useCardsQuery: vi.fn(),
  useCardQuery: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/shared/SkeletonEditCardDrawerForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'skeleton-form' }, 'Loading...'),
}));

vi.mock('@/components/shared/DeleteDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? React.createElement('div', null, children) : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => React.createElement('p', null, children),
  DrawerFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DrawerClose: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: React.forwardRef(({ children }: { children: React.ReactNode }, ref: any) =>
    React.createElement('div', { ref }, children),
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => React.createElement('hr'),
}));

// Select forwards its callback through a native select so the date pickers stay usable.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: any) =>
    React.createElement(
      'select',
      {
        defaultValue,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
      },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  SelectItem: ({ children, value }: any) => React.createElement('option', { value }, children),
}));

// Popover and Command render their content inline and forward every callback.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CommandInput: ({ onValueChange }: any) =>
    React.createElement('input', {
      'aria-label': 'group search',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onValueChange?.(e.target.value),
    }),
  CommandList: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CommandGroup: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CommandItem: ({ children, onSelect }: any) =>
    React.createElement('button', { type: 'button', onClick: () => onSelect?.() }, children),
}));

import { useCardsQuery, useCardQuery } from '@/hooks/useCardsQuery';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(initialBalance: string | number) {
  return {
    id: 'card-1',
    name: 'Visa Gold',
    accountType: 'CREDIT_CARD',
    initialBalance,
    currentBalance: '-2000',
    cardGroup: null,
    statementDate: 5,
    dueDate: 25,
  };
}

function setup(initialBalance: string | number) {
  const updateCard = vi.fn().mockResolvedValue({ name: 'Renamed Visa' });
  vi.mocked(useCardQuery).mockReturnValue({
    cardData: makeCard(initialBalance),
    isFetching: false,
    error: null,
  } as any);
  vi.mocked(useCardsQuery).mockReturnValue({
    cards: [],
    updateCard,
    isUpdating: false,
    deleteCard: vi.fn(),
    isDeleting: false,
  } as any);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(EditCardDrawer, {
        open: true,
        onOpenChange: vi.fn(),
        className: '',
        cardId: 'card-1',
      }),
    ),
  );
  return { updateCard };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditCardDrawer opening balance round-trip', () => {
  it.each([
    [-2000, '2000'],
    [300, '-300'],
    ['-1234.56', '1234.56'],
  ])('shows the negated value on load for stored %s', async (stored, displayed) => {
    setup(stored);

    const field = (await screen.findByLabelText(/initial outstanding balance/i)) as HTMLInputElement;
    await waitFor(() => expect(parseFloat(field.value)).toBe(parseFloat(displayed)));
  });

  it.each([[-2000], [300], ['-1234.56']])(
    'a name-only edit sends the stored initialBalance %s unchanged',
    async (stored) => {
      const { updateCard } = setup(stored);

      const name = (await screen.findByLabelText(/card name/i)) as HTMLInputElement;
      await waitFor(() => expect(name.value).toBe('Visa Gold'));
      fireEvent.change(name, { target: { value: 'Renamed Visa' } });

      // Submit the form directly. The number input has no step attribute, so a browser
      // blocks a click on the submit button for decimal values via native validation; that
      // is a separate UI issue and not what this test covers.
      fireEvent.submit(name.closest('form') as HTMLFormElement);

      await waitFor(() => expect(updateCard).toHaveBeenCalledTimes(1));
      const payload = updateCard.mock.calls[0][0];
      expect(payload.id).toBe('card-1');
      expect(payload.name).toBe('Renamed Visa');
      expect(parseFloat(payload.initialBalance)).toBe(parseFloat(String(stored)));
    },
  );
});
