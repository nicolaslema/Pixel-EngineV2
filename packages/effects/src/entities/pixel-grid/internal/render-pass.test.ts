import { describe, expect, it, vi } from "vitest";
import { renderPixelCells } from "./render-pass";
import { createTestCellBuffer } from "./test-utils/cell-buffer";

describe("renderPixelCells", () => {
  it("renders only cells that pass size threshold", () => {
    const fillRect = vi.fn();
    const ctx = {
      fillStyle: "#000000",
      globalAlpha: 1,
      fillRect
    } as unknown as CanvasRenderingContext2D;

    const buffer = createTestCellBuffer([
      { x: 10, y: 10, color: "#ffffff", gap: 8, size: 0.4, previousSize: 0.4 },
      { x: 24, y: 10, color: "#ffffff", gap: 8, size: 2, previousSize: 2 }
    ]);

    renderPixelCells(
      {
        getContext: () => ctx
      } as any,
      buffer,
      0.5
    );

    expect(fillRect).toHaveBeenCalledTimes(1);
  });

  it("culls cells outside viewport bounds", () => {
    const fillRect = vi.fn();
    const ctx = {
      fillStyle: "#000000",
      globalAlpha: 1,
      fillRect
    } as unknown as CanvasRenderingContext2D;

    const buffer = createTestCellBuffer([
      { x: 10, y: 10, color: "#ffffff", gap: 8, size: 4, previousSize: 4 },
      { x: 400, y: 400, color: "#ffffff", gap: 8, size: 4, previousSize: 4 }
    ]);

    renderPixelCells(
      {
        getContext: () => ctx
      } as any,
      buffer,
      0.5,
      {
        minX: 0,
        minY: 0,
        maxX: 120,
        maxY: 120
      }
    );

    expect(fillRect).toHaveBeenCalledTimes(1);
  });

  it("uses interpolated state when alpha is provided", () => {
    const fillRect = vi.fn();
    const ctx = {
      fillStyle: "#000000",
      globalAlpha: 1,
      fillRect
    } as unknown as CanvasRenderingContext2D;

    const buffer = createTestCellBuffer([
      {
        x: 10,
        y: 10,
        color: "#ffffff",
        gap: 8,
        previousSize: 0,
        size: 8,
        previousOffsetX: 0,
        offsetX: 4,
        previousOffsetY: 0,
        offsetY: 2,
        previousOpacity: 0.4,
        opacity: 1
      }
    ]);

    renderPixelCells(
      {
        getContext: () => ctx
      } as any,
      buffer,
      0.5,
      undefined,
      0.5
    );

    expect(fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.globalAlpha).toBe(1);
  });
});
