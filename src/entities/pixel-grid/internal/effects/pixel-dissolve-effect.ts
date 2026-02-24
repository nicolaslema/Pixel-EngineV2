import { PixelCell } from "../../../PixelCell";
import { ResolvedPixelDissolveEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

export class PixelDissolveEffect implements PixelGridPostEffect {
  readonly id = "pixel-dissolve";
  readonly order = 10;

  private phase = 0;

  constructor(
    private readonly options: ResolvedPixelDissolveEffectOptions
  ) {}

  update(delta: number): void {
    this.phase += delta * 0.001 * this.options.speed;
  }

  apply(cells: PixelCell[]): void {
    const amount = this.options.amount;
    if (amount <= 0) return;

    const threshold = this.options.activationThreshold;
    const scope = this.options.scope;
    const time = this.phase;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const isActive = cell.targetSize > threshold;
      if (scope === "activeOnly" && !isActive) {
        continue;
      }

      const noise = hash(i, time);
      if (noise >= amount) continue;

      cell.targetSize *= 0.15;
      cell.opacity *= 0.25;
    }
  }
}

function hash(index: number, time: number): number {
  const value = Math.sin((index + 1) * 12.9898 + time * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

