import { describe, expect, it, vi } from "vitest";
import { PixelEngine } from "./PixelEngine";
import { IRenderer } from "../renderers/IRenderer";
import { Entity } from "../scene/Entity";

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

class LifecycleEntity extends Entity {
  onAdd = vi.fn();
  onRemove = vi.fn();
  onDestroy = vi.fn();
}

describe("PixelEngine entity lifecycle", () => {
  it("invokes entity lifecycle hooks on add/remove and engine destroy", () => {
    const canvas = document.createElement("canvas");
    const renderer = makeMockRenderer();
    const engine = new PixelEngine({
      canvas,
      width: 200,
      height: 120,
      rendererFactory: () => renderer
    });

    const entity = new LifecycleEntity();
    engine.addEntity(entity);
    expect(entity.onAdd).toHaveBeenCalledTimes(1);

    engine.removeEntity(entity);
    expect(entity.onRemove).toHaveBeenCalledTimes(1);
    expect(entity.onDestroy).toHaveBeenCalledTimes(0);

    engine.addEntity(entity);
    engine.destroy();

    expect(entity.onRemove).toHaveBeenCalledTimes(2);
    expect(entity.onDestroy).toHaveBeenCalledTimes(1);
  });
});
