// Pure pay division math. All money is integer centavos and all percentages
// are integer basis points (percent x 100), so there is no floating-point
// arithmetic on money. No Prisma, React or Next imports: this module is shared
// by the client preview and the server routes.

export type PayPlanLine = {
  name: string; // 1-50 chars, unique within the plan (case-insensitive)
  kind: 'PERCENT' | 'FIXED';
  value: string; // PERCENT: "17.5" (0 < v <= 100, max 2 dp); FIXED: "1000.00" (> 0, max 2 dp)
  from?: 'SPEND' | 'SAVE'; // required when kind === 'FIXED'
};

export type PayDivisionLine = {
  name: string;
  kind: 'PERCENT' | 'FIXED';
  from: 'SPEND' | 'SAVE';
  amountC: number;
  detail: string;
};

export type PayDivisionResult =
  | {
      ok: true;
      payC: number;
      saveC: number;
      spendC: number;
      fixedSpendC: number;
      fixedSaveC: number;
      lines: PayDivisionLine[];
    }
  | { ok: false; error: string };

export type PayDivisionOk = Extract<PayDivisionResult, { ok: true }>;

export type DivisionItemDraft = {
  kind: 'TRANSFER' | 'EARMARK';
  label: string;
  detail: string | null;
  amountC: number;
  sortOrder: number;
  parentIndex: number | null; // index into the returned array, or null
  fromAccountId: string | null;
  toAccountId: string | null;
};

export const MAX_PLAN_LINES = 20;
const FULL_BP = 10000;

/** Parses a decimal string (max 2 dp) into integer hundredths. NaN when invalid. */
export function toCentavos(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) : NaN;
  }
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return NaN;
  const [, sign, whole, frac = ''] = match;
  const c = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return sign === '-' ? -c : c;
}

/** Formats integer hundredths as a string with exactly 2 decimals. */
export function fromCentavos(c: number): string {
  const sign = c < 0 ? '-' : '';
  const abs = Math.abs(c);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

function formatPercent(bp: number): string {
  const whole = Math.floor(bp / 100);
  const frac = bp % 100;
  if (frac === 0) return `${whole}%`;
  const fracText = String(frac).padStart(2, '0').replace(/0$/, '');
  return `${whole}.${fracText}%`;
}

/** Sum of the PERCENT lines in basis points. Lines with an invalid value are skipped. */
export function sumPercentBp(lines: PayPlanLine[]): number {
  let total = 0;
  for (const line of lines) {
    if (line.kind !== 'PERCENT') continue;
    const bp = toCentavos(line.value);
    if (Number.isFinite(bp)) total += bp;
  }
  return total;
}

/** Returns an error message, or null when the lines are valid for the Save percent. */
export function validatePlanLines(savePercent: string, lines: PayPlanLine[]): string | null {
  if (lines.length > MAX_PLAN_LINES) {
    return `A plan can have at most ${MAX_PLAN_LINES} lines`;
  }
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.name.trim().toLowerCase();
    if (seen.has(key)) return `Line names must be unique ("${line.name.trim()}" is repeated)`;
    seen.add(key);
  }
  const saveBp = toCentavos(savePercent);
  if (Number.isFinite(saveBp) && saveBp > 0) {
    if (!lines.some((l) => l.kind === 'PERCENT')) {
      return 'Add at least one % of Save line';
    }
    if (sumPercentBp(lines) !== FULL_BP) {
      return 'The % of Save lines must total exactly 100';
    }
  }
  return null;
}

