import { PixelCellBuffer } from "./cell-buffer";
import { RippleInfluence } from "../../../influences/RippleInfluence";
import { computeHoverFalloff } from "../../../influences/HoverShape";
import { ResolvedPixelGridConfig } from "../types";

interface ReactiveCellOptions {
  interaction: number;
  index: number;
  buffer: PixelCellBuffer;
  originX: number;
  originY: number;
  reactiveTime: number;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  tintPalette: string[];
  multipliers?: {
    deactivate: number;
    displace: number;
    jitter: number;
  };
}

// Reused across calls (instead of allocating a fresh object per cell per frame) whenever
// the caller doesn't pass explicit multipliers -- e.g. the reactive-hover path.
const DEFAULT_MULTIPLIERS = { deactivate: 1, displace: 1, jitter: 1 } as const;

// Reused across calls/ripples/rows/frames -- safe because JS is single-threaded and this
// is only touched synchronously within one applyReactiveRipple() call at a time (same
// reuse rationale as DEFAULT_MULTIPLIERS above, and as InfluenceManager's own
// rowRangeScratch field).
const rowRangeScratch = new Float64Array(4);

export function getHoverWeight(
  buffer: PixelCellBuffer,
  index: number,
  mouse: { x: number; y: number; inside: boolean },
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"]
): number {
  if (!mouse.inside) return 0;

  const dx = buffer.x[index] - mouse.x;
  const dy = buffer.y[index] - mouse.y;
  return computeHoverFalloff(dx, dy, {
    radiusX: hoverEffects.radius,
    radiusY: hoverEffects.radius
  });
}

export function applyMagneticHoverToCell(
  options: {
    buffer: PixelCellBuffer;
    index: number;
    originX: number;
    originY: number;
    hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  }
): void {
  const magnetic = options.hoverEffects.magnetic;
  if (!magnetic.enabled) return;

  const dx = options.originX - options.buffer.x[options.index];
  const dy = options.originY - options.buffer.y[options.index];
  const radius = magnetic.radius;
  const falloff = computeHoverFalloff(dx, dy, {
    radiusX: radius,
    radiusY: radius
  });
  if (falloff <= 0) return;

  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const direction = magnetic.mode === "attract" ? 1 : -1;
  const pull = magnetic.strength * falloff * direction;

  options.buffer.offsetX[options.index] += (dx / len) * pull;
  options.buffer.offsetY[options.index] += (dy / len) * pull;
}

export function shouldAffectCell(
  scope: ResolvedPixelGridConfig["hoverEffects"]["interactionScope"],
  targetSize: number,
  activeMaskWeight: number
): boolean {
  if (scope === "all") return true;
  if (scope === "activeOnly") return targetSize > 0.001;
  return activeMaskWeight > 0.05;
}

export function applyReactiveEffectsToCell(
  options: ReactiveCellOptions
): void {
  const strength = Math.max(0, options.interaction);
  if (strength <= 0) return;

  const multipliers = options.multipliers ?? DEFAULT_MULTIPLIERS;
  const deactivate = options.hoverEffects.deactivate * multipliers.deactivate;
  const displace = options.hoverEffects.displace * multipliers.displace;
  const jitter = options.hoverEffects.jitter * multipliers.jitter;

  const { buffer, index } = options;

  if (deactivate > 0) {
    buffer.targetSize[index] *= Math.max(0, 1 - deactivate * strength);
  }

  if (displace > 0) {
    const dx = buffer.x[index] - options.originX;
    const dy = buffer.y[index] - options.originY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    const noise =
      Math.sin((index + 1) * 12.9898 + options.reactiveTime * 0.01) * 0.5 + 0.5;

    const jitterTerm = (noise - 0.5) * 2 * jitter * strength;

    buffer.offsetX[index] += dirX * displace * strength + jitterTerm;
    buffer.offsetY[index] += dirY * displace * strength - jitterTerm;
  }

  if (options.tintPalette.length > 0) {
    const normalized = Math.max(0, Math.min(0.999, strength));
    const colorIndex = Math.floor(normalized * options.tintPalette.length);
    buffer.color[index] = options.tintPalette[colorIndex];
  }
}

export function applyReactiveRipple(
  params: {
    buffer: PixelCellBuffer;
    activeRipples: RippleInfluence[];
    gap: number;
    inverseGap: number;
    columns: number;
    rows: number;
    hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
    rippleEffects: ResolvedPixelGridConfig["rippleEffects"];
    activeMaskWeightCache: Float32Array;
    reactiveTime: number;
    getCellIndex: (x: number, y: number) => number;
  }
): void {
  if (!params.rippleEffects.enabled) return;
  if (params.activeRipples.length === 0) return;

  const palette = params.rippleEffects.tintPalette.length > 0
    ? params.rippleEffects.tintPalette
    : params.hoverEffects.tintPalette;

  for (let r = 0; r < params.activeRipples.length; r++) {
    const ripple = params.activeRipples[r];
    const bounds = ripple.getBounds();

    const minCol = Math.max(0, Math.floor(bounds.minX * params.inverseGap));
    const maxCol = Math.min(params.columns - 1, Math.floor(bounds.maxX * params.inverseGap));
    const minRow = Math.max(0, Math.floor(bounds.minY * params.inverseGap));
    const maxRow = Math.min(params.rows - 1, Math.floor(bounds.maxY * params.inverseGap));

    for (let row = minRow; row <= maxRow; row++) {
      const worldY = row * params.gap;
      const count = ripple.getRowRange(worldY, rowRangeScratch);

      for (let p = 0; p < count; p++) {
        const colStart = Math.max(minCol, Math.floor(rowRangeScratch[p * 2] * params.inverseGap));
        const colEnd = Math.min(maxCol, Math.floor(rowRangeScratch[p * 2 + 1] * params.inverseGap));

        for (let x = colStart; x <= colEnd; x++) {
          const index = params.getCellIndex(x, row);
          const { buffer } = params;

          if (!shouldAffectCell(params.hoverEffects.interactionScope, buffer.targetSize[index], params.activeMaskWeightCache[index])) {
            continue;
          }

          const factor = ripple.getRingFactorAt(buffer.x[index], buffer.y[index]);
          if (factor <= 0) continue;

          applyReactiveEffectsToCell({
            buffer,
            index,
            interaction: factor * params.hoverEffects.strength,
            originX: ripple.getOriginX(),
            originY: ripple.getOriginY(),
            reactiveTime: params.reactiveTime,
            hoverEffects: params.hoverEffects,
            tintPalette: palette,
            multipliers: {
              deactivate: params.rippleEffects.deactivateMultiplier,
              displace: params.rippleEffects.displaceMultiplier,
              jitter: params.rippleEffects.jitterMultiplier
            }
          });
        }
      }
    }
  }
}
