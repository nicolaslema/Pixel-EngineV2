import { beforeEach, describe, expect, it, vi } from "vitest";
import { PixelEngine } from "../../../core/PixelEngine";
import { resolvePixelGridConfig } from "../normalizeConfig";
import { createPixelGridRuntimeController } from "./runtime-controller";
import { PixelGridConfig } from "../types";

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
});
