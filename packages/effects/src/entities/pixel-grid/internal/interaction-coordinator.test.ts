import { describe, expect, it } from "vitest";
import { createPixelGridRuntimeState } from "./runtime-state";
import {
  applyHoverAndBreathingPass,
  applyHoverInteractionsPass,
  applyReactiveRipplePass
} from "./interaction-coordinator";
import { applyBreathingSystem } from "./breathing-system";
import { createTestCellBuffer } from "./test-utils/cell-buffer";
import { RippleInfluence } from "../../../influences/RippleInfluence";

describe("interaction-coordinator", () => {
  it("applies reactive hover effects to eligible cells (magnetic disabled)", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#334155", gap: 10, targetSize: 1 }
    ]);
    const runtime = createPixelGridRuntimeState(buffer.count);
    runtime.reactiveTime = 120;

    applyHoverInteractionsPass({
      buffer,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0.4,
        displace: 4,
        jitter: 1,
        tintPalette: ["#ff0000"],
        magnetic: {
          enabled: false,
          mode: "attract",
          strength: 2,
          radius: 120
        }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: true }
    });

    expect(buffer.targetSize[0]).toBeLessThan(1);
    expect(Math.abs(buffer.offsetX[0]) + Math.abs(buffer.offsetY[0])).toBeGreaterThan(0);
    expect(buffer.color[0]).toBe("#ff0000");
  });

  it("applies magnetic hover pass in classic mode (reactive effect off)", () => {
    const buffer = createTestCellBuffer([
      { x: 30, y: 0, color: "#334155", gap: 10, targetSize: 1 }
    ]);
    const runtime = createPixelGridRuntimeState(buffer.count);
    runtime.activeMaskWeightCache[0] = 1;

    applyHoverInteractionsPass({
      buffer,
      runtime,
      hoverEffects: {
        mode: "classic",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0,
        displace: 0,
        jitter: 0,
        tintPalette: [],
        magnetic: {
          enabled: true,
          mode: "attract",
          strength: 2.2,
          radius: 120
        }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: true }
    });

    expect(buffer.offsetX[0]).toBeLessThan(0);
  });

  it("applies both reactive and magnetic hover effects in the same pass when both are enabled", () => {
    // Regression: applyReactiveHoverPass/applyMagneticHoverPass used to be two separate
    // full-grid passes; fused into applyHoverInteractionsPass. This is the one scenario
    // that was never exercised before (each was only ever tested in isolation) -- confirms
    // the fused pass still applies both effects to a cell that qualifies for both.
    const buffer = createTestCellBuffer([
      { x: 30, y: 0, color: "#334155", gap: 10, targetSize: 1 }
    ]);
    const runtime = createPixelGridRuntimeState(buffer.count);
    runtime.reactiveTime = 90;
    runtime.activeMaskWeightCache[0] = 1;

    applyHoverInteractionsPass({
      buffer,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0.4,
        // displace: 0 so reactive doesn't also touch offsetX -- isolates magnetic's
        // contribution to offsetX below instead of two additive effects fighting over sign.
        displace: 0,
        jitter: 0,
        tintPalette: ["#ff0000"],
        magnetic: {
          enabled: true,
          mode: "attract",
          strength: 2.2,
          radius: 120
        }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: true }
    });

    // Reactive effect landed: targetSize reduced and tint applied.
    expect(buffer.targetSize[0]).toBeLessThan(1);
    expect(buffer.color[0]).toBe("#ff0000");
    // Magnetic effect landed too: pulled toward the origin (negative offsetX, cell at x=30).
    expect(buffer.offsetX[0]).toBeLessThan(0);
  });

  it("does nothing when the pointer is outside the canvas", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#334155", gap: 10, targetSize: 1 }
    ]);
    const runtime = createPixelGridRuntimeState(buffer.count);

    applyHoverInteractionsPass({
      buffer,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0.4,
        displace: 4,
        jitter: 1,
        tintPalette: ["#ff0000"],
        magnetic: { enabled: true, mode: "attract", strength: 2, radius: 120 }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: false }
    });

    expect(buffer.targetSize[0]).toBe(1);
    expect(buffer.offsetX[0]).toBe(0);
    expect(buffer.offsetY[0]).toBe(0);
  });

  it("applies reactive ripple effects when ripples are active", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#475569", gap: 10, targetSize: 1 }
    ]);
    const runtime = createPixelGridRuntimeState(buffer.count);
    runtime.reactiveTime = 64;
    runtime.activeRipples.push(
      new RippleInfluence(0, 0, 0, 10, 1, 100)
    );

    applyReactiveRipplePass({
      buffer,
      runtime,
      rippleEnabled: true,
      gap: 1,
      inverseGap: 1,
      columns: 1,
      rows: 1,
      hoverEffects: {
        interactionScope: "all",
        strength: 1,
        deactivate: 0.3,
        displace: 2,
        jitter: 0.5,
        tintPalette: []
      } as any,
      rippleEffects: {
        enabled: true,
        deactivateMultiplier: 1,
        displaceMultiplier: 1,
        jitterMultiplier: 1,
        tintPalette: ["#00ff00"]
      } as any,
      getCellIndex: () => 0
    });

    expect(buffer.targetSize[0]).toBeLessThan(1);
    expect(buffer.color[0]).toBe("#00ff00");
  });

  it("applyHoverAndBreathingPass matches running hover then breathing sequentially, with no ripples (3b.1)", () => {
    const hoverEffects = {
      mode: "reactive",
      interactionScope: "all",
      radius: 120,
      strength: 1,
      deactivate: 0.4,
      displace: 4,
      jitter: 1,
      tintPalette: ["#ff0000"],
      magnetic: { enabled: true, mode: "attract", strength: 2, radius: 120 }
    } as any;
    const breathing = {
      enabled: true,
      speed: 1,
      radius: 100,
      radiusY: 100,
      shape: "circle",
      strength: 1,
      minOpacity: 0.2,
      maxOpacity: 0.8,
      affectHover: false,
      affectImage: true,
      affectText: false
    } as any;
    const mouse = { x: 0, y: 0, inside: true };

    // createTestCellBuffer's breathPhase/breathOffset default to 0 deterministically (no
    // Math.random involved), so sequentialBuffer and fusedBuffer are directly comparable.
    const makeBuffer = () =>
      createTestCellBuffer([{ x: 20, y: 0, color: "#334155", gap: 10, targetSize: 1 }]);

    const sequentialBuffer = makeBuffer();
    const sequentialRuntime = createPixelGridRuntimeState(1);
    sequentialRuntime.reactiveTime = 90;
    sequentialRuntime.imageMaskWeightCache[0] = 1;

    applyHoverInteractionsPass({
      buffer: sequentialBuffer,
      runtime: sequentialRuntime,
      hoverEffects,
      hoverEnabled: true,
      mouse
    });
    applyBreathingSystem({
      buffer: sequentialBuffer,
      breathing,
      mouse,
      imageMaskWeightCache: sequentialRuntime.imageMaskWeightCache,
      textMaskWeightCache: sequentialRuntime.textMaskWeightCache,
      reactiveTime: sequentialRuntime.reactiveTime
    });

    const fusedBuffer = makeBuffer();
    const fusedRuntime = createPixelGridRuntimeState(1);
    fusedRuntime.reactiveTime = 90;
    fusedRuntime.imageMaskWeightCache[0] = 1;

    applyHoverAndBreathingPass({
      buffer: fusedBuffer,
      runtime: fusedRuntime,
      hoverEffects,
      hoverEnabled: true,
      breathing,
      mouse
    });

    expect(fusedBuffer.targetSize[0]).toBeCloseTo(sequentialBuffer.targetSize[0], 10);
    expect(fusedBuffer.offsetX[0]).toBeCloseTo(sequentialBuffer.offsetX[0], 10);
    expect(fusedBuffer.offsetY[0]).toBeCloseTo(sequentialBuffer.offsetY[0], 10);
    expect(fusedBuffer.opacity[0]).toBeCloseTo(sequentialBuffer.opacity[0], 10);
    expect(fusedBuffer.color[0]).toBe(sequentialBuffer.color[0]);
  });

  it("preserves hover-before-breathing ordering: breathing skips a cell hover deactivated below threshold (3b.1 regression)", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#334155", gap: 10, targetSize: 1 }
    ]);
    const runtime = createPixelGridRuntimeState(1);
    runtime.imageMaskWeightCache[0] = 1;

    applyHoverAndBreathingPass({
      buffer,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        // deactivate=1 at full strength (dx=dy=0, falloff at its max) drives targetSize to 0,
        // well below breathing's 0.001 gate.
        deactivate: 1,
        displace: 0,
        jitter: 0,
        tintPalette: [],
        magnetic: { enabled: false, mode: "attract", strength: 0, radius: 120 }
      } as any,
      hoverEnabled: true,
      breathing: {
        enabled: true,
        speed: 1,
        radius: 100,
        radiusY: 100,
        shape: "circle",
        strength: 1,
        minOpacity: 0.2,
        maxOpacity: 0.8,
        affectHover: false,
        affectImage: true,
        affectText: false
      } as any,
      mouse: { x: 0, y: 0, inside: true }
    });

    expect(buffer.targetSize[0]).toBeLessThanOrEqual(0.001);
    // Breathing must see the post-hover targetSize (already deactivated) within the same
    // fused iteration and therefore skip this cell -- opacity stays untouched at its default.
    expect(buffer.opacity[0]).toBe(1);
  });
});
