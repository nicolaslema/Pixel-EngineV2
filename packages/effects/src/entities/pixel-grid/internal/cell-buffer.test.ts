import { describe, expect, it, vi } from "vitest";
import {
  createCellBuffer,
  getBreathFactor,
  getInterpolatedOffsetX,
  getInterpolatedOffsetY,
  getInterpolatedOpacity,
  getInterpolatedSize,
  resetVisualState,
  snapshotPreviousState,
  updateCell
} from "./cell-buffer";

describe("cell-buffer", () => {
  it("creates a buffer sized columns*rows with maxSize/gap collapsed to a shared scalar", () => {
    const buffer = createCellBuffer(3, 2, 10, ["#111111"]);

    expect(buffer.count).toBe(6);
    expect(buffer.gap).toBe(10);
    expect(buffer.maxSize).toBe(10);
    expect(buffer.x.length).toBe(6);
    expect(buffer.color.length).toBe(6);
  });

  it("positions cells using the x-outer/y-inner i = x*rows+y mapping (matches getCellIndex)", () => {
    const buffer = createCellBuffer(2, 3, 5, ["#111111"]);

    // column 1 (x=1), row 2 (y=2) -> index = 1*3+2 = 5
    expect(buffer.x[5]).toBe(5);
    expect(buffer.y[5]).toBe(10);
  });

  it("calls Math.random exactly 3 times per cell (color, breathPhase, breathOffset) in order", () => {
    const calls: number[] = [];
    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      calls.push(calls.length);
      return 0;
    });

    createCellBuffer(2, 1, 10, ["#111111", "#222222"]);

    expect(calls.length).toBe(6);
    randomSpy.mockRestore();
  });

  it("initializes opacity and previousOpacity to 1 (Float32Array defaults to 0)", () => {
    const buffer = createCellBuffer(2, 2, 10, ["#111111"]);

    expect(Array.from(buffer.opacity)).toEqual([1, 1, 1, 1]);
    expect(Array.from(buffer.previousOpacity)).toEqual([1, 1, 1, 1]);
  });

  it("initializes color/baseColor to the same picked color and everything else to 0", () => {
    const buffer = createCellBuffer(1, 1, 10, ["#abcdef"]);

    expect(buffer.color[0]).toBe("#abcdef");
    expect(buffer.baseColor[0]).toBe("#abcdef");
    expect(buffer.size[0]).toBe(0);
    expect(buffer.targetSize[0]).toBe(0);
    expect(buffer.offsetX[0]).toBe(0);
    expect(buffer.offsetY[0]).toBe(0);
  });

  it("getBreathFactor matches PixelCell's original formula", () => {
    const buffer = createCellBuffer(1, 1, 10, ["#111111"]);
    buffer.breathPhase[0] = 1.2;
    buffer.breathOffset[0] = 0.7;

    // Read back the actual stored float32 values (not the float64 literals) since
    // Float32Array truncates precision on assignment.
    const t = 500 * 0.001 * 1.5;
    const expected =
      (Math.sin(t + buffer.breathPhase[0]) * 0.5 + 0.5) * buffer.breathOffset[0];

    expect(getBreathFactor(buffer, 0, 500, 1.5)).toBeCloseTo(expected, 10);
  });

  it("updateCell eases size toward targetSize", () => {
    const buffer = createCellBuffer(1, 1, 10, ["#111111"]);
    buffer.size[0] = 0;
    buffer.targetSize[0] = 10;

    updateCell(buffer, 0, 0.5);

    expect(buffer.size[0]).toBeCloseTo(5, 10);
  });

  it("snapshotPreviousState copies current fields into previous*", () => {
    const buffer = createCellBuffer(1, 1, 10, ["#111111"]);
    buffer.size[0] = 3;
    buffer.offsetX[0] = 1;
    buffer.offsetY[0] = -1;
    buffer.opacity[0] = 0.5;

    snapshotPreviousState(buffer, 0);

    expect(buffer.previousSize[0]).toBe(3);
    expect(buffer.previousOffsetX[0]).toBe(1);
    expect(buffer.previousOffsetY[0]).toBe(-1);
    expect(buffer.previousOpacity[0]).toBe(0.5);
  });

  it("resetVisualState zeroes offsets, restores baseColor, and resets opacity to 1", () => {
    const buffer = createCellBuffer(1, 1, 10, ["#334155"]);
    buffer.offsetX[0] = 5;
    buffer.offsetY[0] = -2;
    buffer.opacity[0] = 0.2;
    buffer.color[0] = "#ff0000";

    resetVisualState(buffer, 0);

    expect(buffer.offsetX[0]).toBe(0);
    expect(buffer.offsetY[0]).toBe(0);
    expect(buffer.opacity[0]).toBe(1);
    expect(buffer.color[0]).toBe("#334155");
  });

  it("getInterpolated* lerp between previous* and current fields", () => {
    const buffer = createCellBuffer(1, 1, 10, ["#111111"]);
    buffer.previousSize[0] = 0;
    buffer.size[0] = 10;
    buffer.previousOffsetX[0] = 0;
    buffer.offsetX[0] = 4;
    buffer.previousOffsetY[0] = 2;
    buffer.offsetY[0] = 6;
    buffer.previousOpacity[0] = 1;
    buffer.opacity[0] = 0;

    expect(getInterpolatedSize(buffer, 0, 0.5)).toBeCloseTo(5, 10);
    expect(getInterpolatedOffsetX(buffer, 0, 0.5)).toBeCloseTo(2, 10);
    expect(getInterpolatedOffsetY(buffer, 0, 0.5)).toBeCloseTo(4, 10);
    expect(getInterpolatedOpacity(buffer, 0, 0.5)).toBeCloseTo(0.5, 10);
  });
});
