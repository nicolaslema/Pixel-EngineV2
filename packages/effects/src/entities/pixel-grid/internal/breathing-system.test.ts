import { describe, expect, it } from "vitest";
import { applyBreathingSystem } from "./breathing-system";
import { createTestCellBuffer } from "./test-utils/cell-buffer";

describe("pixel-grid breathing-system", () => {
  it("changes opacity when breathing is enabled", () => {
    const buffer = createTestCellBuffer([
      { x: 10, y: 10, color: "#fff", gap: 5, targetSize: 1 }
    ]);

    applyBreathingSystem({
      buffer,
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

    expect(buffer.opacity[0]).toBeLessThanOrEqual(1);
    expect(buffer.opacity[0]).toBeGreaterThanOrEqual(0.2);
  });
});
