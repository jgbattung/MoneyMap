import { describe, expect, it } from "vitest";
import {
  CATEGORY_PALETTE,
  getCategoryColorMap,
  getReadableTextColor,
  perceptualDistance,
} from "@/lib/chart-colors";

// Target 0.10 (per spec); floor no lower than 0.075 if 20 cohesive dark-theme
// colors genuinely cannot all clear 0.10. The authored palette clears 0.10
// comfortably (see log for the achieved minimum), so no relaxation is needed.
const MIN_DISTINCT_DISTANCE = 0.1;

describe("CATEGORY_PALETTE distinctness", () => {
  it("has exactly 20 colors", () => {
    expect(CATEGORY_PALETTE).toHaveLength(20);
  });

  it("keeps every pairwise OKLab distance above MIN_DISTINCT_DISTANCE", () => {
    const violations: string[] = [];
    let minDistance = Infinity;

    for (let i = 0; i < CATEGORY_PALETTE.length; i++) {
      for (let j = i + 1; j < CATEGORY_PALETTE.length; j++) {
        const d = perceptualDistance(CATEGORY_PALETTE[i], CATEGORY_PALETTE[j]);
        minDistance = Math.min(minDistance, d);
        if (d <= MIN_DISTINCT_DISTANCE) {
          violations.push(
            `[${i}] ${CATEGORY_PALETTE[i]} vs [${j}] ${CATEGORY_PALETTE[j]} = ${d.toFixed(4)}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
    // Sanity check that the assertion above is actually meaningful.
    expect(minDistance).toBeGreaterThan(MIN_DISTINCT_DISTANCE);
  });
});

describe("getCategoryColorMap", () => {
  it("gives every key in a <=20 set a unique color", () => {
    const keys = Array.from({ length: 20 }, (_, i) => `category-${i}`);
    const map = getCategoryColorMap(keys);
    const colors = new Set(map.values());
    expect(map.size).toBe(20);
    expect(colors.size).toBe(20);
  });

  it("is order-independent - the same set in any input order maps identically", () => {
    const keys = ["Groceries", "Rent", "Utilities", "Transport", "Dining"];
    const shuffled = ["Dining", "Groceries", "Transport", "Rent", "Utilities"];

    const mapA = getCategoryColorMap(keys);
    const mapB = getCategoryColorMap(shuffled);

    for (const key of keys) {
      expect(mapB.get(key)).toBe(mapA.get(key));
    }
  });

  it("is stable across repeated calls with the same set", () => {
    const keys = ["Groceries", "Rent", "Utilities"];
    const mapA = getCategoryColorMap(keys);
    const mapB = getCategoryColorMap(keys);

    for (const key of keys) {
      expect(mapB.get(key)).toBe(mapA.get(key));
    }
  });

  it("dedupes repeated keys", () => {
    const map = getCategoryColorMap(["Groceries", "Groceries", "Rent"]);
    expect(map.size).toBe(2);
  });

  it("degrades gracefully past 20 keys via a lightness-shifted wrap", () => {
    const keys = Array.from({ length: 25 }, (_, i) => `category-${i}`);
    const map = getCategoryColorMap(keys);
    expect(map.size).toBe(25);

    const sorted = Array.from(map.keys()).sort();
    const base = map.get(sorted[0])!;
    const wrapped = map.get(sorted[20])!;
    // Wrapped color reuses the same palette slot (index 0 % 20) but is not
    // identical to the base - the lightness shift must have applied.
    expect(wrapped).not.toBe(base);
  });
});

describe("getReadableTextColor", () => {
  it("returns the dark token for a light background", () => {
    const light = "oklch(0.850 0.180 59.1)";
    expect(getReadableTextColor(light)).toBe("oklch(0.207 0.024 187.5)");
  });

  it("returns the light token for a dark background", () => {
    const dark = "oklch(0.550 0.180 7.4)";
    expect(getReadableTextColor(dark)).toBe("oklch(0.985 0.012 187.5)");
  });
});
