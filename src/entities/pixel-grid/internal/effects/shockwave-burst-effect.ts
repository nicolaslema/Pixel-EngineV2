import { PixelCell } from "../../../PixelCell";
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
    cells: PixelCell[],
    private readonly pointer: { x: number; y: number; inside: boolean; down: boolean }
  ) {
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].x > maxX) maxX = cells[i].x;
      if (cells[i].y > maxY) maxY = cells[i].y;
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

  apply(cells: PixelCell[]): void {
    if (this.bursts.length === 0) return;

    const thickness = this.options.thickness;
    const threshold = this.options.activationThreshold;
    const strength = this.options.strength;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.targetSize <= threshold) continue;

      let wavePeak = 0;
      for (let b = 0; b < this.bursts.length; b++) {
        const burst = this.bursts[b];
        const dx = cell.x - burst.x;
        const dy = cell.y - burst.y;
        const distance = Math.hypot(dx, dy);
        const diff = Math.abs(distance - burst.radius);
        if (diff > thickness) continue;
        const wave = 1 - diff / thickness;
        if (wave > wavePeak) wavePeak = wave;
      }

      if (wavePeak <= 0) continue;
      const boosted = cell.targetSize + cell.maxSize * strength * wavePeak;
      cell.targetSize = Math.min(cell.maxSize, boosted);
      const opacityBoost = 0.45 + wavePeak * 0.55;
      if (opacityBoost > cell.opacity) {
        cell.opacity = opacityBoost;
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

