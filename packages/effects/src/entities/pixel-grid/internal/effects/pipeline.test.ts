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
    },
    waveWobble: {
      enabled: false,
      amplitude: 6,
      frequency: 0.02,
      speed: 1,
      direction: "both",
      scope: "activeOnly",
      activationThreshold: 0.025,
      ...overrides.waveWobble
    },
    cursorSpotlight: {
      enabled: false,
      radius: 180,
      falloff: 140,
      minOpacity: 0.12,
      ...overrides.cursorSpotlight
    },
    chromaticBreathing: {
      enabled: false,
      speed: 1,
      palette: ["#111111", "#222222"],
      scope: "activeOnly",
      activationThreshold: 0.025,
      ...overrides.chromaticBreathing
    },
    scanLineReveal: {
      enabled: false,
      direction: "horizontal",
      speed: 80,
      bandWidth: 60,
      loop: true,
      ...overrides.scanLineReveal
    },
    magneticTrail: {
      enabled: false,
      radius: 90,
      strength: 1.2,
      lifetimeMs: 500,
      maxPoints: 24,
      sampleIntervalMs: 40,
      scope: "activeOnly",
      activationThreshold: 0.025,
      ...overrides.magneticTrail
    },
    glitchRgbSplit: {
      enabled: false,
      radius: 70,
      jitterAmount: 4,
      durationMs: 220,
      maxBursts: 6,
      triggerMode: "pointerDown",
      scope: "activeOnly",
      activationThreshold: 0.025,
      ...overrides.glitchRgbSplit
    },
    gravityFallApart: {
      enabled: false,
      gravity: 0.0009,
      fallDurationMs: 650,
      activationThreshold: 0.025,
      ...overrides.gravityFallApart
    },
    constellationConnect: {
      enabled: false,
      radius: 140,
      linkDistance: 45,
      maxCandidates: 120,
      strength: 1,
      activationThreshold: 0.025,
      ...overrides.constellationConnect
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
          activationThreshold: 0.01,
          scope: "activeOnly"
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
          activationThreshold: 0.01,
          scope: "activeOnly"
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

  it("wave/wobble displaces only active cells (scope 'activeOnly')", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 1 },
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 0 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        waveWobble: {
          enabled: true,
          amplitude: 5,
          frequency: 0,
          speed: 0,
          direction: "both",
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);

    // frequency=0, speed=0 -> phase is always 0 -> sin(0)=0 (offsetX untouched either way),
    // cos(0)=1 -> offsetY += amplitude for the active cell only.
    expect(buffer.offsetY[0]).toBeCloseTo(5);
    expect(buffer.offsetY[1]).toBe(0);
    pipeline.dispose();
  });

  it("wave/wobble direction 'horizontal' only touches offsetX", () => {
    const buffer = createTestCellBuffer([
      { x: 10, y: 0, color: "#111111", gap: 10, targetSize: 1 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        waveWobble: {
          enabled: true,
          amplitude: 5,
          frequency: 0.1,
          speed: 0,
          direction: "horizontal",
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);

    // phase = x*frequency = 10*0.1 = 1
    expect(buffer.offsetX[0]).toBeCloseTo(Math.sin(1) * 5);
    expect(buffer.offsetY[0]).toBe(0);
    pipeline.dispose();
  });

  it("cursor spotlight dims cells outside radius, leaves cells inside untouched", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10 }, // inside radius, untouched
      { x: 300, y: 0, color: "#111111", gap: 10 }, // beyond radius+falloff, fully dimmed
      { x: 125, y: 0, color: "#111111", gap: 10 } // in the falloff band, partial dim
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        cursorSpotlight: {
          enabled: true,
          radius: 100,
          falloff: 50,
          minOpacity: 0.1
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);

    expect(buffer.opacity[0]).toBe(1);
    expect(buffer.opacity[1]).toBeCloseTo(0.1);
    // dist=125 is exactly midway through the falloff band [100,150] -> smoothstep(0.5) = 0.5
    expect(buffer.opacity[2]).toBeCloseTo(1 - 0.5 * (1 - 0.1));
    pipeline.dispose();
  });

  it("cursor spotlight is inert when the pointer is outside the canvas", () => {
    const buffer = createTestCellBuffer([{ x: 500, y: 500, color: "#111111", gap: 10 }]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: false, down: false },
      effects: createEffects({
        cursorSpotlight: { enabled: true, radius: 100, falloff: 50, minOpacity: 0.1 }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);

    expect(buffer.opacity[0]).toBe(1);
    pipeline.dispose();
  });

  it("chromatic breathing cycles palette color per-cell, desynced by breathPhase/breathOffset", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 1, breathPhase: 0, breathOffset: 1 },
      {
        x: 0,
        y: 0,
        color: "#111111",
        gap: 10,
        targetSize: 1,
        breathPhase: Math.PI,
        breathOffset: 1
      }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        chromaticBreathing: {
          enabled: true,
          speed: 1,
          palette: ["#AAAAAA", "#BBBBBB"],
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(1000);
    pipeline.apply(buffer);

    expect(buffer.color[0]).toBe("#BBBBBB");
    expect(buffer.color[1]).toBe("#AAAAAA");
    expect(buffer.color[0]).not.toBe(buffer.color[1]);
    pipeline.dispose();
  });

  it("chromatic breathing with under-2-color palette is a no-op", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 1, breathOffset: 1 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        chromaticBreathing: {
          enabled: true,
          speed: 1,
          palette: ["#AAAAAA"],
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(1000);
    pipeline.apply(buffer);

    expect(buffer.color[0]).toBe(buffer.baseColor[0]);
    pipeline.dispose();
  });

  it("chromaticBreathing (order 40) runs after and wins over paletteCycle (order 30) on the same cell", () => {
    const buffer = createTestCellBuffer([
      {
        x: 0,
        y: 0,
        color: "#111111",
        gap: 10,
        targetSize: 1,
        breathPhase: 0,
        breathOffset: 1
      }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        paletteCycle: {
          enabled: true,
          speed: 0.5,
          scope: "activeOnly",
          activationThreshold: 0.025,
          palette: ["#AAAAAA", "#BBBBBB"]
        },
        chromaticBreathing: {
          enabled: true,
          speed: 1,
          palette: ["#CCCCCC", "#DDDDDD"],
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(1000);
    pipeline.apply(buffer);

    expect(["#CCCCCC", "#DDDDDD"]).toContain(buffer.color[0]);
    pipeline.dispose();
  });

  it("scan line/reveal boosts targetSize progressively behind the sweep line", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10 },
      { x: 120, y: 0, color: "#111111", gap: 10 },
      { x: 1000, y: 0, color: "#111111", gap: 10 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        scanLineReveal: {
          enabled: true,
          direction: "horizontal",
          speed: 1000,
          bandWidth: 60,
          loop: false
        }
      })
    });

    pipeline.update(210);
    pipeline.apply(buffer);

    expect(buffer.targetSize[0]).toBeCloseTo(10); // fully revealed (behind=150 >= bandWidth)
    expect(buffer.targetSize[1]).toBeCloseTo(5); // half revealed (behind=30, smoothstep=0.5)
    expect(buffer.targetSize[2]).toBe(0); // ahead of the line, untouched
    pipeline.dispose();
  });

  it("scan line/reveal with loop:false clamps at the end instead of wrapping back to the start", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10 },
      { x: 500, y: 0, color: "#111111", gap: 10 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        scanLineReveal: {
          enabled: true,
          direction: "horizontal",
          speed: 1000,
          bandWidth: 10,
          loop: false
        }
      })
    });

    pipeline.update(100000); // huge delta, overshoots well past the sweep's end
    pipeline.apply(buffer);

    expect(buffer.targetSize[0]).toBeCloseTo(10);
    expect(buffer.targetSize[1]).toBeCloseTo(10);
    pipeline.dispose();
  });

  it("scan line/reveal with loop:true wraps back to the start on overshoot instead of clamping", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10 },
      { x: 500, y: 0, color: "#111111", gap: 10 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        scanLineReveal: {
          enabled: true,
          direction: "horizontal",
          speed: 1000,
          bandWidth: 10,
          loop: true
        }
      })
    });

    pipeline.update(100000);
    pipeline.apply(buffer);

    expect(buffer.targetSize[0]).toBe(0);
    expect(buffer.targetSize[1]).toBe(0);
    pipeline.dispose();
  });

  it("magnetic trail pulls a nearby active cell toward a freshly sampled point", () => {
    const buffer = createTestCellBuffer([
      { x: 30, y: 0, color: "#111111", gap: 10, targetSize: 1 }
    ]);
    const pointer = { x: 0, y: 0, inside: true, down: false };
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        magneticTrail: {
          enabled: true,
          radius: 90,
          strength: 1.2,
          lifetimeMs: 500,
          maxPoints: 24,
          sampleIntervalMs: 10,
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(10); // samples a point at (0,0), ages it by 10ms
    pipeline.apply(buffer);

    expect(buffer.offsetX[0]).toBeLessThan(0); // pulled toward the point at x=0 from x=30
    expect(buffer.offsetY[0]).toBe(0);
    pipeline.dispose();
  });

  it("magnetic trail drops points once they exceed lifetimeMs", () => {
    const buffer = createTestCellBuffer([
      { x: 30, y: 0, color: "#111111", gap: 10, targetSize: 1 }
    ]);
    const pointer = { x: 0, y: 0, inside: true, down: false };
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        magneticTrail: {
          enabled: true,
          radius: 90,
          strength: 1.2,
          lifetimeMs: 500,
          maxPoints: 24,
          sampleIntervalMs: 10,
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(10); // samples a point
    pointer.inside = false; // stop sampling further points
    pipeline.update(600); // ages the sampled point past lifetimeMs
    pipeline.apply(buffer);

    expect(buffer.offsetX[0]).toBe(0);
    expect(buffer.offsetY[0]).toBe(0);
    pipeline.dispose();
  });

  it("magnetic trail with scope 'activeOnly' skips inactive cells", () => {
    const buffer = createTestCellBuffer([
      { x: 30, y: 0, color: "#111111", gap: 10, targetSize: 0 }
    ]);
    const pointer = { x: 0, y: 0, inside: true, down: false };
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        magneticTrail: {
          enabled: true,
          radius: 90,
          strength: 1.2,
          lifetimeMs: 500,
          maxPoints: 24,
          sampleIntervalMs: 10,
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(10);
    pipeline.apply(buffer);

    expect(buffer.offsetX[0]).toBe(0);
    pipeline.dispose();
  });

  it("glitch/RGB split jitters offset and swaps color for cells within radius after a pointerDown trigger", () => {
    const buffer = createTestCellBuffer([
      { x: 10, y: 0, color: "#111111", gap: 10, targetSize: 1 },
      { x: 1000, y: 0, color: "#222222", gap: 10, targetSize: 1 }
    ]);
    const pointer = { x: 0, y: 0, inside: true, down: false };
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        glitchRgbSplit: {
          enabled: true,
          radius: 70,
          jitterAmount: 4,
          durationMs: 220,
          maxBursts: 6,
          triggerMode: "pointerDown",
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(16);
    pipeline.apply(buffer);

    expect(buffer.offsetX[0]).not.toBe(0);
    expect(buffer.color[0]).not.toBe(buffer.baseColor[0]);
    expect(buffer.offsetX[1]).toBe(0);
    expect(buffer.color[1]).toBe(buffer.baseColor[1]);
    pipeline.dispose();
  });

  it("glitch/RGB split burst expires after durationMs", () => {
    const buffer = createTestCellBuffer([
      { x: 10, y: 0, color: "#111111", gap: 10, targetSize: 1 }
    ]);
    const pointer = { x: 0, y: 0, inside: true, down: false };
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        glitchRgbSplit: {
          enabled: true,
          radius: 70,
          jitterAmount: 4,
          durationMs: 220,
          maxBursts: 6,
          triggerMode: "pointerDown",
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(300); // exceeds durationMs -- burst should be dropped
    pipeline.apply(buffer);

    expect(buffer.offsetX[0]).toBe(0);
    expect(buffer.color[0]).toBe(buffer.baseColor[0]);
    pipeline.dispose();
  });

  it("gravity/fall apart makes a cell fall (offsetY, faded opacity, held targetSize) right after it deactivates", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 1 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        gravityFallApart: {
          enabled: true,
          gravity: 0.0009,
          fallDurationMs: 650,
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer); // seeds prevTargetSize = 1, cell not falling yet

    buffer.targetSize[0] = 0; // simulate the cell deactivating (mask/hover turned off)
    pipeline.update(16);
    pipeline.apply(buffer); // should detect the deactivation edge and start the fall

    expect(buffer.targetSize[0]).toBeGreaterThan(0); // held up during the fall
    expect(buffer.offsetY[0]).toBeGreaterThan(0);
    expect(buffer.opacity[0]).toBeLessThan(1);
    pipeline.dispose();
  });

  it("gravity/fall apart stops overriding the cell once fallDurationMs elapses", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 1 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        gravityFallApart: {
          enabled: true,
          gravity: 0.0009,
          fallDurationMs: 650,
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);
    buffer.targetSize[0] = 0;
    pipeline.update(16);
    pipeline.apply(buffer); // fall starts

    buffer.targetSize[0] = 0; // stays deactivated
    pipeline.update(1000); // exceeds fallDurationMs
    pipeline.apply(buffer);

    expect(buffer.targetSize[0]).toBe(0); // no longer overridden
    pipeline.dispose();
  });

  it("constellation/connect boosts opacity more for clustered active cells near the pointer than an isolated one", () => {
    const buffer = createTestCellBuffer([
      { x: 10, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 0.3 },
      { x: 20, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 0.3 },
      { x: 30, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 0.3 },
      { x: 130, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 0.3 }, // isolated, still in radius
      { x: 200, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 0.3 } // outside radius
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        constellationConnect: {
          enabled: true,
          radius: 140,
          linkDistance: 45,
          maxCandidates: 120,
          strength: 1,
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);

    expect(buffer.opacity[0]).toBeGreaterThan(buffer.opacity[3]); // clustered cell glows more
    expect(buffer.opacity[3]).toBeGreaterThan(0.3); // isolated cell still gets some boost
    expect(buffer.opacity[4]).toBeCloseTo(0.3); // outside radius -- untouched
    pipeline.dispose();
  });

  it("constellation/connect is inert when the pointer is outside the canvas", () => {
    const buffer = createTestCellBuffer([
      { x: 10, y: 0, color: "#111111", gap: 10, targetSize: 1, opacity: 0.3 }
    ]);
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer: { x: 0, y: 0, inside: false, down: false },
      effects: createEffects({
        constellationConnect: {
          enabled: true,
          radius: 140,
          linkDistance: 45,
          maxCandidates: 120,
          strength: 1,
          activationThreshold: 0.025
        }
      })
    });

    pipeline.update(16);
    pipeline.apply(buffer);

    expect(buffer.opacity[0]).toBeCloseTo(0.3);
    pipeline.dispose();
  });

  it("pipeline order lets shockwaveBurst's scope gate see scanLineReveal's boost in the same apply() pass", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#111111", gap: 10, targetSize: 0, opacity: 0.2 }
    ]);
    const pointer = { x: 0, y: 0, inside: true, down: false };
    const pipeline = createPixelGridEffectsPipeline({
      buffer,
      pointer,
      effects: createEffects({
        scanLineReveal: {
          enabled: true,
          direction: "horizontal",
          speed: 100000,
          bandWidth: 10,
          loop: false
        },
        shockwaveBurst: {
          enabled: true,
          speed: 1.1,
          strength: 1,
          thickness: 12,
          maxBursts: 4,
          triggerMode: "pointerDown",
          activationThreshold: 0.025,
          scope: "activeOnly"
        }
      })
    });

    pointer.down = true;
    pipeline.update(1);
    pointer.down = false;
    pipeline.apply(buffer);

    expect(buffer.targetSize[0]).toBeCloseTo(10); // revealed by scanLineReveal
    expect(buffer.opacity[0]).toBeGreaterThan(0.2); // shockwaveBurst's activeOnly gate saw it
    pipeline.dispose();
  });
});
