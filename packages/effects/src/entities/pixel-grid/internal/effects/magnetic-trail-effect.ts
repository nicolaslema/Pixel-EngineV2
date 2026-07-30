import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedMagneticTrailEffectOptions } from "../../types";
import { computeHoverFalloff } from "../../../../influences/HoverShape";
import { PixelGridPostEffect } from "./types";

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export class MagneticTrailEffect implements PixelGridPostEffect {
  readonly id = "magnetic-trail";
  // Next to waveWobble (35): both pure offset/motion effects.
  readonly order = 37;

  private readonly points: TrailPoint[] = [];
  private sinceLastSample = 0;

  constructor(
    private readonly options: ResolvedMagneticTrailEffectOptions,
    private readonly pointer: { x: number; y: number; inside: boolean; down: boolean }
  ) {}

  update(delta: number): void {
    this.sinceLastSample += delta;
    if (this.pointer.inside && this.sinceLastSample >= this.options.sampleIntervalMs) {
      this.sinceLastSample = 0;
      if (this.points.length >= this.options.maxPoints) this.points.shift();
      this.points.push({ x: this.pointer.x, y: this.pointer.y, age: 0 });
    }

    let write = 0;
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      point.age += delta;
      if (point.age <= this.options.lifetimeMs) this.points[write++] = point;
    }
    this.points.length = write;
  }

  apply(buffer: PixelCellBuffer): void {
    if (this.points.length === 0) return;

    const { radius, strength, lifetimeMs, scope, activationThreshold } = this.options;

    for (let i = 0; i < buffer.count; i++) {
      if (scope === "activeOnly" && buffer.targetSize[i] <= activationThreshold) continue;

      let pullX = 0;
      let pullY = 0;
      let peakOpacity = 0;

      for (let p = 0; p < this.points.length; p++) {
        const point = this.points[p];
        const dx = point.x - buffer.x[i];
        const dy = point.y - buffer.y[i];
        const falloff = computeHoverFalloff(dx, dy, { radiusX: radius, radiusY: radius });
        if (falloff <= 0) continue;

        const decay = 1 - point.age / lifetimeMs;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = strength * falloff * decay;
        pullX += (dx / len) * pull;
        pullY += (dy / len) * pull;

        const opacityHere = falloff * decay;
        if (opacityHere > peakOpacity) peakOpacity = opacityHere;
      }

      if (pullX === 0 && pullY === 0) continue;

      buffer.offsetX[i] += pullX;
      buffer.offsetY[i] += pullY;
      const opacityBoost = 0.4 + peakOpacity * 0.6;
      if (opacityBoost > buffer.opacity[i]) buffer.opacity[i] = opacityBoost;
    }
  }
}
