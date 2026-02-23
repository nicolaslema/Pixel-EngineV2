import { describe, it, expect, vi } from "vitest";
import { Scene } from "./Scene";
import { Entity } from "./Entity";
import { IRenderer } from "../renderers/IRenderer";

class TestEntity extends Entity {
  update = vi.fn();
  render = vi.fn();
}

describe("Scene", () => {
  it("should update entities", () => {
    const scene = new Scene();
    const entity = new TestEntity();

    scene.add(entity);
    scene.update(16);

    expect(entity.update).toHaveBeenCalled();
  });

  it("should render entities", () => {
    const scene = new Scene();
    const entity = new TestEntity();

    const renderer = {} as IRenderer;

    scene.add(entity);
    scene.render(renderer, 0.5);

    expect(entity.render).toHaveBeenCalledWith(renderer, 0.5);
  });

  it("should remove entities", () => {
    const scene = new Scene();
    const entity = new TestEntity();

    scene.add(entity);
    scene.remove(entity);

    expect(scene.getEntities().length).toBe(0);
  });
});
