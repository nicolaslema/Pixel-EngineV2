import { beforeEach, describe, expect, it, vi } from "vitest";
import { PixelEngine } from "@pixel-engine/core";
import { resolvePixelGridConfig } from "../normalizeConfig";
import { createPixelGridRuntimeController } from "./runtime-controller";
import { PixelGridConfig } from "../types";
import * as updatePipeline from "./update-pipeline";

describe("createPixelGridRuntimeController", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        setTransform: () => {},
        scale: () => {},
        fillRect: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        clearRect: () => {},
        drawImage: () => {},
        fillText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        measureText: () => ({
          width: 64,
          actualBoundingBoxAscent: 24,
          actualBoundingBoxDescent: 8
        })
      } as unknown as CanvasRenderingContext2D);
  });

  it("runs update/render and keeps timeline controls available", () => {
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 220,
      height: 140
    });

    const config: PixelGridConfig = {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1,
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        steps: [
          {
            mask: "text",
            holdMs: 10,
            transition: {
              mode: "fade",
              durationMs: 10
            }
          },
          {
            mask: "image",
            holdMs: 10,
            transition: {
              mode: "dissolve",
              durationMs: 10
            }
          }
        ]
      }
    };

    const runtime = createPixelGridRuntimeController({
      engine,
      width: 220,
      height: 140,
      config,
      influenceOptions: {
        hover: true,
        ripple: true,
        organic: false
      },
      resolvedConfig: resolvePixelGridConfig(config)
    });

    expect(() => runtime.update(16)).not.toThrow();
    expect(() => runtime.render(engine.getRenderer(), 0.5)).not.toThrow();
    expect(() => runtime.triggerRipple(100, 70)).not.toThrow();

    runtime.playMaskTimeline();
    expect(runtime.getMaskTimelineState().playing).toBe(true);
    runtime.pauseMaskTimeline();
    expect(runtime.getMaskTimelineState().playing).toBe(false);
    runtime.resetMaskTimeline();
    expect(runtime.getMaskTimelineState().stepIndex).toBe(0);

    engine.destroy();
  });

  it("reuses the same pipeline params object and callbacks across frames instead of reallocating them (3a.3)", () => {
    // Capture params.delta at the moment of each call (before it's mutated by the next
    // update()) -- reading it back from spy.mock.calls afterwards wouldn't work, since the
    // params object is the *same reference* every call, so all recorded calls would show
    // whatever the latest mutation left it at, not what each call actually saw.
    const originalRun = updatePipeline.runPixelGridUpdatePipeline;
    const deltaSeenAtCall: number[] = [];
    const spy = vi
      .spyOn(updatePipeline, "runPixelGridUpdatePipeline")
      .mockImplementation((params) => {
        deltaSeenAtCall.push(params.delta);
        return originalRun(params);
      });

    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 200,
      height: 120
    });

    const config: PixelGridConfig = {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1
    };

    const runtime = createPixelGridRuntimeController({
      engine,
      width: 200,
      height: 120,
      config,
      influenceOptions: { hover: true, ripple: true, organic: false },
      resolvedConfig: resolvePixelGridConfig(config)
    });

    runtime.update(16);
    runtime.update(32);

    expect(spy).toHaveBeenCalledTimes(2);
    const [firstCallParams] = spy.mock.calls[0];
    const [secondCallParams] = spy.mock.calls[1];

    // Same object reference across frames -- proves the params object itself isn't
    // reallocated per update() call.
    expect(secondCallParams).toBe(firstCallParams);
    // Every callback field is the same function reference across frames -- proves the
    // closures aren't recreated per update() call either.
    expect(secondCallParams.shouldRecomputeMaskWeightCache).toBe(firstCallParams.shouldRecomputeMaskWeightCache);
    expect(secondCallParams.updateMaskWeightCache).toBe(firstCallParams.updateMaskWeightCache);
    expect(secondCallParams.applyHoverInteractions).toBe(firstCallParams.applyHoverInteractions);
    expect(secondCallParams.applyReactiveRippleEffects).toBe(firstCallParams.applyReactiveRippleEffects);
    expect(secondCallParams.applyBreathing).toBe(firstCallParams.applyBreathing);
    expect(secondCallParams.applyPostEffects).toBe(firstCallParams.applyPostEffects);
    // Each call saw the correct current-frame delta at the time it ran -- this is exactly
    // what applyPostEffects reads (via pipelineParams.delta) instead of a per-call `delta`
    // parameter, so this confirms it never sees a stale/frozen delta from an earlier frame.
    expect(deltaSeenAtCall).toEqual([16, 32]);

    spy.mockRestore();
    engine.destroy();
  });
});
