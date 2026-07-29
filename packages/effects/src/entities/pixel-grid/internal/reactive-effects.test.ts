import { describe, expect, it } from "vitest";
import {
  applyMagneticHoverToCell,
  applyReactiveEffectsToCell,
  applyReactiveRipple,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { createTestCell, createTestCellBuffer } from "./test-utils/cell-buffer";
import { RippleInfluence } from "../../../influences/RippleInfluence";
import { PixelCellBuffer } from "./cell-buffer";

const hoverEffects = {
  mode: "reactive" as const,
  radius: 100,
  strength: 1,
  interactionScope: "imageMask" as const,
  deactivate: 0.5,
  displace: 0,
  jitter: 0,
  tintPalette: ["#000", "#fff"],
  magnetic: {
    enabled: false,
    mode: "attract" as const,
    strength: 2.5,
    radius: 100
  }
};

describe("pixel-grid reactive-effects", () => {
  it("evaluates scope filtering", () => {
    expect(shouldAffectCell("all", 0, 0)).toBe(true);
    expect(shouldAffectCell("activeOnly", 0.01, 0)).toBe(true);
    expect(shouldAffectCell("activeOnly", 0, 0)).toBe(false);
    expect(shouldAffectCell("imageMask", 0, 0.1)).toBe(true);
    expect(shouldAffectCell("imageMask", 0, 0)).toBe(false);
  });

  it("computes hover weight from mouse state", () => {
    const { buffer, index } = createTestCell({ x: 10, y: 10, color: "#fff", gap: 5 });
    const weightInside = getHoverWeight(buffer, index, { x: 10, y: 10, inside: true }, hoverEffects);
    const weightOutside = getHoverWeight(buffer, index, { x: 10, y: 10, inside: false }, hoverEffects);
    expect(weightInside).toBeGreaterThan(0);
    expect(weightOutside).toBe(0);
  });

  it("applies reactive color and deactivation", () => {
    const { buffer, index } = createTestCell({ x: 0, y: 0, color: "#abc", gap: 5, targetSize: 1 });

    applyReactiveEffectsToCell({
      buffer,
      index,
      interaction: 1,
      originX: 0,
      originY: 0,
      reactiveTime: 0,
      hoverEffects,
      tintPalette: ["#123"]
    });

    expect(buffer.targetSize[index]).toBeLessThan(1);
    expect(buffer.color[index]).toBe("#123");
  });

  it("applies magnetic hover pull when enabled", () => {
    const { buffer, index } = createTestCell({ x: 10, y: 0, color: "#abc", gap: 5 });
    const hoverWithMagnetic = {
      ...hoverEffects,
      magnetic: {
        enabled: true,
        mode: "attract" as const,
        strength: 3,
        radius: 100
      }
    };

    applyMagneticHoverToCell({
      buffer,
      index,
      interaction: 1,
      originX: 0,
      originY: 0,
      hoverEffects: hoverWithMagnetic as any
    });

    expect(buffer.offsetX[index]).toBeLessThan(0);
  });

  describe("applyReactiveRipple", () => {
    function makeGrid(columns: number, rows: number, gap: number): PixelCellBuffer {
      const cells = [];
      for (let x = 0; x < columns; x++) {
        for (let y = 0; y < rows; y++) {
          cells.push({ x: x * gap, y: y * gap, color: "#111111", gap });
        }
      }
      return createTestCellBuffer(cells);
    }

    // Manually-inlined old-style full-bbox double loop (col-outer / row-inner), bypassing
    // getRowRange entirely -- reference implementation matching applyReactiveRipple's shape
    // before the row-range narrowing was added, to prove the optimization is behavior-
    // preserving.
    function applyReactiveRippleReference(params: Parameters<typeof applyReactiveRipple>[0]): void {
      if (!params.rippleEffects.enabled) return;
      if (params.activeRipples.length === 0) return;

      const palette = params.rippleEffects.tintPalette.length > 0
        ? params.rippleEffects.tintPalette
        : params.hoverEffects.tintPalette;

      for (let r = 0; r < params.activeRipples.length; r++) {
        const ripple = params.activeRipples[r];
        const bounds = ripple.getBounds();

        const minCol = Math.max(0, Math.floor(bounds.minX * params.inverseGap));
        const maxCol = Math.min(params.columns - 1, Math.floor(bounds.maxX * params.inverseGap));
        const minRow = Math.max(0, Math.floor(bounds.minY * params.inverseGap));
        const maxRow = Math.min(params.rows - 1, Math.floor(bounds.maxY * params.inverseGap));

        for (let x = minCol; x <= maxCol; x++) {
          for (let y = minRow; y <= maxRow; y++) {
            const index = params.getCellIndex(x, y);
            const { buffer } = params;

            if (!shouldAffectCell(params.hoverEffects.interactionScope, buffer.targetSize[index], params.activeMaskWeightCache[index])) {
              continue;
            }

            const factor = ripple.getRingFactorAt(buffer.x[index], buffer.y[index]);
            if (factor <= 0) continue;

            applyReactiveEffectsToCell({
              buffer,
              index,
              interaction: factor * params.hoverEffects.strength,
              originX: ripple.getOriginX(),
              originY: ripple.getOriginY(),
              reactiveTime: params.reactiveTime,
              hoverEffects: params.hoverEffects,
              tintPalette: palette,
              multipliers: {
                deactivate: params.rippleEffects.deactivateMultiplier,
                displace: params.rippleEffects.displaceMultiplier,
                jitter: params.rippleEffects.jitterMultiplier
              }
            });
          }
        }
      }
    }

    const rippleEffects = {
      speed: 0.5,
      thickness: 20,
      strength: 30,
      maxRipples: 20,
      enabled: true,
      deactivateMultiplier: 1,
      displaceMultiplier: 1,
      jitterMultiplier: 1,
      tintPalette: [] as string[]
    };

    it("matches a manually-inlined full-bbox reference for a large-radius ripple", () => {
      const gap = 5;
      const columns = 60;
      const rows = 60;
      const getCellIndex = (x: number, y: number) => x * rows + y;

      const ripple = new RippleInfluence(150, 150, 1, 20, 1, 400);
      ripple.update(180); // radius=180, well past half the ~300-unit grid extent

      const baseParams = {
        activeRipples: [ripple],
        gap,
        inverseGap: 1 / gap,
        columns,
        rows,
        hoverEffects,
        rippleEffects,
        reactiveTime: 0,
        getCellIndex
      };

      const bufferFast = makeGrid(columns, rows, gap);
      applyReactiveRipple({
        ...baseParams,
        buffer: bufferFast,
        activeMaskWeightCache: new Float32Array(bufferFast.count)
      });

      const bufferRef = makeGrid(columns, rows, gap);
      applyReactiveRippleReference({
        ...baseParams,
        buffer: bufferRef,
        activeMaskWeightCache: new Float32Array(bufferRef.count)
      });

      expect(Array.from(bufferFast.targetSize)).toEqual(Array.from(bufferRef.targetSize));
      expect(Array.from(bufferFast.offsetX)).toEqual(Array.from(bufferRef.offsetX));
      expect(Array.from(bufferFast.offsetY)).toEqual(Array.from(bufferRef.offsetY));
      expect(Array.from(bufferFast.color)).toEqual(Array.from(bufferRef.color));
    });

    it("visits strictly fewer cells than the full-bbox reference for a large-radius ripple", () => {
      const gap = 5;
      const columns = 60;
      const rows = 60;
      const getCellIndex = (x: number, y: number) => x * rows + y;

      const ripple = new RippleInfluence(150, 150, 1, 20, 1, 400);
      ripple.update(180);

      const countingIndex = (counter: { count: number }) => (x: number, y: number) => {
        counter.count++;
        return getCellIndex(x, y);
      };
      const fastCounter = { count: 0 };
      const refCounter = { count: 0 };

      const baseParams = {
        activeRipples: [ripple],
        gap,
        inverseGap: 1 / gap,
        columns,
        rows,
        hoverEffects,
        rippleEffects,
        reactiveTime: 0
      };

      const bufferFast = makeGrid(columns, rows, gap);
      applyReactiveRipple({
        ...baseParams,
        buffer: bufferFast,
        activeMaskWeightCache: new Float32Array(bufferFast.count),
        getCellIndex: countingIndex(fastCounter)
      });

      const bufferRef = makeGrid(columns, rows, gap);
      applyReactiveRippleReference({
        ...baseParams,
        buffer: bufferRef,
        activeMaskWeightCache: new Float32Array(bufferRef.count),
        getCellIndex: countingIndex(refCounter)
      });

      expect(fastCounter.count).toBeLessThan(refCounter.count);
    });
  });
});
