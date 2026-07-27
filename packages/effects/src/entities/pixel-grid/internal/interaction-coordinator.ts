import { PixelCell } from "../../PixelCell";
import { ResolvedPixelGridConfig } from "../types";
import {
  applyMagneticHoverToCell,
  applyReactiveEffectsToCell,
  applyReactiveRipple,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { PixelGridRuntimeState } from "./runtime-state";

interface HoverInteractionsPassParams {
  cells: PixelCell[];
  runtime: Pick<PixelGridRuntimeState, "activeMaskWeightCache" | "reactiveTime">;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  hoverEnabled: boolean;
  mouse: { x: number; y: number; inside: boolean };
}

interface ReactiveRipplePassParams {
  cells: PixelCell[];
  runtime: Pick<PixelGridRuntimeState, "activeMaskWeightCache" | "activeRipples" | "reactiveTime">;
  rippleEnabled: boolean;
  inverseGap: number;
  columns: number;
  rows: number;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  rippleEffects: ResolvedPixelGridConfig["rippleEffects"];
  getCellIndex: (x: number, y: number) => number;
}

/**
 * Fused reactive-hover + magnetic-hover pass. Both effects share the same per-cell gate
 * (shouldAffectCell + getHoverWeight, same hoverEffects.radius-based falloff) and used to
 * run as two separate full-grid loops recomputing that falloff independently -- merged into
 * one loop, one falloff computation, with each sub-effect still independently gated exactly
 * as before (`mode === "reactive"` for the reactive effect, `magnetic.enabled` for the
 * magnetic pull). Magnetic's own internal falloff (based on `magnetic.radius`, which can
 * differ from `hoverEffects.radius`) is untouched -- magnetic reach is still implicitly
 * capped by `hoverEffects.radius` via this shared outer gate, exactly like before.
 */
export function applyHoverInteractionsPass(
  params: HoverInteractionsPassParams
): void {
  if (!params.hoverEnabled || !params.mouse.inside) return;

  const applyReactive = params.hoverEffects.mode === "reactive";
  const applyMagnetic = params.hoverEffects.magnetic.enabled;
  if (!applyReactive && !applyMagnetic) return;

  for (let i = 0; i < params.cells.length; i++) {
    const cell = params.cells[i];
    if (
      !shouldAffectCell(
        params.hoverEffects.interactionScope,
        cell.targetSize,
        params.runtime.activeMaskWeightCache[i]
      )
    ) {
      continue;
    }

    const falloff = getHoverWeight(cell, params.mouse, params.hoverEffects);
    if (falloff <= 0) continue;

    const interaction = falloff * params.hoverEffects.strength;

    if (applyReactive) {
      applyReactiveEffectsToCell({
        cell,
        cellIndex: i,
        interaction,
        originX: params.mouse.x,
        originY: params.mouse.y,
        reactiveTime: params.runtime.reactiveTime,
        hoverEffects: params.hoverEffects,
        tintPalette: params.hoverEffects.tintPalette
      });
    }

    if (applyMagnetic) {
      applyMagneticHoverToCell({
        cell,
        interaction,
        originX: params.mouse.x,
        originY: params.mouse.y,
        hoverEffects: params.hoverEffects
      });
    }
  }
}

export function applyReactiveRipplePass(
  params: ReactiveRipplePassParams
): void {
  if (!params.rippleEnabled) return;

  applyReactiveRipple({
    cells: params.cells,
    activeRipples: params.runtime.activeRipples,
    inverseGap: params.inverseGap,
    columns: params.columns,
    rows: params.rows,
    hoverEffects: params.hoverEffects,
    rippleEffects: params.rippleEffects,
    activeMaskWeightCache: params.runtime.activeMaskWeightCache,
    reactiveTime: params.runtime.reactiveTime,
    getCellIndex: params.getCellIndex
  });
}
