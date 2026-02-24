import { describe, expect, it, vi } from "vitest";
import { PixelEngine } from "./PixelEngine";
import { IRenderer } from "../renderers/IRenderer";

function makeMockRenderer(): IRenderer {
  return {
    clear: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
    getContext: () =>
      ({
        save: () => {},
        restore: () => {},
        setTransform: () => {}
      } as unknown as CanvasRenderingContext2D)
  };
}

describe("PixelEngine runtime tuning", () => {
  it("applies loop defaults based on quality profile", () => {
    const canvas = document.createElement("canvas");
    const renderer = makeMockRenderer();
    const low = new PixelEngine({
      canvas,
      width: 300,
      height: 200,
      quality: "low",
      rendererFactory: () => renderer
    });

    expect(low.getQuality()).toBe("low");
    expect(low.getLoopTuning()).toEqual({
      fixedTimeStep: 1000 / 45,
      maxDelta: 200,
      maxUpdatesPerFrame: 120
    });

    low.destroy();
  });

  it("allows explicit loop tuning overrides", () => {
    const canvas = document.createElement("canvas");
    const renderer = makeMockRenderer();
    const engine = new PixelEngine({
      canvas,
      width: 320,
      height: 180,
      quality: "high",
      loop: {
        fixedTimeStep: 12,
        maxDelta: 180,
        maxUpdatesPerFrame: 64
      },
      rendererFactory: () => renderer
    });

    expect(engine.getQuality()).toBe("high");
    expect(engine.getLoopTuning()).toEqual({
      fixedTimeStep: 12,
      maxDelta: 180,
      maxUpdatesPerFrame: 64
    });

    engine.destroy();
  });
});
