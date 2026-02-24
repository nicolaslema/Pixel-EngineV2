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

describe("PixelEngine scheduler integration", () => {
  it("runs scheduler phases around engine update/render flow", () => {
    const canvas = document.createElement("canvas");
    const renderer = makeMockRenderer();
    const engine = new PixelEngine({
      canvas,
      width: 300,
      height: 200,
      rendererFactory: () => renderer
    });
    const scheduler = engine.getScheduler();
    const calls: string[] = [];

    scheduler.add("preUpdate", () => calls.push("preUpdate"), {
      phase: "preUpdate"
    });
    scheduler.add("update", () => calls.push("update"), {
      phase: "update"
    });
    scheduler.add("postUpdate", () => calls.push("postUpdate"), {
      phase: "postUpdate"
    });
    scheduler.add("preRender", () => calls.push("preRender"), {
      phase: "preRender"
    });
    scheduler.add("render", () => calls.push("render"), {
      phase: "render"
    });
    scheduler.add("postRender", () => calls.push("postRender"), {
      phase: "postRender"
    });

    (engine as any).update(16);
    (engine as any).render(0.5);

    expect(calls).toEqual([
      "preUpdate",
      "update",
      "postUpdate",
      "preRender",
      "render",
      "postRender"
    ]);
  });
});
