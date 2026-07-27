import { describe, expect, it } from "vitest";
import {
  applyMagneticHoverToCell,
  applyReactiveEffectsToCell,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { PixelCell } from "../../PixelCell";

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
    const cell = new PixelCell(10, 10, "#fff", 5, 1);
    const weightInside = getHoverWeight(cell, { x: 10, y: 10, inside: true }, hoverEffects);
    const weightOutside = getHoverWeight(cell, { x: 10, y: 10, inside: false }, hoverEffects);
    expect(weightInside).toBeGreaterThan(0);
    expect(weightOutside).toBe(0);
  });

  it("applies reactive color and deactivation", () => {
    const cell = new PixelCell(0, 0, "#abc", 5, 1);
    cell.targetSize = 1;

    applyReactiveEffectsToCell({
      cell,
      cellIndex: 0,
      interaction: 1,
      originX: 0,
      originY: 0,
      reactiveTime: 0,
      hoverEffects,
      tintPalette: ["#123"]
    });

    expect(cell.targetSize).toBeLessThan(1);
    expect(cell.color).toBe("#123");
  });

  it("applies magnetic hover pull when enabled", () => {
    const cell = new PixelCell(10, 0, "#abc", 5, 1);
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
      cell,
      interaction: 1,
      originX: 0,
      originY: 0,
      hoverEffects: hoverWithMagnetic as any
    });

    expect(cell.offsetX).toBeLessThan(0);
  });
});
