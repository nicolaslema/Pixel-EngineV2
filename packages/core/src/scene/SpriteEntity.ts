import { Entity } from "../scene/Entity";
import { IRenderer } from "../renderers/IRenderer";

export class SpriteEntity extends Entity {
  width: number;
  height: number;
  color: string;

  constructor(width: number, height: number, color = "white") {
    super();
    this.width = width;
    this.height = height;
    this.color = color;
  }

  render(renderer: IRenderer, _alpha = 1): void {
    const ctx = renderer.getContext();

    ctx.save();
    ctx.translate(this.transform.x, this.transform.y);
    ctx.rotate(this.transform.rotation);
    ctx.scale(this.transform.scaleX, this.transform.scaleY);

    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }
}
