import { describe, expect, it } from "vitest";
import { createPixelGridRuntimeState, compactAliveRipples, resetCell, resetCells } from "./runtime-state";
import { createTestCell, createTestCellBuffer } from "./test-utils/cell-buffer";
import { RippleInfluence } from "../../../influences/RippleInfluence";

describe("pixel-grid runtime-state", () => {
  it("creates stable cache sizes", () => {
    const state = createPixelGridRuntimeState(12);
    expect(state.activeMaskWeightCache.length).toBe(12);
    expect(state.imageMaskWeightCache.length).toBe(12);
    expect(state.textMaskWeightCache.length).toBe(12);
    expect(state.recycledRipples.length).toBe(0);
  });

  it("compacts dead ripples in place", () => {
    const ripples = [
      new RippleInfluence(0, 0, 1, 4, 1, 10),
      new RippleInfluence(0, 0, 1, 4, 1, 10)
    ];
    const ref = ripples;

    ripples[0].update(1000);
    ripples[1].update(1);
    const recycled: RippleInfluence[] = [];
    compactAliveRipples(ripples, recycled);

    expect(ripples).toBe(ref);
    expect(ripples.length).toBe(1);
    expect(recycled.length).toBe(1);
  });

  it("resets visual runtime fields", () => {
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#fff", gap: 5, targetSize: 5, offsetX: 2, opacity: 0.3 }
    ]);

    resetCells(buffer);

    expect(buffer.targetSize[0]).toBe(0);
    expect(buffer.offsetX[0]).toBe(0);
    expect(buffer.opacity[0]).toBe(1);
  });

  it("resetCell on a single cell matches resetCells([cell]) (3b.1 extraction)", () => {
    const makeBuffer = () =>
      createTestCellBuffer([
        {
          x: 0,
          y: 0,
          color: "#abcdef",
          gap: 5,
          targetSize: 5,
          size: 3,
          offsetX: 2,
          offsetY: -1,
          opacity: 0.3
        }
      ]);
    const snapshot = (b: ReturnType<typeof makeBuffer>) => ({
      targetSize: b.targetSize[0],
      previousSize: b.previousSize[0],
      offsetX: b.offsetX[0],
      previousOffsetX: b.previousOffsetX[0],
      offsetY: b.offsetY[0],
      previousOffsetY: b.previousOffsetY[0],
      opacity: b.opacity[0],
      previousOpacity: b.previousOpacity[0],
      color: b.color[0]
    });

    const viaResetCells = makeBuffer();
    resetCells(viaResetCells);

    const viaResetCell = makeBuffer();
    resetCell(viaResetCell, 0);

    expect(snapshot(viaResetCell)).toEqual(snapshot(viaResetCells));
  });

  it("resetCell keeps the untouched createTestCell helper's defaults consistent", () => {
    const { buffer, index } = createTestCell({ x: 0, y: 0, color: "#334155", gap: 10 });
    resetCell(buffer, index);

    expect(buffer.targetSize[index]).toBe(0);
    expect(buffer.color[index]).toBe("#334155");
    expect(buffer.opacity[index]).toBe(1);
  });
});
