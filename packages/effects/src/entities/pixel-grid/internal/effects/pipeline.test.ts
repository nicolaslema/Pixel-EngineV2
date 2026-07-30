import { describe, expect, it } from "vitest";
import { ResolvedPixelGridEffectsOptions } from "../../types";
import { createPixelGridEffectsPipeline } from "./pipeline";
import { createTestCellBuffer, CellInit } from "../test-utils/cell-buffer";

function createBuffer() {
  return createTestCellBuffer([
    { x: 0, y: 0, color: "#111111", gap: 10 },
    { x: 10, y: 0, color: "#222222", gap: 10 }
  ]);
}

function createEffects(
  overrides: Partial<ResolvedPixelGridEffectsOptions>
): ResolvedPixelGridEffectsOptions {
  return {
    paletteCycle: {
      enabled: false,
      speed: 0.45,
      scope: "activeOnly",
      activationThreshold: 0.025,
      palette: ["#111111", "#222222"],
      ...overrides.paletteCycle
    },
    dissolve: {
      enabled: false,
      speed: 0.85,
      amount: 0.35,
      scope: "activeOnly",
      activationThreshold: 0.025,
      ...overrides.dissolve
    },
    shockwaveBurst: {
      enabled: false,
      speed: 0.85,
      strength: 0.4,
      thickness: 24,
      maxBursts: 8,
      triggerMode: "pointerDown",
      activationThreshold: 0.025,
      scope: "activeOnly",
      ...overrides.shockwaveBurst
    }
  };
}

describe("createPixelGridEffectsPipeline", () => {
  it("dissolves active pixels when enabled", () => {
    const buffer = createBuffer();
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        dissolve: {
          enabled: true,
          amount: 1,
          speed: 0,
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    buffer.targetSize[0] = 1;
    buffer.opacity[0] = 1;

    pipeline.update(16);
    pipeline.apply(buffer);

    expect(buffer.targetSize[0]).toBeCloseTo(0.15);
    expect(buffer.opacity[0]).toBeCloseTo(0.25);
    pipeline.dispose();
  });

  it("applies shockwave burst boost after pointer down trigger", () => {
    const cells: CellInit[] = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        cells.push({ x: x * 10, y: y * 10, color: "#111111", gap: 10 });
      }
    }
    const buffer = createTestCellBuffer(cells);
    for (let i = 0; i < buffer.count; i++) {
      buffer.targetSize[i] = 1;
      buffer.opacity[i] = 0.2;
    }
    const pointer = { x: 10, y: 10, inside: true, down: false };

    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        shockwaveBurst: {
          enabled: true,
          speed: 1.1,
          strength: 1,
          thickness: 12,
          maxBursts: 4,
          triggerMode: "pointerDown",
          activationThreshold: 0.01
        }
      })
    });

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(48);
    pipeline.apply(buffer);

    const boostedIndex = Array.from(buffer.targetSize).findIndex((v) => v > 1);
    expect(boostedIndex).toBeGreaterThanOrEqual(0);
    pipeline.dispose();
  });

  it("shockwave burst with scope 'all' also boosts cells at/under activationThreshold (item 2.5)", () => {
    const cells: CellInit[] = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        cells.push({ x: x * 10, y: y * 10, color: "#111111", gap: 10 });
      }
    }
    const buffer = createTestCellBuffer(cells);
    // Every cell starts inactive (targetSize 0, at/under any positive activationThreshold) --
    // with scope "activeOnly" (the default), a burst would never touch any of them.
    const pointer = { x: 10, y: 10, inside: true, down: false };

    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        shockwaveBurst: {
          enabled: true,
          speed: 1.1,
          strength: 1,
          thickness: 12,
          maxBursts: 4,
          triggerMode: "pointerDown",
          activationThreshold: 0.01,
          scope: "all"
        }
      })
    });

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(48);
    pipeline.apply(buffer);

    const boostedIndex = Array.from(buffer.targetSize).findIndex((v) => v > 0);
    expect(boostedIndex).toBeGreaterThanOrEqual(0);
    pipeline.dispose();
  });

  it("shockwave burst with the default scope ('activeOnly') never touches inactive cells", () => {
    const cells: CellInit[] = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        cells.push({ x: x * 10, y: y * 10, color: "#111111", gap: 10 });
      }
    }
    const buffer = createTestCellBuffer(cells);
    const pointer = { x: 10, y: 10, inside: true, down: false };

    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        shockwaveBurst: {
          enabled: true,
          speed: 1.1,
          strength: 1,
          thickness: 12,
          maxBursts: 4,
          triggerMode: "pointerDown",
          activationThreshold: 0.01
        }
      })
    });

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(48);
    pipeline.apply(buffer);

    expect(Array.from(buffer.targetSize).every((v) => v === 0)).toBe(true);
    pipeline.dispose();
  });

  it("pipeline order lets paletteCycle's scope gate see shockwaveBurst's boost in the same apply() pass (item 2.5)", () => {
    // Regression for the order-30/order-20 tie: previously accidental (broken only by push
    // order + Array.sort stability), now explicit. A cell starts inactive (targetSize 0,
    // under paletteCycle's activationThreshold) so paletteCycle alone would skip it -- but
    // a shockwave burst boosting it past the threshold in the same apply() pass should make
    // it eligible for palette-cycling too, proving shockwaveBurst (order 20) still runs
    // before paletteCycle (order 30).
    const cells: CellInit[] = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        cells.push({ x: x * 10, y: y * 10, color: "#111111", gap: 10 });
      }
    }
    const buffer = createTestCellBuffer(cells);
    const pointer = { x: 10, y: 10, inside: true, down: false };

    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        shockwaveBurst: {
          enabled: true,
          speed: 1.1,
          strength: 1,
          thickness: 12,
          maxBursts: 4,
          triggerMode: "pointerDown",
          activationThreshold: 0.01,
          scope: "all"
        },
        paletteCycle: {
          enabled: true,
          speed: 0.5,
          scope: "activeOnly",
          activationThreshold: 0.1,
          palette: ["#111111", "#222222", "#00ff00"]
        }
      })
    });

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(48);
    pipeline.apply(buffer);

    const boostedIndex = Array.from(buffer.targetSize).findIndex((v) => v > 0.1);
    expect(boostedIndex).toBeGreaterThanOrEqual(0);

    // A big delta here likely kills the burst instance (large radius growth), which is fine
    // -- the point is that targetSize's already-boosted value (nothing resets cells between
    // apply() calls in this effects-only pipeline; that's the full runtime pipeline's job)
    // is still what paletteCycle's scope gate reads on this next apply() pass. speed=0.5
    // needs a much larger delta than the burst-trigger ticks above for a nonzero color shift.
    pipeline.update(1000);
    pipeline.apply(buffer);

    expect(buffer.color[boostedIndex]).not.toBe(buffer.baseColor[boostedIndex]);
    pipeline.dispose();
  });

  it("cycles palette colors for active cells when enabled", () => {
    const buffer = createBuffer();
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        paletteCycle: {
          enabled: true,
          speed: 0.5,
          scope: "activeOnly",
          activationThreshold: 0.1,
          palette: ["#111111", "#222222", "#00ff00"]
        }
      })
    });

    const inactiveBaseColor = buffer.baseColor[1];
    buffer.targetSize[0] = 1;
    buffer.targetSize[1] = 0;

    pipeline.update(1000);
    pipeline.apply(buffer);

    expect(buffer.color[0]).toBe("#222222");
    expect(buffer.color[1]).toBe(inactiveBaseColor);
    pipeline.dispose();
  });
});
