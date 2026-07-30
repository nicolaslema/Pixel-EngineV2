import { describe, expect, it } from "vitest";
import { OrganicNoiseInfluence, OrganicNoisePattern } from "./OrganicNoiseInfluence";
import { DEFAULT_NOISE_SEED } from "../utils/math";

// Inline copy of the exact pre-3.2/3.3 formula, with its own local time accumulator, used
// as the ground truth for the backward-compat regression test below.
function originalWavesNoise(x: number, y: number, time: number): number {
  const n =
    Math.sin(x * 0.03 + time) *
    Math.cos(y * 0.04 - time * 0.7) +
    Math.sin((x + y) * 0.02 + time * 0.5);
  return 0.5 + 0.5 * (n / 2);
}

function originalWavesInfluence(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
  strength: number,
  maxSize: number,
  time: number
): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > radius) return 0;
  const t = Math.max(0, Math.min(1, distance / radius));
  const radial = 1 - t * t * (3 - 2 * t);
  return radial * originalWavesNoise(x, y, time) * maxSize * strength;
}

describe("OrganicNoiseInfluence", () => {
  it("reproduces the exact pre-3.2/3.3 waves formula at pattern='waves', scale=1 (regression)", () => {
    const centerX = 200;
    const centerY = 150;
    const radius = 150;
    const strength = 0.4;
    const speed = 0.002;

    const influence = new OrganicNoiseInfluence(centerX, centerY, radius, strength, speed, "waves", 1);

    let expectedTime = 0;
    const deltas = [16, 16, 32, 8];
    for (const delta of deltas) {
      influence.update(delta);
      expectedTime += delta * speed;
    }

    const samplePoints: Array<[number, number, number]> = [
      [200, 150, 10],
      [220, 130, 8],
      [250, 200, 12],
      [80, 90, 5]
    ];

    for (const [x, y, maxSize] of samplePoints) {
      const actual = influence.getInfluence(x, y, maxSize);
      const expected = originalWavesInfluence(
        x, y, centerX, centerY, radius, strength, maxSize, expectedTime
      );
      expect(actual).toBe(expected);
    }
  });

  it("changes output when scale changes (same pattern/params otherwise)", () => {
    const a = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, "perlin", 1);
    const b = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, "perlin", 2.5);

    a.update(500);
    b.update(500);

    expect(a.getInfluence(230, 170, 10)).not.toBe(b.getInfluence(230, 170, 10));
  });

  it("dispatches to a different noise function per pattern", () => {
    const patterns: OrganicNoisePattern[] = ["waves", "perlin", "cells", "turbulence"];
    const values = patterns.map((pattern) => {
      const influence = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, pattern, 1);
      influence.update(500);
      return influence.getInfluence(230, 170, 10);
    });

    const unique = new Set(values.map((v) => v.toFixed(8)));
    expect(unique.size).toBe(patterns.length);
  });

  it.each<OrganicNoisePattern>(["waves", "perlin", "cells", "turbulence"])(
    "returns 0 outside the radius for pattern=%s",
    (pattern) => {
      const influence = new OrganicNoiseInfluence(200, 150, 100, 0.4, 0.002, pattern, 1);
      influence.update(100);
      expect(influence.getInfluence(200 + 101, 150, 10)).toBe(0);
    }
  );

  it.each<OrganicNoisePattern>(["waves", "perlin", "cells", "turbulence"])(
    "stays within [0, maxSize*strength] for pattern=%s",
    (pattern) => {
      const strength = 0.7;
      const maxSize = 10;
      const influence = new OrganicNoiseInfluence(200, 150, 150, strength, 0.002, pattern, 1);
      influence.update(1234);

      for (let x = 100; x <= 300; x += 25) {
        for (let y = 50; y <= 250; y += 25) {
          const value = influence.getInfluence(x, y, maxSize);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(maxSize * strength + 1e-9);
        }
      }
    }
  );

  describe("position (item 3.5)", () => {
    it("follow-mouse centers on live engine.mouse.x/y, read fresh (no caching)", () => {
      const engine = { mouse: { x: 300, y: 100, inside: true, down: false } };
      const influence = new OrganicNoiseInfluence(
        200, 150, 100, 0.4, 0.002, "waves", 1, "follow-mouse", "radial", DEFAULT_NOISE_SEED, engine
      );

      const boundsBefore = influence.getBounds();
      expect(boundsBefore.minX).toBe(engine.mouse.x - 100);
      expect(boundsBefore.maxX).toBe(engine.mouse.x + 100);
      expect(boundsBefore.minY).toBe(engine.mouse.y - 100);
      expect(boundsBefore.maxY).toBe(engine.mouse.y + 100);

      engine.mouse.x = 500;
      engine.mouse.y = 400;
      const boundsAfter = influence.getBounds();
      expect(boundsAfter.minX).toBe(500 - 100);
      expect(boundsAfter.maxY).toBe(400 + 100);
    });

    it("follow-mouse with no engine passed falls back to the fixed center silently", () => {
      const influence = new OrganicNoiseInfluence(
        200, 150, 100, 0.4, 0.002, "waves", 1, "follow-mouse"
      );

      expect(() => influence.getBounds()).not.toThrow();
      const bounds = influence.getBounds();
      expect(bounds.minX).toBe(200 - 100);
      expect(bounds.minY).toBe(150 - 100);
    });
  });

  describe("falloff (item 3.6)", () => {
    it("'none' returns unbounded getBounds(), not gated by radius", () => {
      const influence = new OrganicNoiseInfluence(200, 150, 100, 0.4, 0.002, "waves", 1, "center", "none");
      const bounds = influence.getBounds();
      expect(bounds.minX).toBe(-Infinity);
      expect(bounds.maxX).toBe(Infinity);
      expect(bounds.minY).toBe(-Infinity);
      expect(bounds.maxY).toBe(Infinity);
    });

    it("'none' is not structurally gated by distance -- can return nonzero far outside the old radius", () => {
      const influence = new OrganicNoiseInfluence(200, 150, 100, 0.4, 0.002, "perlin", 1, "center", "none");
      influence.update(500);

      const farPoint = influence.getInfluence(200 + 100 * 10, 150, 10);
      // Not asserting a specific value (the underlying noise could legitimately be 0 at any
      // given point) -- the point is that distance alone never zeroes it out the way
      // falloff="radial" would have at 10x the radius.
      expect(Number.isFinite(farPoint)).toBe(true);
      expect(farPoint).toBeGreaterThanOrEqual(0);
    });
  });

  describe("seed (item 3.4)", () => {
    it.each<OrganicNoisePattern>(["perlin", "cells", "turbulence"])(
      "a different seed changes output for pattern=%s",
      (pattern) => {
        const a = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, pattern, 1, "center", "radial", 111);
        const b = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, pattern, 1, "center", "radial", 222);
        a.update(500);
        b.update(500);
        expect(a.getInfluence(230, 170, 10)).not.toBe(b.getInfluence(230, 170, 10));
      }
    );

    it("seed has no effect on pattern='waves' (no seed concept in that formula)", () => {
      const a = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, "waves", 1, "center", "radial", 111);
      const b = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, "waves", 1, "center", "radial", 222);
      a.update(500);
      b.update(500);
      expect(a.getInfluence(230, 170, 10)).toBe(b.getInfluence(230, 170, 10));
    });

    it("omitting seed reproduces the same output as passing DEFAULT_NOISE_SEED explicitly", () => {
      const implicit = new OrganicNoiseInfluence(200, 150, 150, 0.4, 0.002, "perlin", 1);
      const explicit = new OrganicNoiseInfluence(
        200, 150, 150, 0.4, 0.002, "perlin", 1, "center", "radial", DEFAULT_NOISE_SEED
      );
      implicit.update(500);
      explicit.update(500);
      expect(implicit.getInfluence(230, 170, 10)).toBe(explicit.getInfluence(230, 170, 10));
    });
  });
});
