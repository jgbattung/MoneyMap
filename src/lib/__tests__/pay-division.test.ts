import { describe, it, expect } from 'vitest';
import {
  buildDivisionItems,
  computePayDivision,
  fromCentavos,
  isPlanUsable,
  toCentavos,
  validatePlanLines,
  type PayDivisionOk,
  type PayPlanLine,
} from '../pay-division';

const pct = (name: string, value: string): PayPlanLine => ({ name, kind: 'PERCENT', value });
const fixed = (name: string, value: string, from: 'SPEND' | 'SAVE'): PayPlanLine => ({
  name,
  kind: 'FIXED',
  value,
  from,
});

const JUN_LINES: PayPlanLine[] = [
  pct('EF', '50'),
  pct('Gotrade', '17.5'),
  pct('MP2', '17.5'),
  pct('Sinking', '15'),
  fixed('Papa TW', '1000', 'SPEND'),
];

function ok(result: ReturnType<typeof computePayDivision>): PayDivisionOk {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result;
}

describe('toCentavos / fromCentavos', () => {
  it('parses decimal strings exactly', () => {
    expect(toCentavos('34495.53')).toBe(3449553);
    expect(toCentavos('17.5')).toBe(1750);
    expect(toCentavos('1000')).toBe(100000);
    expect(toCentavos('0.07')).toBe(7);
    expect(toCentavos(10.1)).toBe(1010);
  });

  it('returns NaN for invalid input', () => {
    expect(toCentavos('abc')).toBeNaN();
    expect(toCentavos('1.234')).toBeNaN();
    expect(toCentavos('')).toBeNaN();
  });

  it('formats with exactly 2 decimals', () => {
    expect(fromCentavos(517433)).toBe('5174.33');
    expect(fromCentavos(5)).toBe('0.05');
    expect(fromCentavos(100000)).toBe('1000.00');
  });
});

describe('computePayDivision', () => {
  it('matches the Jun 15 fixture', () => {
    const r = ok(computePayDivision({ payAmount: '34495.53', savePercent: '30', lines: JUN_LINES }));
    expect(fromCentavos(r.saveC)).toBe('10348.66');
    expect(fromCentavos(r.spendC)).toBe('23146.87');
    const byName = Object.fromEntries(r.lines.map((l) => [l.name, fromCentavos(l.amountC)]));
    expect(byName).toEqual({
      EF: '5174.33',
      Gotrade: '1811.02',
      MP2: '1811.01',
      Sinking: '1552.30',
      'Papa TW': '1000.00',
    });
    expect(r.lines[0].detail).toBe('50%');
    expect(r.lines[1].detail).toBe('17.5%');
    expect(r.lines[4].detail).toBe('fixed');

    const items = buildDivisionItems(r, {
      sourceAccountId: 'src',
      saveAccountId: 'sav',
      spendAccountId: 'spd',
    });
    const savings = items.find((i) => i.label === 'Savings');
    expect(fromCentavos(savings!.amountC)).toBe('11348.66');
  });

  it('matches the Jan 15 fixture: buckets sum to exactly the Save amount', () => {
    const lines = [
      pct('EF', '50'),
      pct('Gotrade', '15'),
      pct('MP2', '15'),
      pct('Condo', '12.5'),
      pct('Sinking', '7.5'),
    ];
    const r = ok(computePayDivision({ payAmount: '28908.10', savePercent: '40', lines }));
    expect(fromCentavos(r.saveC)).toBe('11563.24');
    expect(r.lines.reduce((s, l) => s + l.amountC, 0)).toBe(r.saveC);
  });

  it('breaks remainder ties toward the earlier line', () => {
    // 3 equal thirds of 100.00 Save: 33.33 each plus one leftover centavo to line 0
    const r = ok(
      computePayDivision({
        payAmount: '100',
        savePercent: '100',
        lines: [pct('A', '33.33'), pct('B', '33.33'), pct('C', '33.34')],
      })
    );
    expect(r.lines.reduce((s, l) => s + l.amountC, 0)).toBe(10000);
    const tie = ok(
      computePayDivision({
        payAmount: '0.02',
        savePercent: '100',
        lines: [pct('A', '50'), pct('B', '50')],
      })
    );
    expect(tie.lines.map((l) => l.amountC)).toEqual([1, 1]);
    const odd = ok(
      computePayDivision({
        payAmount: '0.03',
        savePercent: '100',
        lines: [pct('A', '50'), pct('B', '50')],
      })
    );
    expect(odd.lines.map((l) => l.amountC)).toEqual([2, 1]);
  });

  it('keeps the totals exact across many pays and percentage sets', () => {
    const lineSets: Array<{ save: string; lines: PayPlanLine[] }> = [
      { save: '30', lines: JUN_LINES },
      {
        save: '40',
        lines: [pct('A', '45'), pct('B', '5'), pct('C', '5'), pct('D', '35'), pct('E', '10')],
      },
      {
        save: '33.33',
        lines: [pct('A', '33.33'), pct('B', '33.33'), pct('C', '33.34'), fixed('F', '12.34', 'SAVE')],
      },
      { save: '12.5', lines: [pct('A', '7.77'), pct('B', '92.23'), fixed('G', '100', 'SPEND')] },
    ];
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    let checked = 0;
    for (let n = 0; n < 700; n++) {
      const payC = 500000 + (rand() % 20000000); // 5,000.00 .. 205,000.00
      const set = lineSets[n % lineSets.length];
      const r = computePayDivision({
        payAmount: fromCentavos(payC),
        savePercent: set.save,
        lines: set.lines,
      });
      if (!r.ok) throw new Error(`unexpected error for ${payC}: ${r.error}`);
      expect(r.saveC + r.spendC + r.fixedSpendC).toBe(r.payC);
      const saveLinesC = r.lines.filter((l) => l.from === 'SAVE').reduce((s, l) => s + l.amountC, 0);
      expect(saveLinesC).toBe(r.saveC);
      checked++;
    }
    expect(checked).toBe(700);
  });

  it('errors when pay is not positive', () => {
    expect(computePayDivision({ payAmount: '0', savePercent: '30', lines: [] })).toEqual({
      ok: false,
      error: 'Pay must be greater than zero',
    });
  });

  it('errors when fixed lines from Save exceed Save', () => {
    const r = computePayDivision({
      payAmount: '1000',
      savePercent: '10',
      lines: [pct('A', '100'), fixed('Big', '500', 'SAVE')],
    });
    expect(r).toEqual({ ok: false, error: 'Fixed lines from Save exceed the Save amount' });
  });

  it('errors when fixed lines from Spend exceed Spend', () => {
    const r = computePayDivision({
      payAmount: '1000',
      savePercent: '30',
      lines: [pct('A', '100'), fixed('Big', '800', 'SPEND')],
    });
    expect(r).toEqual({ ok: false, error: 'Fixed lines from Spend exceed the Spend amount' });
  });

  it('errors when percent lines do not total 100 and there is Save to allocate', () => {
    const r = computePayDivision({
      payAmount: '1000',
      savePercent: '30',
      lines: [pct('A', '90')],
    });
    expect(r.ok).toBe(false);
  });
});

