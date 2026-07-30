import { getBreathFactor, PixelCellBuffer } from "../cell-buffer";
import { ResolvedChromaticBreathingEffectOptions } from "../../types";
import { PixelGridPostEffect } from "./types";

export class ChromaticBreathingEffect implements PixelGridPostEffect {
  readonly id = "chromatic-breathing";
  // After paletteCycle (30): if both are enabled, this wins on `color` for the same cell in
  // the same frame (last-write-wins, documented in API.md).
  readonly order = 40;

  private elapsed = 0;
  private readonly palette: readonly string[];

  constructor(private readonly options: ResolvedChromaticBreathingEffectOptions) {
    this.palette = options.palette;
  }

  update(delta: number): void {
    this.elapsed += delta;
  }

  apply(buffer: PixelCellBuffer): void {
    if (this.palette.length < 2) return;

    const { speed, scope, activationThreshold } = this.options;

    for (let i = 0; i < buffer.count; i++) {
      if (scope === "activeOnly" && buffer.targetSize[i] <= activationThreshold) continue;

      const wave = getBreathFactor(buffer, i, this.elapsed, speed);
      const index = Math.min(this.palette.length - 1, Math.floor(wave * this.palette.length));
      buffer.color[i] = this.palette[index];
    }
  }
}
