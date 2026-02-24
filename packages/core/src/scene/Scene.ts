import { Entity } from "./Entity";
import { IRenderer } from "../renderers/IRenderer";

export class Scene {
  private entities: Entity[] = [];

  add(entity: Entity): void {
    if (this.entities.includes(entity)) return;
    this.entities.push(entity);
    this.sort();
    entity.onAdd();
  }

  remove(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index === -1) return;
    this.entities.splice(index, 1);
    entity.onRemove();
  }

  private sort(): void {
    this.entities.sort((a, b) => a.zIndex - b.zIndex);
  }

  update(deltaTime: number): void {
    for (const entity of this.entities) {
      if (entity.active) {
        entity.update(deltaTime);
      }
    }
  }

  render(renderer: IRenderer, alpha = 1): void {
    for (const entity of this.entities) {
      if (entity.active) {
        entity.render(renderer, alpha);
      }
    }
  }

  getEntities(): readonly Entity[] {
    return this.entities;
  }

  destroy(): void {
    for (const entity of this.entities) {
      entity.onRemove();
      entity.onDestroy();
    }
    this.entities = [];
  }
}
