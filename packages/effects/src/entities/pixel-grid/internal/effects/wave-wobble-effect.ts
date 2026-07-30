import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedWaveWobbleEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

export class WaveWobbleEffect implements PixelGridPostEffect {
  readonly id = "wave-wobble";
  // Pure offsetX/offsetY effect; placed after the 3 pre-existing effects (10/20/30) purely to
  // avoid touching their established order values -- no real field/read-after-write
  // dependency with any of them.
  readonly order = 35;

  private time = 0;

  constructor(private readonly options: ResolvedWaveWobbleEffectOptions) {}

  update(delta: number): void {
    this.time += delta * 0.001 * this.options.speed;
  }

  apply(buffer: PixelCellBuffer): void {
    const { amplitude, frequency, direction, scope, activationThreshold } = this.options;
    if (amplitude === 0) return;

    const affectX = direction !== "vertical";
    const affectY = direction !== "horizontal";

    for (let i = 0; i < buffer.count; i++) {
      if (scope === "activeOnly" && buffer.targetSize[i] <= activationThreshold) continue;

      const phase = buffer.x[i] * frequency + buffer.y[i] * frequency * 0.6 + this.time;
      if (affectX) buffer.offsetX[i] += Math.sin(phase) * amplitude;
      if (affectY) buffer.offsetY[i] += Math.cos(phase * 0.85) * amplitude;
    }
  }
}
