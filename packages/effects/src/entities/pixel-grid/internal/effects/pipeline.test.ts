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
