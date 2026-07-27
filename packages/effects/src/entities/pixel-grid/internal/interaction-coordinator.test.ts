import { describe, expect, it } from "vitest";
import { PixelCell } from "../../PixelCell";
import { createPixelGridRuntimeState } from "./runtime-state";
import {
  applyHoverInteractionsPass,
  applyReactiveRipplePass
} from "./interaction-coordinator";
import { RippleInfluence } from "../../../influences/RippleInfluence";

describe("interaction-coordinator", () => {
  it("applies reactive hover effects to eligible cells (magnetic disabled)", () => {
    const cell = new PixelCell(0, 0, "#334155", 10, 1);
    cell.targetSize = 1;
    const cells = [cell];
    const runtime = createPixelGridRuntimeState(cells.length);
    runtime.reactiveTime = 120;

    applyHoverInteractionsPass({
      cells,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0.4,
        displace: 4,
        jitter: 1,
        tintPalette: ["#ff0000"],
        magnetic: {
          enabled: false,
          mode: "attract",
          strength: 2,
          radius: 120
        }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: true }
    });

    expect(cell.targetSize).toBeLessThan(1);
    expect(Math.abs(cell.offsetX) + Math.abs(cell.offsetY)).toBeGreaterThan(0);
    expect(cell.color).toBe("#ff0000");
  });

  it("applies magnetic hover pass in classic mode (reactive effect off)", () => {
    const cell = new PixelCell(30, 0, "#334155", 10, 1);
    cell.targetSize = 1;
    const cells = [cell];
    const runtime = createPixelGridRuntimeState(cells.length);
    runtime.activeMaskWeightCache[0] = 1;

    applyHoverInteractionsPass({
      cells,
      runtime,
      hoverEffects: {
        mode: "classic",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0,
        displace: 0,
        jitter: 0,
        tintPalette: [],
        magnetic: {
          enabled: true,
          mode: "attract",
          strength: 2.2,
          radius: 120
        }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: true }
    });

    expect(cell.offsetX).toBeLessThan(0);
  });

  it("applies both reactive and magnetic hover effects in the same pass when both are enabled", () => {
    // Regression: applyReactiveHoverPass/applyMagneticHoverPass used to be two separate
    // full-grid passes; fused into applyHoverInteractionsPass. This is the one scenario
    // that was never exercised before (each was only ever tested in isolation) -- confirms
    // the fused pass still applies both effects to a cell that qualifies for both.
    const cell = new PixelCell(30, 0, "#334155", 10, 1);
    cell.targetSize = 1;
    const cells = [cell];
    const runtime = createPixelGridRuntimeState(cells.length);
    runtime.reactiveTime = 90;
    runtime.activeMaskWeightCache[0] = 1;

    applyHoverInteractionsPass({
      cells,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0.4,
        // displace: 0 so reactive doesn't also touch offsetX -- isolates magnetic's
        // contribution to offsetX below instead of two additive effects fighting over sign.
        displace: 0,
        jitter: 0,
        tintPalette: ["#ff0000"],
        magnetic: {
          enabled: true,
          mode: "attract",
          strength: 2.2,
          radius: 120
        }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: true }
    });

    // Reactive effect landed: targetSize reduced and tint applied.
    expect(cell.targetSize).toBeLessThan(1);
    expect(cell.color).toBe("#ff0000");
    // Magnetic effect landed too: pulled toward the origin (negative offsetX, cell at x=30).
    expect(cell.offsetX).toBeLessThan(0);
  });

  it("does nothing when the pointer is outside the canvas", () => {
    const cell = new PixelCell(0, 0, "#334155", 10, 1);
    cell.targetSize = 1;
    const cells = [cell];
    const runtime = createPixelGridRuntimeState(cells.length);

    applyHoverInteractionsPass({
      cells,
      runtime,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "all",
        radius: 120,
        strength: 1,
        deactivate: 0.4,
        displace: 4,
        jitter: 1,
        tintPalette: ["#ff0000"],
        magnetic: { enabled: true, mode: "attract", strength: 2, radius: 120 }
      } as any,
      hoverEnabled: true,
      mouse: { x: 0, y: 0, inside: false }
    });

    expect(cell.targetSize).toBe(1);
    expect(cell.offsetX).toBe(0);
    expect(cell.offsetY).toBe(0);
  });

  it("applies reactive ripple effects when ripples are active", () => {
    const cell = new PixelCell(0, 0, "#475569", 10, 1);
    cell.targetSize = 1;
    const cells = [cell];
    const runtime = createPixelGridRuntimeState(cells.length);
    runtime.reactiveTime = 64;
    runtime.activeRipples.push(
      new RippleInfluence(0, 0, 0, 10, 1, 100)
    );

    applyReactiveRipplePass({
      cells,
      runtime,
      rippleEnabled: true,
      inverseGap: 1,
      columns: 1,
      rows: 1,
      hoverEffects: {
        interactionScope: "all",
        strength: 1,
        deactivate: 0.3,
        displace: 2,
        jitter: 0.5,
        tintPalette: []
      } as any,
      rippleEffects: {
        enabled: true,
        deactivateMultiplier: 1,
        displaceMultiplier: 1,
        jitterMultiplier: 1,
        tintPalette: ["#00ff00"]
      } as any,
      getCellIndex: () => 0
    });

    expect(cell.targetSize).toBeLessThan(1);
    expect(cell.color).toBe("#00ff00");
  });
});
