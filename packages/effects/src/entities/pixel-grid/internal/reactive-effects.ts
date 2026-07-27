import { PixelCell } from "../../PixelCell";
import { RippleInfluence } from "../../../influences/RippleInfluence";
import { computeHoverFalloff } from "../../../influences/HoverShape";
import { ResolvedPixelGridConfig } from "../types";

interface ReactiveCellOptions {
  interaction: number;
  cellIndex: number;
  cell: PixelCell;
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

export function getHoverWeight(
  cell: PixelCell,
  mouse: { x: number; y: number; inside: boolean },
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"]
): number {
  if (!mouse.inside) return 0;

  const dx = cell.x - mouse.x;
  const dy = cell.y - mouse.y;
  return computeHoverFalloff(dx, dy, {
    radiusX: hoverEffects.radius,
    radiusY: hoverEffects.radius
  });
}

export function applyMagneticHoverToCell(
  options: {
    cell: PixelCell;
    interaction: number;
    originX: number;
    originY: number;
    hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  }
): void {
  const magnetic = options.hoverEffects.magnetic;
  if (!magnetic.enabled) return;

  const dx = options.originX - options.cell.x;
  const dy = options.originY - options.cell.y;
  const radius = magnetic.radius;
  const falloff = computeHoverFalloff(dx, dy, {
    radiusX: radius,
    radiusY: radius
  });
  if (falloff <= 0) return;

  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const direction = magnetic.mode === "attract" ? 1 : -1;
  const pull = magnetic.strength * options.interaction * falloff * direction;

  options.cell.offsetX += (dx / len) * pull;
  options.cell.offsetY += (dy / len) * pull;
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

  if (deactivate > 0) {
    options.cell.targetSize *= Math.max(0, 1 - deactivate * strength);
  }

  if (displace > 0) {
    const dx = options.cell.x - options.originX;
    const dy = options.cell.y - options.originY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    const noise =
      Math.sin((options.cellIndex + 1) * 12.9898 + options.reactiveTime * 0.01) * 0.5 + 0.5;

    const jitterTerm = (noise - 0.5) * 2 * jitter * strength;

    options.cell.offsetX += dirX * displace * strength + jitterTerm;
    options.cell.offsetY += dirY * displace * strength - jitterTerm;
  }

  if (options.tintPalette.length > 0) {
    const normalized = Math.max(0, Math.min(0.999, strength));
    const colorIndex = Math.floor(normalized * options.tintPalette.length);
    options.cell.color = options.tintPalette[colorIndex];
  }
}

export function applyReactiveRipple(
  params: {
    cells: PixelCell[];
    activeRipples: RippleInfluence[];
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

    for (let x = minCol; x <= maxCol; x++) {
      for (let y = minRow; y <= maxRow; y++) {
        const index = params.getCellIndex(x, y);
        const cell = params.cells[index];

        if (!shouldAffectCell(params.hoverEffects.interactionScope, cell.targetSize, params.activeMaskWeightCache[index])) {
          continue;
        }

        const factor = ripple.getRingFactorAt(cell.x, cell.y);
        if (factor <= 0) continue;

        applyReactiveEffectsToCell({
          cell,
          cellIndex: index,
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
