import { PixelCell } from "../../PixelCell";
import { ResolvedPixelGridConfig } from "../types";
import {
  applyReactiveEffectsToCell,
  applyReactiveRipple,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { PixelGridRuntimeState } from "./runtime-state";

interface ReactiveHoverPassParams {
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

export function applyReactiveHoverPass(
  params: ReactiveHoverPassParams
): void {
  if (!params.hoverEnabled || params.hoverEffects.mode !== "reactive") return;

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
