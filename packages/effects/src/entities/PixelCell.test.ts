import { describe, it, expect } from "vitest";
import { PixelCell } from "./PixelCell";

describe("PixelCell", () => {
  it("resets visual state to base color and no offset", () => {
    const cell = new PixelCell(0, 0, "#ffffff", 5, 1);

    cell.color = "#000000";
    cell.offsetX = 3;
    cell.offsetY = -2;

    cell.resetVisualState();

    expect(cell.color).toBe("#ffffff");
    expect(cell.offsetX).toBe(0);
    expect(cell.offsetY).toBe(0);
  });

  it("produces non-constant breathing factor over time", () => {
    const cell = new PixelCell(10, 20, "#ffffff", 5, 1);

    const a = cell.getBreathFactor(0, 1);
    const b = cell.getBreathFactor(1000, 1);

    expect(a).not.toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
  });
});
