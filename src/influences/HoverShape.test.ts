import { describe, it, expect } from "vitest";
import { computeHoverFalloff } from "./HoverShape";

describe("HoverShape", () => {
  it("returns zero outside circle radius", () => {
    const value = computeHoverFalloff(200, 0, {
      radiusX: 100,
      radiusY: 100
    });

    expect(value).toBe(0);
  });

  it("returns stronger falloff at center than near edge", () => {
    const center = computeHoverFalloff(0, 0, {
      radiusX: 100,
      radiusY: 60
    });
    const edge = computeHoverFalloff(90, 50, {
      radiusX: 100,
      radiusY: 60
    });

    expect(center).toBeGreaterThan(edge);
    expect(edge).toBeGreaterThanOrEqual(0);
  });
});
