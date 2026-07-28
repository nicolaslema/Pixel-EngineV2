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

  it("prepareRecompute + writeCellMaskWeights matches recompute for an image mask (3b.1)", () => {
    const cells = [new PixelCell(10, 20, "#111111", 8, 1), new PixelCell(20, 30, "#222222", 8, 1)];
    const runtimeA = createPixelGridRuntimeState(cells.length);
    const runtimeB = createPixelGridRuntimeState(cells.length);

    const maskState = {
      imageMask: { getInfluence: () => 0.6 } as any,
      textMask: null,
      morphMask: null,
      update: () => {},
      play: () => {},
      pause: () => {},
      reset: () => {},
      isPlaying: () => false,
      getCurrentStepIndex: () => 0
    };

    const sharedParams = {
      cells,
      hoverEffects: { mode: "reactive", interactionScope: "imageMask" } as any,
      rippleEffects: { enabled: true } as any,
      breathing: { enabled: false, affectImage: false, affectText: false } as any,
      influenceOptions: { hover: true, ripple: true }
    };

    const coordinatorA = createMaskWeightCacheCoordinator({ ...sharedParams, runtime: runtimeA, maskState });
    coordinatorA.recompute();

    const coordinatorB = createMaskWeightCacheCoordinator({ ...sharedParams, runtime: runtimeB, maskState });
    const shouldWrite = coordinatorB.prepareRecompute();
    expect(shouldWrite).toBe(true);
    for (let i = 0; i < cells.length; i++) {
      coordinatorB.writeCellMaskWeights(cells[i], i);
    }

    expect(Array.from(runtimeB.imageMaskWeightCache)).toEqual(Array.from(runtimeA.imageMaskWeightCache));
    expect(Array.from(runtimeB.textMaskWeightCache)).toEqual(Array.from(runtimeA.textMaskWeightCache));
    expect(Array.from(runtimeB.activeMaskWeightCache)).toEqual(Array.from(runtimeA.activeMaskWeightCache));
  });

  it("prepareRecompute + writeCellMaskWeights matches recompute for combined text+morph (3b.1)", () => {
    const cells = [new PixelCell(5, 5, "#333333", 8, 1)];
    const runtimeA = createPixelGridRuntimeState(cells.length);
    const runtimeB = createPixelGridRuntimeState(cells.length);

    const maskState = {
      imageMask: null,
      textMask: { getInfluence: () => 0.4 } as any,
      morphMask: { getInfluence: () => 0.7 } as any,
      update: () => {},
      play: () => {},
      pause: () => {},
      reset: () => {},
      isPlaying: () => false,
      getCurrentStepIndex: () => 0
    };

    const sharedParams = {
      cells,
      hoverEffects: { mode: "reactive", interactionScope: "all" } as any,
      rippleEffects: { enabled: true } as any,
      breathing: { enabled: true, affectImage: true, affectText: true } as any,
      influenceOptions: { hover: true, ripple: true }
    };

    const coordinatorA = createMaskWeightCacheCoordinator({ ...sharedParams, runtime: runtimeA, maskState });
    coordinatorA.recompute();

    const coordinatorB = createMaskWeightCacheCoordinator({ ...sharedParams, runtime: runtimeB, maskState });
    expect(coordinatorB.prepareRecompute()).toBe(true);
    coordinatorB.writeCellMaskWeights(cells[0], 0);

    // textOrMorph = max(text, morph) = max(0.4, 0.7) = 0.7
    expect(runtimeA.textMaskWeightCache[0]).toBeCloseTo(0.7, 5);
    expect(runtimeB.textMaskWeightCache[0]).toBeCloseTo(0.7, 5);
    expect(runtimeB.activeMaskWeightCache[0]).toBeCloseTo(runtimeA.activeMaskWeightCache[0], 5);
  });

  it("prepareRecompute returns false and never mutates caches when shouldRecompute is false (3b.1)", () => {
    const cells = [new PixelCell(0, 0, "#444444", 8, 1)];
    const runtime = createPixelGridRuntimeState(cells.length);

    const coordinator = createMaskWeightCacheCoordinator({
      cells,
      runtime,
      maskState: {
        imageMask: { getInfluence: () => 0.9 } as any,
        textMask: null,
        morphMask: null,
        update: () => {},
        play: () => {},
        pause: () => {},
        reset: () => {},
        isPlaying: () => false,
        getCurrentStepIndex: () => 0
      },
      // interactionScope "all" + breathing disabled -> shouldRecompute() returns false
      // (no consumer of the mask weight cache this frame).
      hoverEffects: { mode: "reactive", interactionScope: "all" } as any,
      rippleEffects: { enabled: true } as any,
      breathing: { enabled: false, affectImage: false, affectText: false } as any,
      influenceOptions: { hover: true, ripple: true }
    });

    expect(coordinator.prepareRecompute()).toBe(false);
    expect(runtime.imageMaskWeightCache[0]).toBe(0);
    expect(runtime.activeMaskWeightCache[0]).toBe(0);
  });
});
