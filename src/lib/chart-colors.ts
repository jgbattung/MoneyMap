/**
 * Stable, calm categorical colors for charts. Derives a color per category from
 * a hash of its key, so a category keeps the same color regardless of the
 * result set's size or order. Because the hue is continuous (not a fixed list
 * of tokens), it never runs out or repeats early — it scales to 20+ categories.
 *
 * Fixed OKLCH lightness/chroma keep the whole set muted and cohesive on the
 * dark theme rather than a candy rainbow (the old `hsl(hue, 65%, 60%)`).
 */

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getCategoryColor(key: string): string {
  // Golden-angle rotation spreads hashed keys evenly around the hue wheel so
  // sibling categories rarely land on near-identical hues.
  const hue = (hashKey(key) * 137.508) % 360;
  return `oklch(0.72 0.12 ${hue.toFixed(1)})`;
}
