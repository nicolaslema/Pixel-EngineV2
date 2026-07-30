import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedGlitchRgbSplitEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

interface GlitchBurst {
  x: number;
  y: number;
  age: number;
}

export class GlitchRgbSplitEffect implements PixelGridPostEffect {
  readonly id = "glitch-rgb-split";
  // Next to chromaticBreathing (40): both color-writing, glitch should interrupt/read the
  // calmer cycle rather than the other way around.
  readonly order = 42;

  private readonly bursts: GlitchBurst[] = [];
  private prevDown = false;
  private prevInside = false;

  constructor(
    private readonly options: ResolvedGlitchRgbSplitEffectOptions,
    private readonly pointer: { x: number; y: number; inside: boolean; down: boolean }
  ) {}

  update(delta: number): void {
    const shouldTriggerOnDown =
      this.options.triggerMode === "pointerDown" || this.options.triggerMode === "both";
    const shouldTriggerOnEnter =
      this.options.triggerMode === "hoverEnter" || this.options.triggerMode === "both";

    if (this.pointer.inside && shouldTriggerOnDown && this.pointer.down && !this.prevDown) {
      this.spawn();
    }
    if (this.pointer.inside && shouldTriggerOnEnter && !this.prevInside) {
      this.spawn();
    }

    this.prevDown = this.pointer.down;
    this.prevInside = this.pointer.inside;

    let write = 0;
    for (let i = 0; i < this.bursts.length; i++) {
      const burst = this.bursts[i];
      burst.age += delta;
      if (burst.age <= this.options.durationMs) this.bursts[write++] = burst;
    }
    this.bursts.length = write;
  }

  apply(buffer: PixelCellBuffer): void {
    if (this.bursts.length === 0 || buffer.count === 0) return;

    const { radius, jitterAmount, durationMs, scope, activationThreshold } = this.options;

    for (let i = 0; i < buffer.count; i++) {
      if (scope === "activeOnly" && buffer.targetSize[i] <= activationThreshold) continue;

      let strongest = 0;
      let sourceAge = 0;
      for (let b = 0; b < this.bursts.length; b++) {
        const burst = this.bursts[b];
        const dx = buffer.x[i] - burst.x;
        const dy = buffer.y[i] - burst.y;
        if (Math.hypot(dx, dy) > radius) continue;
        const t = 1 - burst.age / durationMs;
        if (t > strongest) {
          strongest = t;
          sourceAge = burst.age;
        }
      }
      if (strongest <= 0) continue;

      const jitter = (hash(i, sourceAge) - 0.5) * 2 * jitterAmount * strongest;
      buffer.offsetX[i] += jitter;
      const swapOffset = 1 + Math.floor(hash(i, sourceAge + 1) * 7);
      buffer.color[i] = buffer.baseColor[(i + swapOffset) % buffer.count];
    }
  }

  private spawn(): void {
    if (this.bursts.length >= this.options.maxBursts) this.bursts.shift();
    this.bursts.push({ x: this.pointer.x, y: this.pointer.y, age: 0 });
  }
}

function hash(index: number, time: number): number {
  const value = Math.sin((index + 1) * 12.9898 + time * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
