import { Influence, BlendMode } from "./Influence";
import { type EnginePointerSource } from "@pixel-engine/core";
import { computeHoverFalloff } from "./HoverShape";

export class HoverInfluence implements Influence {
  priority = 5;
  blendMode: BlendMode = "add";

  constructor(
    private engine: EnginePointerSource,
    private radius: number,
    private breathSpeed: number,
    private strength: number
  ) {}

  update(_delta = 0): void {
    void _delta;
    void this.breathSpeed;
  }

  isAlive(): boolean {
    return true;
  }

  getBounds() {
    const { x, y } = this.engine.mouse;

    return {
      minX: x - this.radius,
      maxX: x + this.radius,
      minY: y - this.radius,
      maxY: y + this.radius
    };
  }

  getInfluence(
    x: number,
    y: number,
    maxSize: number
  ): number {
    const { x: mx, y: my } = this.engine.mouse;

    const dx = x - mx;
    const dy = y - my;

    const falloff = computeHoverFalloff(dx, dy, {
      radiusX: this.radius,
      radiusY: this.radius
    });

    if (falloff <= 0) return 0;

    return falloff * maxSize * this.strength;
  }
}
