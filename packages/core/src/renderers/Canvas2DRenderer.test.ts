import { beforeEach, describe, expect, it, vi } from "vitest";
import { Canvas2DRenderer } from "./Canvas2DRenderer";

describe("Canvas2DRenderer.clear", () => {
  const fillRect = vi.fn();
  const clearRect = vi.fn();

  beforeEach(() => {
    fillRect.mockReset();
    clearRect.mockReset();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "black",
      fillRect,
      clearRect,
      setTransform: () => {},
      scale: () => {}
    } as unknown as CanvasRenderingContext2D);
  });

  it("fills with a solid color by default", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 120;
    const renderer = new Canvas2DRenderer(canvas);

    renderer.clear();

    expect(fillRect).toHaveBeenCalledWith(0, 0, 200, 120);
    expect(clearRect).not.toHaveBeenCalled();
  });

  it("uses clearRect for transparent", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 120;
    const renderer = new Canvas2DRenderer(canvas);

    renderer.clear("transparent");

    expect(clearRect).toHaveBeenCalledWith(0, 0, 200, 120);
    expect(fillRect).not.toHaveBeenCalled();
  });

  it("uses clearRect for null", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 120;
    const renderer = new Canvas2DRenderer(canvas);

    renderer.clear(null);

    expect(clearRect).toHaveBeenCalledWith(0, 0, 200, 120);
    expect(fillRect).not.toHaveBeenCalled();
  });
});
