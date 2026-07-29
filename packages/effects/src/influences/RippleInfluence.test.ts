import { describe, it, expect } from "vitest";
import { RippleInfluence } from "./RippleInfluence";

function collectRanges(ripple: RippleInfluence, y: number): number[][] {
  const out = new Float64Array(4);
  const count = ripple.getRowRange(y, out);
  const ranges: number[][] = [];
  for (let i = 0; i < count; i++) {
    ranges.push([out[i * 2], out[i * 2 + 1]]);
  }
  return ranges;
}

describe("RippleInfluence", () => {
  it("ring factor is positive on ring and zero far away", () => {
    const ripple = new RippleInfluence(0, 0, 1, 10, 1, 100);
    ripple.update(50);

    const onRing = ripple.getRingFactorAt(50, 0);
    const far = ripple.getRingFactorAt(90, 0);

    expect(onRing).toBeGreaterThan(0);
    expect(far).toBe(0);
  });

  describe("getRowRange", () => {
    it("returns 0 pairs for a row entirely outside the ring's vertical extent", () => {
      const ripple = new RippleInfluence(0, 0, 1, 10, 1, 200);
      ripple.update(50); // radius=50, thickness=10 -> vertical extent is |dy| <= 60

      const out = new Float64Array(4);
      expect(ripple.getRowRange(100, out)).toBe(0);
      expect(ripple.getRowRange(-100, out)).toBe(0);
    });

    it("returns two intervals for a row through the ring center when radius > thickness", () => {
      const ripple = new RippleInfluence(0, 0, 1, 10, 1, 200);
      ripple.update(50); // radius=50, thickness=10 -> low=40, high=60

      const ranges = collectRanges(ripple, 0);
      expect(ranges).toEqual([
        [-60, -40],
        [40, 60]
      ]);
    });

    it("returns one merged interval once the inner hole closes near the top/bottom of the band", () => {
      const ripple = new RippleInfluence(0, 0, 1, 10, 1, 200);
      ripple.update(50); // radius=50, thickness=10 -> low=40, high=60

      // dy=45 -> loSqRaw = 40^2 - 45^2 = 1600 - 2025 < 0 -> hole closed at this row.
      const ranges = collectRanges(ripple, 45);
      expect(ranges.length).toBe(1);
      const hiDx = Math.sqrt(60 * 60 - 45 * 45);
      expect(ranges[0][0]).toBeCloseTo(-hiDx, 10);
      expect(ranges[0][1]).toBeCloseTo(hiDx, 10);
    });

    it("returns one merged interval for every row when radius <= thickness (no hole yet)", () => {
      const ripple = new RippleInfluence(0, 0, 1, 10, 1, 200);
      ripple.update(5); // radius=5, thickness=10 -> radius <= thickness

      for (const y of [0, 5, -8]) {
        const ranges = collectRanges(ripple, y);
        expect(ranges.length).toBe(1);
      }

      // radius === 0 (no update called yet) also always merges.
      const fresh = new RippleInfluence(0, 0, 1, 10, 1, 200);
      const ranges = collectRanges(fresh, 0);
      expect(ranges.length).toBe(1);
    });

    it("returns a zero-width merged interval at the exact tangent row", () => {
      const ripple = new RippleInfluence(0, 0, 1, 10, 1, 200);
      ripple.update(50); // radius=50, thickness=10 -> high=60

      const ranges = collectRanges(ripple, 60);
      expect(ranges.length).toBe(1);
      expect(ranges[0][0]).toBeCloseTo(ranges[0][1], 10);
    });

    it("is always a safe superset of getRingFactorAt across many (radius, thickness, origin) combinations", () => {
      const configs: Array<{ radius: number; thickness: number; originX: number; originY: number }> = [
        { radius: 0, thickness: 10, originX: 0, originY: 0 },
        { radius: 5, thickness: 10, originX: 0, originY: 0 },
        { radius: 50, thickness: 10, originX: 0, originY: 0 },
        { radius: 50, thickness: 60, originX: 0, originY: 0 },
        { radius: 120, thickness: 5, originX: 37, originY: -21 },
        { radius: 300, thickness: 1, originX: -100, originY: 200 }
      ];

      const out = new Float64Array(4);

      for (const cfg of configs) {
        const ripple = new RippleInfluence(
          cfg.originX, cfg.originY, 1, cfg.thickness, 1, cfg.radius + cfg.thickness + 1000
        );
        // Fast-forward radius directly via update() at speed=1.
        ripple.update(cfg.radius);

        const span = cfg.radius + cfg.thickness + 5;
        for (let dy = -span; dy <= span; dy += 3) {
          const y = cfg.originY + dy;
          const count = ripple.getRowRange(y, out);
          const ranges: number[][] = [];
          for (let i = 0; i < count; i++) {
            ranges.push([out[i * 2], out[i * 2 + 1]]);
          }

          // Contract: returned intervals (when 2) must not overlap.
          if (ranges.length === 2) {
            expect(ranges[0][1]).toBeLessThanOrEqual(ranges[1][0]);
          }

          for (let dx = -span; dx <= span; dx += 3) {
            const x = cfg.originX + dx;
            const factor = ripple.getRingFactorAt(x, y);
            if (factor <= 0) continue;

            const insideSomeRange = ranges.some(
              ([minX, maxX]) => x >= minX - 1e-9 && x <= maxX + 1e-9
            );
            expect(insideSomeRange).toBe(true);
          }
        }
      }
    });
  });
});
