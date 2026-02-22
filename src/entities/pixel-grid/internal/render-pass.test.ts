import { describe, expect, it, vi } from "vitest";
import { PixelCell } from "../../PixelCell";
import { renderPixelCells } from "./render-pass";

describe("renderPixelCells", () => {
  it("renders only cells that pass size threshold", () => {
    const fillRect = vi.fn();
    const ctx = {
      fillStyle: "#000000",
      globalAlpha: 1,
      fillRect
    } as unknown as CanvasRenderingContext2D;

    const cells = [
      new PixelCell(10, 10, "#ffffff", 8, 1),
      new PixelCell(24, 10, "#ffffff", 8, 1)
    ];
    cells[0].size = 0.4;
    cells[1].size = 2;

    renderPixelCells(
      {
        getContext: () => ctx
      } as any,
      cells,
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

    const inside = new PixelCell(10, 10, "#ffffff", 8, 1);
    inside.size = 4;
    const outside = new PixelCell(400, 400, "#ffffff", 8, 1);
    outside.size = 4;

    renderPixelCells(
      {
        getContext: () => ctx
      } as any,
      [inside, outside],
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
});
