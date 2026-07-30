import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedScanLineRevealEffectOptions } from "../../types";
import { smoothstep } from "../../../../utils/math";
import { PixelGridPostEffect } from "./types";

export class ScanLineRevealEffect implements PixelGridPostEffect {
  readonly id = "scan-line-reveal";
  // Before shockwaveBurst/paletteCycle: this decides which cells are structurally "on", like
  // dissolve -- downstream activeOnly gates should see the reveal.
  readonly order = 12;

  private position: number;
  private readonly minCoord: number;
  private readonly maxCoord: number;

  constructor(
    private readonly options: ResolvedScanLineRevealEffectOptions,
    buffer: PixelCellBuffer
  ) {
    const coords = options.direction === "horizontal" ? buffer.x : buffer.y;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < buffer.count; i++) {
      if (coords[i] < min) min = coords[i];
      if (coords[i] > max) max = coords[i];
    }
    this.minCoord = Number.isFinite(min) ? min : 0;
    this.maxCoord = Number.isFinite(max) ? max : 0;
    this.position = this.minCoord - options.bandWidth;
  }

  update(delta: number): void {
    this.position += delta * 0.001 * this.options.speed;
    const end = this.maxCoord + this.options.bandWidth;
    if (this.position > end) {
      this.position = this.options.loop ? this.minCoord - this.options.bandWidth : end;
    }
  }

  apply(buffer: PixelCellBuffer): void {
    const { direction, bandWidth } = this.options;
    const coords = direction === "horizontal" ? buffer.x : buffer.y;

    for (let i = 0; i < buffer.count; i++) {
      const behind = this.position - coords[i];
      if (behind <= 0) continue;

      const t = behind >= bandWidth ? 1 : smoothstep(0, bandWidth, behind);
      const revealed = buffer.maxSize * t;
      if (revealed > buffer.targetSize[i]) buffer.targetSize[i] = revealed;
    }
  }
}