export function computePayDivision(input: {
  payAmount: string;
  savePercent: string;
  lines: PayPlanLine[];
}): PayDivisionResult {
  const payC = toCentavos(input.payAmount);
  if (!Number.isFinite(payC) || payC <= 0) {
    return { ok: false, error: 'Pay must be greater than zero' };
  }
  if (!Number.isSafeInteger(payC * FULL_BP)) {
    return { ok: false, error: 'Pay is too large' };
  }
  const saveBp = toCentavos(input.savePercent);
  if (!Number.isFinite(saveBp) || saveBp < 0 || saveBp > FULL_BP) {
    return { ok: false, error: 'Save percent must be between 0 and 100' };
  }

  const saveC = Math.floor((payC * saveBp + FULL_BP / 2) / FULL_BP);

  const values: number[] = [];
  let fixedSpendC = 0;
  let fixedSaveC = 0;
  for (const line of input.lines) {
    const v = toCentavos(line.value);
    if (!Number.isFinite(v) || v <= 0) {
      return { ok: false, error: `Line "${line.name}" has an invalid value` };
    }
    if (line.kind === 'PERCENT') {
      if (v > FULL_BP) return { ok: false, error: `Line "${line.name}" is over 100%` };
    } else if (line.from === 'SAVE') {
      fixedSaveC += v;
    } else if (line.from === 'SPEND') {
      fixedSpendC += v;
    } else {
      return { ok: false, error: `Line "${line.name}" needs a source (Spend or Save)` };
    }
    values.push(v);
  }

  if (fixedSaveC > saveC) {
    return { ok: false, error: 'Fixed lines from Save exceed the Save amount' };
  }
  if (fixedSpendC > payC - saveC) {
    return { ok: false, error: 'Fixed lines from Spend exceed the Spend amount' };
  }

  const poolC = saveC - fixedSaveC;
  const percentIdx: number[] = [];
  input.lines.forEach((line, i) => {
    if (line.kind === 'PERCENT') percentIdx.push(i);
  });
  const totalBp = percentIdx.reduce((sum, i) => sum + values[i], 0);
  if (poolC > 0 && totalBp !== FULL_BP) {
    return { ok: false, error: 'The % of Save lines must total exactly 100' };
  }

  const amounts: number[] = input.lines.map((line, i) => (line.kind === 'FIXED' ? values[i] : 0));
  const remainders: Array<{ idx: number; rem: number }> = [];
  let allocated = 0;
  for (const i of percentIdx) {
    const product = poolC * values[i];
    const floor = Math.floor(product / FULL_BP);
    amounts[i] = floor;
    allocated += floor;
    remainders.push({ idx: i, rem: product % FULL_BP });
  }
  const leftover = percentIdx.length > 0 ? poolC - allocated : 0;
  remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx);
  for (let k = 0; k < leftover; k++) {
    amounts[remainders[k].idx] += 1;
  }

  const lines: PayDivisionLine[] = input.lines.map((line, i) => ({
    name: line.name,
    kind: line.kind,
    from: line.kind === 'FIXED' ? (line.from as 'SPEND' | 'SAVE') : 'SAVE',
    amountC: amounts[i],
    detail: line.kind === 'PERCENT' ? formatPercent(values[i]) : 'fixed',
  }));

  return {
    ok: true,
    payC,
    saveC,
    spendC: payC - saveC - fixedSpendC,
    fixedSpendC,
    fixedSaveC,
    lines,
  };
}

export function buildDivisionItems(
  result: PayDivisionOk,
  accounts: { sourceAccountId: string; saveAccountId: string; spendAccountId: string }
): DivisionItemDraft[] {
  const { sourceAccountId, saveAccountId, spendAccountId } = accounts;
  const items: DivisionItemDraft[] = [];
  const visibleLines = result.lines.filter((l) => l.amountC > 0);

  const pushLines = (parentIndex: number | null) => {
    for (const line of visibleLines) {
      items.push({
        kind: 'EARMARK',
        label: line.name,
        detail: line.detail,
        amountC: line.amountC,
        sortOrder: items.length,
        parentIndex,
        fromAccountId: null,
        toAccountId: null,
      });
    }
  };

  const savingsAmountC = result.saveC + result.fixedSpendC;
  if (saveAccountId !== sourceAccountId && savingsAmountC > 0) {
    items.push({
      kind: 'TRANSFER',
      label: 'Savings',
      detail: null,
      amountC: savingsAmountC,
      sortOrder: items.length,
      parentIndex: null,
      fromAccountId: sourceAccountId,
      toAccountId: saveAccountId,
    });
    pushLines(items.length - 1);
  } else {
    pushLines(null);
  }

  if (spendAccountId !== sourceAccountId && result.spendC > 0) {
    items.push({
      kind: 'TRANSFER',
      label: 'Spending',
      detail: null,
      amountC: result.spendC,
      sortOrder: items.length,
      parentIndex: null,
      fromAccountId: sourceAccountId,
      toAccountId: spendAccountId,
    });
  }

  return items;
}

export function isPlanUsable(plan: {
  sourceAccountId: string | null;
  saveAccountId: string | null;
  spendAccountId: string | null;
  transferTypeId: string | null;
}): boolean {
  return Boolean(
    plan.sourceAccountId && plan.saveAccountId && plan.spendAccountId && plan.transferTypeId
  );
}
