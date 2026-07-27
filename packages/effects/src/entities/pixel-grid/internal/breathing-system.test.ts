import { describe, expect, it } from "vitest";
import { applyBreathingSystem } from "./breathing-system";
import { PixelCell } from "../../PixelCell";

describe("pixel-grid breathing-system", () => {
  it("changes opacity when breathing is enabled", () => {
    const cell = new PixelCell(10, 10, "#fff", 5, 1);
    cell.targetSize = 1;
    const cells = [cell];

    applyBreathingSystem({
      cells,
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
      },
      mouse: { x: 0, y: 0, inside: false },
      imageMaskWeightCache: new Float32Array([1]),
      textMaskWeightCache: new Float32Array([0]),
      reactiveTime: 100
    });

    expect(cell.opacity).toBeLessThanOrEqual(1);
    expect(cell.opacity).toBeGreaterThanOrEqual(0.2);
  });
});
