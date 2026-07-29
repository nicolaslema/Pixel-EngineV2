import { beforeEach, describe, expect, it, vi } from "vitest";
import { PixelEngine } from "@pixel-engine/core";
import { resolvePixelGridConfig } from "../normalizeConfig";
import { createPixelGridRuntimeController } from "./runtime-controller";
import { PixelGridConfig } from "../types";
import * as updatePipeline from "./update-pipeline";
import * as interactionCoordinator from "./interaction-coordinator";

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

  it("forwards onMaskError from a failing image mask (item 1.6)", async () => {
    class FailingImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", FailingImage);

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
      imageMasks: [{ id: "broken", src: "/does/not/exist.png" }]
    };

    const onMaskError = vi.fn();
    createPixelGridRuntimeController({
      engine,
      width: 220,
      height: 140,
      config,
      influenceOptions: {
        hover: true,
        ripple: true,
        organic: false
      },
      resolvedConfig: resolvePixelGridConfig(config),
      onMaskError
    });

    await Promise.resolve();

    expect(onMaskError).toHaveBeenCalledWith({
      maskId: "broken",
      src: "/does/not/exist.png",
      reason: "image failed to load"
    });

    vi.unstubAllGlobals();
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
    expect(secondCallParams.prepareMaskWeightRecompute).toBe(firstCallParams.prepareMaskWeightRecompute);
    expect(secondCallParams.writeCellMaskWeights).toBe(firstCallParams.writeCellMaskWeights);
    expect(secondCallParams.applyHoverBreathingAndRipple).toBe(firstCallParams.applyHoverBreathingAndRipple);
    expect(secondCallParams.applyPostEffects).toBe(firstCallParams.applyPostEffects);
    // Each call saw the correct current-frame delta at the time it ran -- this is exactly
    // what applyPostEffects reads (via pipelineParams.delta) instead of a per-call `delta`
    // parameter, so this confirms it never sees a stale/frozen delta from an earlier frame.
    expect(deltaSeenAtCall).toEqual([16, 32]);

    spy.mockRestore();
    engine.destroy();
  });

  it("fuses hover+breathing when idle, and falls back to the unfused sequence while ripples are active (3b.1)", () => {
    const fusedSpy = vi.spyOn(interactionCoordinator, "applyHoverAndBreathingPass");
    const unfusedHoverSpy = vi.spyOn(interactionCoordinator, "applyHoverInteractionsPass");

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
    expect(fusedSpy).toHaveBeenCalledTimes(1);
    expect(unfusedHoverSpy).not.toHaveBeenCalled();

    runtime.triggerRipple(100, 60);
    runtime.update(16);
    expect(unfusedHoverSpy).toHaveBeenCalledTimes(1);
    // No new fused call while the ripple is alive -- still just the one from the first frame.
    expect(fusedSpy).toHaveBeenCalledTimes(1);

    fusedSpy.mockRestore();
    unfusedHoverSpy.mockRestore();
    engine.destroy();
  });

  describe("cell-count guard (item 1.1)", () => {
    it("clamps the effective gap and reports a warning when the cap is exceeded", () => {
      const canvas = document.createElement("canvas");
      const engine = new PixelEngine({ canvas, width: 400, height: 300 });

      const config: PixelGridConfig = {
        colors: ["#334155", "#475569", "#64748b"],
        gap: 2,
        expandEase: 0.08,
        breathSpeed: 1
      };

      const resolvedConfig = resolvePixelGridConfig(config);
      // 400/2 * 300/2 = 30000 cells; inject a small test cap well below that.
      resolvedConfig.performance.maxCellsCap = 5_000;

      const runtime = createPixelGridRuntimeController({
        engine,
        width: 400,
        height: 300,
        config,
        influenceOptions: { hover: true, ripple: true, organic: false },
        resolvedConfig
      });

      const warnings = runtime.getWarnings();
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain("5000");
      expect(runtime.getCellBufferForDebug().count).toBeLessThanOrEqual(5_000);

      engine.destroy();
    });

    it("reports no warnings when the cell count is under the cap", () => {
      const canvas = document.createElement("canvas");
      const engine = new PixelEngine({ canvas, width: 200, height: 120 });

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

      expect(runtime.getWarnings()).toEqual([]);

      engine.destroy();
    });

    it("keeps the buffer's gap consistent with its actual cell count after a clamp", () => {
      const canvas = document.createElement("canvas");
      const engine = new PixelEngine({ canvas, width: 400, height: 300 });

      const config: PixelGridConfig = {
        colors: ["#334155", "#475569", "#64643b"],
        gap: 2,
        expandEase: 0.08,
        breathSpeed: 1
      };

      const resolvedConfig = resolvePixelGridConfig(config);
      resolvedConfig.performance.maxCellsCap = 5_000;

      const runtime = createPixelGridRuntimeController({
        engine,
        width: 400,
        height: 300,
        config,
        influenceOptions: { hover: true, ripple: true, organic: false },
        resolvedConfig
      });

      const buffer = runtime.getCellBufferForDebug();
      const expectedCount = Math.ceil(400 / buffer.gap) * Math.ceil(300 / buffer.gap);
      expect(buffer.count).toBe(expectedCount);
      expect(buffer.gap).toBeGreaterThan(2);

      engine.destroy();
    });
  });
});
