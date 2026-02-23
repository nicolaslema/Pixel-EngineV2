import { describe, expect, it } from "vitest";
import { PixelCell } from "../../PixelCell";
import { createMaskWeightCacheCoordinator } from "./mask-weight-cache";
import { createPixelGridRuntimeState } from "./runtime-state";

describe("mask-weight-cache", () => {
  it("recomputes cache when reactive imageMask scope needs mask weights", () => {
    const cells = [new PixelCell(10, 20, "#111111", 8, 1)];
    const runtime = createPixelGridRuntimeState(cells.length);

    const coordinator = createMaskWeightCacheCoordinator({
      cells,
      runtime,
      maskState: {
        imageMask: {
          getInfluence: () => 0.75
        } as any,
        textMask: null,
        morphMask: null,
        update: () => {},
        play: () => {},
        pause: () => {},
        reset: () => {},
        isPlaying: () => false,
        getCurrentStepIndex: () => 0
      },
      hoverEffects: {
        mode: "reactive",
        interactionScope: "imageMask"
      } as any,
      rippleEffects: {
        enabled: true
      } as any,
      breathing: {
        enabled: false,
        affectImage: false,
        affectText: false
      } as any,
      influenceOptions: {
        hover: true,
        ripple: true
      }
    });

    expect(coordinator.shouldRecompute()).toBe(true);

    coordinator.recompute();

    expect(runtime.imageMaskWeightCache[0]).toBeCloseTo(0.75, 5);
    expect(runtime.activeMaskWeightCache[0]).toBeCloseTo(0.75, 5);
  });

  it("zeros caches when mask sources disappear after being active", () => {
    const cells = [new PixelCell(0, 0, "#222222", 8, 1)];
    const runtime = createPixelGridRuntimeState(cells.length);
    let imageMask: { getInfluence: () => number } | null = {
      getInfluence: () => 0.9
    };

    const maskState = {
      get imageMask() {
        return imageMask as any;
      },
      textMask: null,
      morphMask: null,
      update: () => {},
      play: () => {},
      pause: () => {},
      reset: () => {},
      isPlaying: () => false,
      getCurrentStepIndex: () => 0
    };

    const coordinator = createMaskWeightCacheCoordinator({
      cells,
      runtime,
      maskState,
      hoverEffects: {
        mode: "reactive",
        interactionScope: "imageMask"
      } as any,
      rippleEffects: {
        enabled: true
      } as any,
      breathing: {
        enabled: true,
        affectImage: true,
        affectText: false
      } as any,
      influenceOptions: {
        hover: true,
        ripple: true
      }
    });

    expect(coordinator.shouldRecompute()).toBe(true);
    coordinator.recompute();
    expect(runtime.activeMaskWeightCache[0]).toBeCloseTo(0.9, 5);

    imageMask = null;
    expect(coordinator.shouldRecompute()).toBe(false);
    expect(runtime.activeMaskWeightCache[0]).toBe(0);
    expect(runtime.imageMaskWeightCache[0]).toBe(0);
    expect(runtime.textMaskWeightCache[0]).toBe(0);
  });
});
