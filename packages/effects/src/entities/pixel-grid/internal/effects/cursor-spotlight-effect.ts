import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedCursorSpotlightEffectOptions } from "../../types";
import { smoothstep } from "../../../../utils/math";
import { PixelGridPostEffect } from "./types";

export class CursorSpotlightEffect implements PixelGridPostEffect {
  readonly id = "cursor-spotlight";
  // Runs last: dims final opacity regardless of what any earlier post-effect (e.g.
  // ShockwaveBurstEffect's opacity boost) already wrote this frame.
  readonly order = 50;

  constructor(
    private readonly options: ResolvedCursorSpotlightEffectOptions,
    private readonly pointer: { x: number; y: number; inside: boolean; down: boolean }
  ) {}

  update(): void {}

  apply(buffer: PixelCellBuffer): void {
    if (!this.pointer.inside) return;

    const { radius, falloff, minOpacity } = this.options;
    const outer = radius + falloff;

    for (let i = 0; i < buffer.count; i++) {
      const dx = buffer.x[i] - this.pointer.x;
      const dy = buffer.y[i] - this.pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= radius) continue;

      const t = falloff > 0 ? smoothstep(radius, outer, dist) : 1;
      buffer.opacity[i] *= 1 - t * (1 - minOpacity);
    }
  }
}
