import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NetWorthTargetProgress from './NetWorthTargetProgress';

describe('NetWorthTargetProgress', () => {
  it('renders only the Set-target affordance when no target is set', () => {
    render(
      React.createElement(NetWorthTargetProgress, {
        target: null,
        targetDate: null,
        netWorth: 150000,
        projection: null,
        onEditTarget: vi.fn(),
      })
    );

    expect(screen.getByRole('button', { name: 'Set target' })).toBeTruthy();
    expect(screen.queryByText(/Target:/)).toBeNull();
  });

  it('renders "Estimated" with a date for an on-pace projection, no other copy', () => {
    render(
      React.createElement(NetWorthTargetProgress, {
        target: 500000,
        targetDate: null,
        netWorth: 150000,
        projection: { kind: 'on-pace', date: new Date('2027-05-01'), monthsOut: 10 },
        onEditTarget: vi.fn(),
      })
    );

    expect(screen.getByText(/Estimated: May 2027/)).toBeTruthy();
  });

  it('renders "Not on pace at the current trend" for not-on-pace, no date', () => {
    render(
      React.createElement(NetWorthTargetProgress, {
        target: 500000,
        targetDate: null,
        netWorth: 150000,
        projection: { kind: 'not-on-pace' },
        onEditTarget: vi.fn(),
      })
    );

    expect(screen.getByText('Not on pace at the current trend')).toBeTruthy();
    expect(screen.queryByText(/Estimated/)).toBeNull();
  });

  it('renders "Not enough history to estimate" for insufficient-data, no date', () => {
    render(
      React.createElement(NetWorthTargetProgress, {
        target: 500000,
        targetDate: null,
        netWorth: 150000,
        projection: { kind: 'insufficient-data' },
        onEditTarget: vi.fn(),
      })
    );

    expect(screen.getByText('Not enough history to estimate')).toBeTruthy();
    expect(screen.queryByText(/Estimated/)).toBeNull();
  });

  it('renders "Target reached" for met, no date', () => {
    render(
      React.createElement(NetWorthTargetProgress, {
        target: 100000,
        targetDate: null,
        netWorth: 150000,
        projection: { kind: 'met' },
        onEditTarget: vi.fn(),
      })
    );

    expect(screen.getByText('Target reached')).toBeTruthy();
    expect(screen.queryByText(/Estimated/)).toBeNull();
  });

  it('renders the remaining peso gap and target amount', () => {
    render(
      React.createElement(NetWorthTargetProgress, {
        target: 200000,
        targetDate: null,
        netWorth: 150000,
        projection: { kind: 'insufficient-data' },
        onEditTarget: vi.fn(),
      })
    );

    expect(screen.getByText(/Target: ₱200,000\.00/)).toBeTruthy();
    expect(screen.getByText(/₱50,000\.00 to go/)).toBeTruthy();
  });
});
