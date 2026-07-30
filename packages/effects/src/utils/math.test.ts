import { describe, expect, it } from "vitest";
import { cellularNoise2D, clamp, perlinNoise2D, smoothstep, turbulenceNoise2D } from "./math";

describe("clamp", () => {
  it("clamps to the given range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("smoothstep", () => {
  it("interpolates smoothly between edges", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});

function sampleGrid(fn: (x: number, y: number) => number): number[] {
  const values: number[] = [];
  for (let x = -40; x <= 40; x += 3.7) {
    for (let y = -40; y <= 40; y += 3.7) {
      values.push(fn(x, y));
    }
  }
  return values;
}

const NOISE_FNS: Array<[string, (x: number, y: number) => number]> = [
  ["perlinNoise2D", perlinNoise2D],
  ["cellularNoise2D", cellularNoise2D],
  ["turbulenceNoise2D", turbulenceNoise2D]
];

describe.each(NOISE_FNS)("%s", (_name, fn) => {
  it("is deterministic for the same input", () => {
    expect(fn(3.14, 2.71)).toBe(fn(3.14, 2.71));
    expect(fn(-12.5, 88.2)).toBe(fn(-12.5, 88.2));
  });

  it("stays within [0, 1]", () => {
    const values = sampleGrid(fn);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is not constant across the sample grid", () => {
    const values = sampleGrid(fn);
    const max = Math.max(...values);
    const min = Math.min(...values);
    expect(max - min).toBeGreaterThan(0.15);
  });
});

describe("perlinNoise2D", () => {
  it("is continuous (small input delta -> small output delta)", () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [5.2, -3.1],
      [-17.7, 22.4],
      [100.3, 100.3]
    ];
    for (const [x, y] of points) {
      const a = perlinNoise2D(x, y);
      const b = perlinNoise2D(x + 0.01, y);
      expect(Math.abs(a - b)).toBeLessThan(0.05);
    }
  });
});

describe("cellularNoise2D", () => {
  it("varies across well-separated cells (not a degenerate constant hash)", () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [5, 5],
      [10, 0],
      [0, 10]
    ];
    const values = points.map(([x, y]) => cellularNoise2D(x, y));
    const unique = new Set(values.map((v) => v.toFixed(6)));
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("turbulenceNoise2D", () => {
  it("differs from single-octave perlinNoise2D at the same point", () => {
    const points: Array<[number, number]> = [
      [1.1, 2.2],
      [8.8, -4.4],
      [-15.5, 33.3]
    ];
    let anyDifferent = false;
    for (const [x, y] of points) {
      if (Math.abs(turbulenceNoise2D(x, y) - perlinNoise2D(x, y)) > 1e-6) {
        anyDifferent = true;
      }
    }
    expect(anyDifferent).toBe(true);
  });

  it("respects a custom octave count", () => {
    expect(() => turbulenceNoise2D(1, 1, 1)).not.toThrow();
    expect(turbulenceNoise2D(1, 1, 1)).toBeGreaterThanOrEqual(0);
    expect(turbulenceNoise2D(1, 1, 1)).toBeLessThanOrEqual(1);
  });
});
