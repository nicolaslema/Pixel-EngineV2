import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedConstellationConnectEffectOptions } from "../../types";
import { clamp } from "../../../../utils/math";
import { PixelGridPostEffect } from "./types";

export class ConstellationConnectEffect implements PixelGridPostEffect {
  readonly id = "constellation-connect";
  // Right before cursorSpotlight (50): its final dim still applies over this effect's
  // opacity boost.
  readonly order = 48;

  private readonly candidateIndices: number[] = [];

  constructor(
    private readonly options: ResolvedConstellationConnectEffectOptions,
    private readonly pointer: { x: number; y: number; inside: boolean; down: boolean }
  ) {}

  update(): void {}

  apply(buffer: PixelCellBuffer): void {
    if (!this.pointer.inside) return;

    const { radius, linkDistance, maxCandidates, strength, activationThreshold } = this.options;

    this.candidateIndices.length = 0;
    for (let i = 0; i < buffer.count && this.candidateIndices.length < maxCandidates; i++) {
      if (buffer.targetSize[i] <= activationThreshold) continue;
      const dx = buffer.x[i] - this.pointer.x;
      const dy = buffer.y[i] - this.pointer.y;
      if (dx * dx + dy * dy <= radius * radius) this.candidateIndices.push(i);
    }

    const count = this.candidateIndices.length;
    if (count < 2) return;

    for (let a = 0; a < count; a++) {
      const indexA = this.candidateIndices[a];
      let linkScore = 0;

      for (let b = 0; b < count; b++) {
        if (a === b) continue;
        const indexB = this.candidateIndices[b];
        const dx = buffer.x[indexA] - buffer.x[indexB];
        const dy = buffer.y[indexA] - buffer.y[indexB];
        const dist = Math.hypot(dx, dy);
        if (dist <= linkDistance) linkScore += 1 - dist / linkDistance;
      }

      const t = clamp(linkScore / 4, 0, 1) * strength;
      const opacityBoost = 0.5 + 0.5 * t;
      if (opacityBoost > buffer.opacity[indexA]) buffer.opacity[indexA] = opacityBoost;
    }
  }
}
