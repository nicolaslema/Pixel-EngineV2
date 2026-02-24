import { IRenderer } from "../renderers/IRenderer";
import { Transform } from "./Transform";

let ENTITY_ID = 0;

export abstract class Entity {
  readonly id: number;
  readonly transform: Transform;

  zIndex = 0;
  active = true;

  constructor() {
    this.id = ENTITY_ID++;
    this.transform = new Transform();
  }

  onAdd(): void {}

  onRemove(): void {}

  onDestroy(): void {}

  update(_deltaTime: number): void {}

  render(_renderer: IRenderer, _alpha = 1): void {}
}
