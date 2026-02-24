import { PixelCell } from "../../../PixelCell";
import { ResolvedPaletteCycleEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

export class PaletteCycleEffect implements PixelGridPostEffect {
  readonly id = "palette-cycle";
  readonly order = 20;

  private phase = 0;
  private readonly baseIndices: Uint32Array;
  private readonly palette: readonly string[];

  constructor(
    private readonly options: ResolvedPaletteCycleEffectOptions,
    cells: PixelCell[]
  ) {
    this.palette = options.palette;
    this.baseIndices = new Uint32Array(cells.length);

    const paletteIndexByColor = new Map<string, number>();
    for (let i = 0; i < this.palette.length; i++) {
      if (!paletteIndexByColor.has(this.palette[i])) {
        paletteIndexByColor.set(this.palette[i], i);
      }
    }

    for (let i = 0; i < cells.length; i++) {
      const baseColorIndex = paletteIndexByColor.get(cells[i].baseColor);
      this.baseIndices[i] = baseColorIndex ?? (i % Math.max(1, this.palette.length));
    }
  }

  update(delta: number): void {
    this.phase += delta * 0.001 * this.options.speed;
  }

  apply(cells: PixelCell[]): void {
    if (this.palette.length < 2) return;

    const threshold = this.options.activationThreshold;
    const shift = Math.floor(this.phase * this.palette.length) % this.palette.length;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (this.options.scope === "activeOnly" && cell.targetSize <= threshold) {
        continue;
      }

      const colorIndex = (this.baseIndices[i] + shift) % this.palette.length;
      cell.color = this.palette[colorIndex];
    }
  }
}