describe('validatePlanLines', () => {
  it('accepts percent lines totalling exactly 100', () => {
    expect(validatePlanLines('30', [pct('A', '60'), pct('B', '40')])).toBeNull();
  });

  it('rejects a total that is not 100', () => {
    expect(validatePlanLines('30', [pct('A', '60'), pct('B', '30')])).toMatch(/total exactly 100/);
  });

  it('rejects duplicate names case-insensitively', () => {
    expect(validatePlanLines('30', [pct('EF', '50'), pct('ef', '50')])).toMatch(/unique/);
  });

  it('rejects more than 20 lines', () => {
    const lines = Array.from({ length: 21 }, (_, i) => pct(`L${i}`, '1'));
    expect(validatePlanLines('30', lines)).toMatch(/at most 20/);
  });

  it('does not require percent lines when Save is 0%', () => {
    expect(validatePlanLines('0', [])).toBeNull();
    expect(validatePlanLines('0', [fixed('Rent', '500', 'SPEND')])).toBeNull();
  });

  it('requires percent lines when Save is above 0%', () => {
    expect(validatePlanLines('30', [fixed('Rent', '500', 'SPEND')])).toMatch(/at least one/);
  });
});

describe('buildDivisionItems', () => {
  const result = ok(computePayDivision({ payAmount: '34495.53', savePercent: '30', lines: JUN_LINES }));

  it('nests earmarks under a Savings transfer when the save account differs from source', () => {
    const items = buildDivisionItems(result, {
      sourceAccountId: 'src',
      saveAccountId: 'sav',
      spendAccountId: 'spd',
    });
    expect(items.map((i) => [i.kind, i.label])).toEqual([
      ['TRANSFER', 'Savings'],
      ['EARMARK', 'EF'],
      ['EARMARK', 'Gotrade'],
      ['EARMARK', 'MP2'],
      ['EARMARK', 'Sinking'],
      ['EARMARK', 'Papa TW'],
      ['TRANSFER', 'Spending'],
    ]);
    expect(items.slice(1, 6).every((i) => i.parentIndex === 0)).toBe(true);
    expect(items[0]).toMatchObject({ fromAccountId: 'src', toAccountId: 'sav', parentIndex: null });
    expect(items[6]).toMatchObject({ fromAccountId: 'src', toAccountId: 'spd' });
    expect(fromCentavos(items[6].amountC)).toBe('23146.87');
    expect(items.map((i) => i.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('makes lines top-level earmarks when the save account equals the source', () => {
    const items = buildDivisionItems(result, {
      sourceAccountId: 'src',
      saveAccountId: 'src',
      spendAccountId: 'spd',
    });
    expect(items.some((i) => i.label === 'Savings')).toBe(false);
    expect(items.filter((i) => i.kind === 'EARMARK').every((i) => i.parentIndex === null)).toBe(true);
    expect(items.some((i) => i.label === 'Spending')).toBe(true);
  });

  it('skips the Spending transfer when the spend account equals the source', () => {
    const items = buildDivisionItems(result, {
      sourceAccountId: 'src',
      saveAccountId: 'sav',
      spendAccountId: 'src',
    });
    expect(items.some((i) => i.label === 'Spending')).toBe(false);
    expect(items.some((i) => i.label === 'Savings')).toBe(true);
  });

  it('drops lines whose amount is zero', () => {
    const tiny = ok(
      computePayDivision({
        payAmount: '0.01',
        savePercent: '100',
        lines: [pct('A', '50'), pct('B', '50')],
      })
    );
    const items = buildDivisionItems(tiny, {
      sourceAccountId: 'src',
      saveAccountId: 'src',
      spendAccountId: 'src',
    });
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('A');
  });
});

describe('isPlanUsable', () => {
  const base = {
    sourceAccountId: 'a',
    saveAccountId: 'b',
    spendAccountId: 'c',
    transferTypeId: 't',
  };
  it('is true when all accounts and the transfer type exist', () => {
    expect(isPlanUsable(base)).toBe(true);
  });
  it('is false when any reference is null', () => {
    expect(isPlanUsable({ ...base, saveAccountId: null })).toBe(false);
    expect(isPlanUsable({ ...base, transferTypeId: null })).toBe(false);
  });
});
