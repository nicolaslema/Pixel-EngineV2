import { beforeEach, describe, expect, it, vi } from "vitest";
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "./PixelGridEffect";

describe("PixelGridEffect", () => {
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

  it("should work without imageMask and textMask", () => {
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 200,
      height: 120
    });

    const effect = new PixelGridEffect(engine, 200, 120, {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1
    });

    expect(() => effect.update(16)).not.toThrow();
    expect(() => effect.render(engine.getRenderer())).not.toThrow();

    engine.destroy();
  });

  it("should apply canvasBackground from config and allow runtime update", () => {
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 200,
      height: 120,
      clearColor: "black"
    });

    const effect = new PixelGridEffect(engine, 200, 120, {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1,
      canvasBackground: "#112233"
    });

    expect(engine.getClearColor()).toBe("#112233");

    effect.setCanvasBackground(null);
    expect(engine.getClearColor()).toBeNull();

    engine.destroy();
  });

  it("should expose mask timeline playback controls", () => {
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 200,
      height: 120
    });

    const effect = new PixelGridEffect(engine, 200, 120, {
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
            holdMs: 30,
            transition: {
              mode: "fade",
              durationMs: 30
            }
          },
          {
            mask: "image",
            holdMs: 30,
            transition: {
              mode: "dissolve",
              durationMs: 30
            }
          }
        ]
      }
    });

    expect(effect.getMaskTimelineState().playing).toBe(false);
    expect(effect.getMaskTimelineState().stepIndex).toBe(0);

    effect.playMaskTimeline();
    expect(effect.getMaskTimelineState().playing).toBe(true);

    effect.pauseMaskTimeline();
    expect(effect.getMaskTimelineState().playing).toBe(false);

    effect.resetMaskTimeline();
    expect(effect.getMaskTimelineState().stepIndex).toBe(0);

    engine.destroy();
  });

  it("should keep running with invalid timeline refs using fallback masks", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 220,
      height: 140
    });

    const effect = new PixelGridEffect(engine, 220, 140, {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1,
      initialMask: "text",
      textMasks: [
        {
          id: "text-a",
          text: "A",
          centerX: 110,
          centerY: 70,
          font: "bold 48px Arial"
        }
      ],
      imageMasks: [
        {
          id: "image-a",
          src: "/fake/image.png",
          centerX: 110,
          centerY: 70,
          scale: 1.2,
          sampleMode: "threshold"
        }
      ],
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "text",
            assetId: "missing-text",
            holdMs: 12,
            transition: {
              mode: "fade",
              durationMs: 12,
              seed: 1
            }
          },
          {
            mask: "image",
            assetId: "image-a",
            holdMs: 12,
            transition: {
              mode: "dissolve",
              durationMs: 12,
              seed: 2
            }
          }
        ]
      }
    });

    expect(warnSpy).toHaveBeenCalled();
    for (let i = 0; i < 90; i++) {
      expect(() => effect.update(16)).not.toThrow();
      expect(() => effect.render(engine.getRenderer())).not.toThrow();
    }

    const state = effect.getMaskTimelineState();
    expect(state.stepIndex).toBeGreaterThanOrEqual(0);
    expect(state.stepIndex).toBeLessThanOrEqual(1);

    warnSpy.mockRestore();
    engine.destroy();
  });

  it("should resize runtime grid without remounting effect instance", () => {
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 220,
      height: 140
    });

    const effect = new PixelGridEffect(engine, 220, 140, {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1
    });

    expect(() => effect.resize(480, 260)).not.toThrow();
    expect(() => effect.update(16)).not.toThrow();
    expect(() => effect.render(engine.getRenderer())).not.toThrow();

    engine.destroy();
  });

  it("should sanitize an invalid gap/colors instead of producing a broken grid (direct construction safety net)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 200,
      height: 120
    });

    const effect = new PixelGridEffect(engine, 200, 120, {
      colors: [],
      gap: 0,
      expandEase: -1,
      breathSpeed: Number.NaN
    } as never);

    const snapshot = effect.getDebugSnapshot();
    expect(Number.isFinite(snapshot.totalCells)).toBe(true);
    expect(snapshot.totalCells).toBeGreaterThan(0);
    expect(() => effect.update(16)).not.toThrow();
    expect(() => effect.render(engine.getRenderer())).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    engine.destroy();
  });

  it("should expose runtime debug snapshot", () => {
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 220,
      height: 140
    });

    const effect = new PixelGridEffect(engine, 220, 140, {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 8,
      expandEase: 0.08,
      breathSpeed: 1
    });

    const snapshot = effect.getDebugSnapshot();
    expect(snapshot.totalCells).toBeGreaterThan(0);
    expect(snapshot.activeCells).toBeGreaterThanOrEqual(0);
    expect(snapshot.activeRipples).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.timeline.stepIndex).toBe("number");

    engine.destroy();
  });
});
