import { describe, it, expect, vi } from "vitest";
import { Scene } from "./Scene";
import { Entity } from "./Entity";
import { IRenderer } from "../renderers/IRenderer";

class TestEntity extends Entity {
  onAdd = vi.fn();
  onRemove = vi.fn();
  onDestroy = vi.fn();
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
    expect(entity.onAdd).toHaveBeenCalledTimes(1);
    expect(entity.onRemove).toHaveBeenCalledTimes(1);
  });

  it("should ignore duplicate add and fire add hook once", () => {
    const scene = new Scene();
    const entity = new TestEntity();

    scene.add(entity);
    scene.add(entity);

    expect(scene.getEntities().length).toBe(1);
    expect(entity.onAdd).toHaveBeenCalledTimes(1);
  });

  it("should destroy all entities with lifecycle hooks", () => {
    const scene = new Scene();
    const a = new TestEntity();
    const b = new TestEntity();

    scene.add(a);
    scene.add(b);
    scene.destroy();

    expect(scene.getEntities().length).toBe(0);
    expect(a.onRemove).toHaveBeenCalledTimes(1);
    expect(a.onDestroy).toHaveBeenCalledTimes(1);
    expect(b.onRemove).toHaveBeenCalledTimes(1);
    expect(b.onDestroy).toHaveBeenCalledTimes(1);
  });
});
