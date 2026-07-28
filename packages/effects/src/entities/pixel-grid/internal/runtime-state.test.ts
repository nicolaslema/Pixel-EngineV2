import { describe, expect, it } from "vitest";
import { createPixelGridRuntimeState, compactAliveRipples, resetCell, resetCells } from "./runtime-state";
import { PixelCell } from "../../PixelCell";
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
    const cells = [new PixelCell(0, 0, "#fff", 5, 1)];
    cells[0].targetSize = 5;
    cells[0].offsetX = 2;
    cells[0].opacity = 0.3;

    resetCells(cells);

    expect(cells[0].targetSize).toBe(0);
    expect(cells[0].offsetX).toBe(0);
    expect(cells[0].opacity).toBe(1);
  });

  it("resetCell on a single cell matches resetCells([cell]) (3b.1 extraction)", () => {
    // breathPhase/breathOffset are seeded from Math.random() at construction, so comparing
    // whole PixelCell instances would spuriously differ between two `new PixelCell(...)`
    // calls -- compare only the fields resetCell/resetCells actually touch instead.
    const makeCell = () => {
      const cell = new PixelCell(0, 0, "#fff", 5, 1);
      cell.targetSize = 5;
      cell.size = 3;
      cell.offsetX = 2;
      cell.offsetY = -1;
      cell.opacity = 0.3;
      cell.color = "#abcdef";
      return cell;
    };
    const snapshot = (cell: PixelCell) => ({
      targetSize: cell.targetSize,
      previousSize: cell.previousSize,
      offsetX: cell.offsetX,
      previousOffsetX: cell.previousOffsetX,
      offsetY: cell.offsetY,
      previousOffsetY: cell.previousOffsetY,
      opacity: cell.opacity,
      previousOpacity: cell.previousOpacity,
      color: cell.color
    });

    const viaResetCells = makeCell();
    resetCells([viaResetCells]);

    const viaResetCell = makeCell();
    resetCell(viaResetCell);

    expect(snapshot(viaResetCell)).toEqual(snapshot(viaResetCells));
  });
});
