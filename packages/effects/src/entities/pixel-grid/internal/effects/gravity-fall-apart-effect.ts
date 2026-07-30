import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedGravityFallApartEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

export class GravityFallApartEffect implements PixelGridPostEffect {
  readonly id = "gravity-fall-apart";
  // Late: needs to see the final targetSize decision from every upstream system to correctly
  // detect "just deactivated".
  readonly order = 45;

  private delta = 0;
  private readonly prevTargetSize: Float32Array;
  private readonly fallElapsed: Float32Array; // -1 = not falling
  private readonly fallVelocity: Float32Array;
  private readonly fallDistance: Float32Array;
  private readonly fallStartSize: Float32Array;

  constructor(
    private readonly options: ResolvedGravityFallApartEffectOptions,
    buffer: PixelCellBuffer
  ) {
    this.prevTargetSize = new Float32Array(buffer.count);
    this.fallElapsed = new Float32Array(buffer.count).fill(-1);
    this.fallVelocity = new Float32Array(buffer.count);
    this.fallDistance = new Float32Array(buffer.count);
    this.fallStartSize = new Float32Array(buffer.count);
  }

  update(delta: number): void {
    this.delta = delta;
  }

  apply(buffer: PixelCellBuffer): void {
    const { gravity, fallDurationMs, activationThreshold } = this.options;

    for (let i = 0; i < buffer.count; i++) {
      const currentTargetSize = buffer.targetSize[i];

      if (this.fallElapsed[i] < 0) {
        if (
          this.prevTargetSize[i] > activationThreshold &&
          currentTargetSize <= activationThreshold
        ) {
          this.fallElapsed[i] = 0;
          this.fallVelocity[i] = 0;
          this.fallDistance[i] = 0;
          this.fallStartSize[i] = this.prevTargetSize[i];
        }
      }

      if (this.fallElapsed[i] >= 0) {
        this.fallElapsed[i] += this.delta;
        if (this.fallElapsed[i] >= fallDurationMs) {
          this.fallElapsed[i] = -1;
        } else {
          this.fallVelocity[i] += gravity * this.delta;
          this.fallDistance[i] += this.fallVelocity[i] * this.delta;
          const progress = this.fallElapsed[i] / fallDurationMs;
          const sizeRemaining = this.fallStartSize[i] * (1 - progress);
          if (sizeRemaining > buffer.targetSize[i]) buffer.targetSize[i] = sizeRemaining;
          buffer.offsetY[i] += this.fallDistance[i];
          buffer.opacity[i] *= 1 - progress;
        }
      }

      this.prevTargetSize[i] = currentTargetSize;
    }
  }
}
