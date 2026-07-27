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

describe("PixelEngine clearColor", () => {
  it("supports runtime clear color changes including transparent mode", () => {
    const canvas = document.createElement("canvas");
    const renderer = makeMockRenderer();

    const engine = new PixelEngine({
      canvas,
      width: 300,
      height: 200,
      rendererFactory: () => renderer
    });

    expect(engine.getClearColor()).toBe("black");

    engine.setClearColor("#ffffff");
    expect(engine.getClearColor()).toBe("#ffffff");
    (engine as any).render();
    expect(renderer.clear).toHaveBeenLastCalledWith("#ffffff");

    engine.setClearColor(null);
    expect(engine.getClearColor()).toBeNull();
    (engine as any).render();
    expect(renderer.clear).toHaveBeenLastCalledWith(null);
  });
});
