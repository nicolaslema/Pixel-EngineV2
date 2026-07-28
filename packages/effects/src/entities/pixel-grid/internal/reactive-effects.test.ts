import { describe, expect, it } from "vitest";
import {
  applyMagneticHoverToCell,
  applyReactiveEffectsToCell,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { createTestCell } from "./test-utils/cell-buffer";

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
});
