import { describe, expect, it } from "vitest";
import { OrganicNoiseInfluence, OrganicNoisePattern } from "./OrganicNoiseInfluence";

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
});
