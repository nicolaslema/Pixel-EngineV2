import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedPaletteCycleEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

export class PaletteCycleEffect implements PixelGridPostEffect {
  readonly id = "palette-cycle";
  // Runs last: its activeOnly scope gate reads targetSize, which by this point reflects
  // both PixelDissolveEffect's (order 10) and ShockwaveBurstEffect's (order 20) mutations --
  // e.g. a cell revealed by a passing shockwave becomes eligible for palette-cycling in the
  // same frame. Was an accidental tie with ShockwaveBurstEffect (both order 20, broken only
  // by push order + Array.sort's stability) until this was made explicit.
  readonly order = 30;

  private phase = 0;
  private readonly baseIndices: Uint32Array;
  private readonly palette: readonly string[];

  constructor(
    private readonly options: ResolvedPaletteCycleEffectOptions,
    buffer: PixelCellBuffer
  ) {
    this.palette = options.palette;
    this.baseIndices = new Uint32Array(buffer.count);

    const paletteIndexByColor = new Map<string, number>();
    for (let i = 0; i < this.palette.length; i++) {
      if (!paletteIndexByColor.has(this.palette[i])) {
        paletteIndexByColor.set(this.palette[i], i);
      }
    }

    for (let i = 0; i < buffer.count; i++) {
      const baseColorIndex = paletteIndexByColor.get(buffer.baseColor[i]);
      this.baseIndices[i] = baseColorIndex ?? (i % Math.max(1, this.palette.length));
    }
  }

  update(delta: number): void {
    this.phase += delta * 0.001 * this.options.speed;
  }

  apply(buffer: PixelCellBuffer): void {
    if (this.palette.length < 2) return;

    const threshold = this.options.activationThreshold;
    const shift = Math.floor(this.phase * this.palette.length) % this.palette.length;
    for (let i = 0; i < buffer.count; i++) {
      if (this.options.scope === "activeOnly" && buffer.targetSize[i] <= threshold) {
        continue;
      }

      const colorIndex = (this.baseIndices[i] + shift) % this.palette.length;
      buffer.color[i] = this.palette[colorIndex];
    }
  }
}
