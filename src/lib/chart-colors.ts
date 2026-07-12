/**
 * Distinguishable categorical colors for charts, on the dark teal-tinted theme.
 *
 * A stateless per-key hash (the previous approach) cannot guarantee N distinct
 * colors for N categories - that's a pigeonhole/birthday-problem impossibility
 * once a chart renders 15+ categories. Instead, colors are assigned **set-aware**:
 * `getCategoryColorMap` takes the full list of keys present in one render and
 * hands out slots from a curated 20-color OKLCH palette, hand-tuned so every
 * pair is perceptually distinct (see `src/lib/__tests__/chart-colors.test.ts`).
 *
 * Trade-off: a category's color can change when the surrounding set changes
 * (e.g. month to month) - accepted in exchange for guaranteed within-view
 * distinctness.
 */

// 20 OKLCH colors hand-tuned (farthest-point sampling + local optimization over
// L in [0.55, 0.82], C in [0.11, 0.18], full hue wheel) so every pairwise OKLab
// distance clears MIN_DISTINCT_DISTANCE. Ordered so earlier entries are the
// most mutually separated (the common case of ~8 categories looks strongest).
export const CATEGORY_PALETTE: string[] = [
  "oklch(0.683 0.180 240.4)",
  "oklch(0.820 0.180 59.1)",
  "oklch(0.550 0.180 7.4)",
  "oklch(0.550 0.180 109.7)",
  "oklch(0.820 0.180 317.8)",
  "oklch(0.820 0.180 166.1)",
  "oklch(0.820 0.180 112.4)",
  "oklch(0.550 0.180 161.4)",
  "oklch(0.820 0.110 252.7)",
  "oklch(0.681 0.180 188.9)",
  "oklch(0.553 0.180 316.1)",
  "oklch(0.684 0.177 136.5)",
  "oklch(0.684 0.180 84.9)",
  "oklch(0.550 0.180 58.1)",
  "oklch(0.688 0.180 291.1)",
  "oklch(0.684 0.180 342.4)",
  "oklch(0.820 0.180 8.6)",
  "oklch(0.550 0.180 264.9)",
  "oklch(0.688 0.180 34.5)",
  "oklch(0.550 0.178 214.3)",
];

// The lightness shift applied when wrapping past the 20-color palette, so a
// wrapped color (#21+) is not identical to its base. Alternates sign per wrap
// cycle. Not guaranteed glanceable-distinct past 20 - acceptable degradation.
const WRAP_LIGHTNESS_DELTA = 0.08;
const MIN_LIGHTNESS = 0.3;
const MAX_LIGHTNESS = 0.95;

/** Parses an `oklch(L C H)` string into its numeric components. */
function parseOklch(oklch: string): { l: number; c: number; h: number } {
  const match = oklch.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/
  );
  if (!match) {
    throw new Error(`Invalid oklch string: ${oklch}`);
  }
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

/** Converts an `oklch(L C H)` string to OKLab `[L, a, b]` (polar -> cartesian). */
export function oklchToOklab(oklch: string): [number, number, number] {
  const { l, c, h } = parseOklch(oklch);
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

/** Euclidean distance between two OKLCH colors in OKLab space. */
export function perceptualDistance(a: string, b: string): number {
  const [l1, a1, b1] = oklchToOklab(a);
  const [l2, a2, b2] = oklchToOklab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

function shiftLightness(oklch: string, delta: number): string {
  const { l, c, h } = parseOklch(oklch);
  const shifted = Math.min(MAX_LIGHTNESS, Math.max(MIN_LIGHTNESS, l + delta));
  return `oklch(${shifted.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/**
 * Assigns each key a color from `CATEGORY_PALETTE`, guaranteeing all colors
 * are distinct for up to 20 keys. Deterministic: sorts keys ascending so the
 * same set (in any input order) always maps identically across re-renders.
 * Past 20 keys, palette slots are reused with an alternating lightness shift.
 */
export function getCategoryColorMap(keys: string[]): Map<string, string> {
  const sorted = Array.from(new Set(keys)).sort();
  const map = new Map<string, string>();
  const paletteSize = CATEGORY_PALETTE.length;

  sorted.forEach((key, i) => {
    const base = CATEGORY_PALETTE[i % paletteSize];
    const wrapCycle = Math.floor(i / paletteSize);
    if (wrapCycle === 0) {
      map.set(key, base);
    } else {
      const sign = wrapCycle % 2 === 1 ? 1 : -1;
      map.set(key, shiftLightness(base, sign * WRAP_LIGHTNESS_DELTA));
    }
  });

  return map;
}

// Design tokens (see `src/app/globals.css` `@theme`) used for auto-contrast
// badge text - kept as raw OKLCH values so they work outside Tailwind classes.
const DARK_TEXT = "oklch(0.207 0.024 187.5)"; // --color-primary-950
const LIGHT_TEXT = "oklch(0.985 0.012 187.5)"; // --color-primary-50
const LIGHTNESS_THRESHOLD = 0.6;

/**
 * Returns a readable text color (dark or light) for a given OKLCH background,
 * thresholded on OKLab lightness - lighter backgrounds get dark text, darker
 * backgrounds get light text.
 */
export function getReadableTextColor(oklch: string): string {
  const { l } = parseOklch(oklch);
  return l >= LIGHTNESS_THRESHOLD ? DARK_TEXT : LIGHT_TEXT;
}
