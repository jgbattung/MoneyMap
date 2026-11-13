import { describe, it, expect } from 'vitest';
import {
  CreatePayDivisionSchema,
  PayPlanSchema,
  RecordTransferSchema,
} from '../pay-division';

const validPlan = {
  name: 'Standard',
  savePercent: '30',
  sourceAccountId: 'a',
  saveAccountId: 'b',
  spendAccountId: 'c',
  transferTypeId: 't',
  lines: [
    { name: 'EF', kind: 'PERCENT' as const, value: '60' },
    { name: 'Sinking', kind: 'PERCENT' as const, value: '40' },
    { name: 'Rent', kind: 'FIXED' as const, value: '1000', from: 'SPEND' as const },
  ],
};

describe('PayPlanSchema', () => {
  it('accepts a valid plan', () => {
    expect(PayPlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it('rejects percent lines that do not total 100', () => {
    const r = PayPlanSchema.safeParse({
      ...validPlan,
      lines: [{ name: 'EF', kind: 'PERCENT', value: '90' }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('total exactly 100'))).toBe(true);
    }
  });

  it('requires from on FIXED lines', () => {
    const r = PayPlanSchema.safeParse({
      ...validPlan,
      lines: [...validPlan.lines.slice(0, 2), { name: 'Rent', kind: 'FIXED', value: '5' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects more than 2 decimals and out-of-range save percent', () => {
    expect(PayPlanSchema.safeParse({ ...validPlan, savePercent: '30.123' }).success).toBe(false);
    expect(PayPlanSchema.safeParse({ ...validPlan, savePercent: '101' }).success).toBe(false);
  });
});

describe('CreatePayDivisionSchema / RecordTransferSchema', () => {
  it('validates pay amount and date shapes', () => {
    expect(
      CreatePayDivisionSchema.safeParse({ planId: 'p', payAmount: '34495.53', payDate: '2026-06-15' })
        .success
    ).toBe(true);
    expect(
      CreatePayDivisionSchema.safeParse({ planId: 'p', payAmount: '0', payDate: '2026-06-15' }).success
    ).toBe(false);
    expect(RecordTransferSchema.safeParse({ amount: '10.5', date: '2026-06-15' }).success).toBe(true);
    expect(RecordTransferSchema.safeParse({ amount: '10.555', date: '2026-06-15' }).success).toBe(false);
    expect(RecordTransferSchema.safeParse({ amount: '10', date: '15/06/2026' }).success).toBe(false);
  });
});
