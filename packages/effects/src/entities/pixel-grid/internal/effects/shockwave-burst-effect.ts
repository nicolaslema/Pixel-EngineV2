import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedShockwaveBurstEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

interface ShockwaveBurstInstance {
  x: number;
  y: number;
  radius: number;
}

export class ShockwaveBurstEffect implements PixelGridPostEffect {
  readonly id = "shockwave-burst";
  readonly order = 20;

  private readonly bursts: ShockwaveBurstInstance[] = [];
  private prevDown = false;
  private prevInside = false;
  private readonly maxRadius: number;

  constructor(
    private readonly options: ResolvedShockwaveBurstEffectOptions,
    buffer: PixelCellBuffer,
    private readonly pointer: { x: number; y: number; inside: boolean; down: boolean }
  ) {
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < buffer.count; i++) {
      if (buffer.x[i] > maxX) maxX = buffer.x[i];
      if (buffer.y[i] > maxY) maxY = buffer.y[i];
    }
    this.maxRadius = Math.hypot(maxX, maxY) + this.options.thickness * 2;
  }

  update(delta: number): void {
    const shouldTriggerOnDown =
      this.options.triggerMode === "pointerDown" || this.options.triggerMode === "both";
    const shouldTriggerOnEnter =
      this.options.triggerMode === "hoverEnter" || this.options.triggerMode === "both";

    if (this.pointer.inside && shouldTriggerOnDown && this.pointer.down && !this.prevDown) {
      this.spawn(this.pointer.x, this.pointer.y);
    }
    if (this.pointer.inside && shouldTriggerOnEnter && !this.prevInside) {
      this.spawn(this.pointer.x, this.pointer.y);
    }

    this.prevDown = this.pointer.down;
    this.prevInside = this.pointer.inside;

    const growth = delta * 0.001 * this.options.speed * 240;
    let write = 0;
    for (let i = 0; i < this.bursts.length; i++) {
      const burst = this.bursts[i];
      burst.radius += growth;
      if (burst.radius <= this.maxRadius) {
        this.bursts[write++] = burst;
      }
    }
    this.bursts.length = write;
  }

  apply(buffer: PixelCellBuffer): void {
    if (this.bursts.length === 0) return;

    const thickness = this.options.thickness;
    const threshold = this.options.activationThreshold;
    const strength = this.options.strength;
    const maxSize = buffer.maxSize;

    for (let i = 0; i < buffer.count; i++) {
      if (buffer.targetSize[i] <= threshold) continue;

      let wavePeak = 0;
      for (let b = 0; b < this.bursts.length; b++) {
        const burst = this.bursts[b];
        const dx = buffer.x[i] - burst.x;
        const dy = buffer.y[i] - burst.y;
        const distance = Math.hypot(dx, dy);
        const diff = Math.abs(distance - burst.radius);
        if (diff > thickness) continue;
        const wave = 1 - diff / thickness;
        if (wave > wavePeak) wavePeak = wave;
      }

      if (wavePeak <= 0) continue;
      const boosted = buffer.targetSize[i] + maxSize * strength * wavePeak;
      buffer.targetSize[i] = Math.min(maxSize, boosted);
      const opacityBoost = 0.45 + wavePeak * 0.55;
      if (opacityBoost > buffer.opacity[i]) {
        buffer.opacity[i] = opacityBoost;
      }
    }
  }

  private spawn(x: number, y: number): void {
    if (this.bursts.length >= this.options.maxBursts) {
      this.bursts.shift();
    }
    this.bursts.push({ x, y, radius: 0 });
  }
}
