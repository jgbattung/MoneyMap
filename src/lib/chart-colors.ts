/**
 * Stable, on-brand categorical colors for charts. Maps a category key (id or
 * name) to one of the design-system chart tokens via a stable hash, so a given
 * category keeps the same color regardless of the result set's size or order.
 *
 * Excludes the alarm-red (--chart-4) and purple (--chart-6) tokens to stay on
 * the calm, rationed palette.
 */
const CATEGORY_COLORS = [
  'var(--chart-1)', // teal
  'var(--chart-2)', // brass
  'var(--chart-9)', // cyan
  'var(--chart-10)', // mint
  'var(--chart-3)', // green
  'var(--chart-7)', // orange
  'var(--chart-5)', // slate
  'var(--chart-8)', // blue
];

export function getCategoryColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}
