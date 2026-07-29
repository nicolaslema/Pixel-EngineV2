import { describe, expect, it } from "vitest";
import { resolveGuardedGridDimensions } from "./cell-count-guard";

describe("resolveGuardedGridDimensions", () => {
  it("returns the original gap unchanged when below the cap", () => {
    const result = resolveGuardedGridDimensions(1000, 700, 10, 200_000);
    expect(result.gap).toBe(10);
    expect(result.columns).toBe(Math.ceil(1000 / 10));
    expect(result.rows).toBe(Math.ceil(700 / 10));
    expect(result.clamped).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("is not clamped when the cell count is exactly at the cap", () => {
    // 100x100 = 10000 cells, gap=10 over a 1000x1000 area.
    const result = resolveGuardedGridDimensions(1000, 1000, 10, 10_000);
    expect(result.clamped).toBe(false);
    expect(result.gap).toBe(10);
    expect(result.columns * result.rows).toBe(10_000);
  });

  it("clamps (increases gap) and warns when just above the cap", () => {
    const result = resolveGuardedGridDimensions(1000, 1000, 10, 9_999);
    expect(result.clamped).toBe(true);
    expect(result.gap).toBeGreaterThan(10);
    expect(result.columns * result.rows).toBeLessThanOrEqual(9_999);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("10000");
    expect(result.warnings[0]).toContain("9999");
  });

  it("brings the reported gap<=3 + large-canvas repro under an example cap", () => {
    const result = resolveGuardedGridDimensions(3000, 2000, 2, 200_000);
    expect(result.clamped).toBe(true);
    expect(result.columns * result.rows).toBeLessThanOrEqual(200_000);
  });

  it("the nudge loop always converges under the cap across varied aspect ratios", () => {
    const cases: Array<[number, number, number, number]> = [
      [4000, 50, 1, 50_000],
      [50, 4000, 1, 50_000],
      [10000, 10000, 5, 100_000],
      [1500, 1000, 3, 150_000],
      [333, 777, 0.5, 10_000]
    ];

    for (const [width, height, gap, maxCells] of cases) {
      const result = resolveGuardedGridDimensions(width, height, gap, maxCells);
      expect(result.columns * result.rows).toBeLessThanOrEqual(maxCells);
    }
  });

  it("is idempotent: re-running on its own output does not re-clamp", () => {
    const first = resolveGuardedGridDimensions(3000, 2000, 2, 200_000);
    expect(first.clamped).toBe(true);

    const second = resolveGuardedGridDimensions(3000, 2000, first.gap, 200_000);
    expect(second.clamped).toBe(false);
    expect(second.gap).toBe(first.gap);
    expect(second.columns).toBe(first.columns);
    expect(second.rows).toBe(first.rows);
  });
});
