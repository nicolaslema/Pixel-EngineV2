import { PixelCellBuffer } from "./cell-buffer";
import { ResolvedPixelGridConfig } from "../types";
import {
  applyMagneticHoverToCell,
  applyReactiveEffectsToCell,
  applyReactiveRipple,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { PixelGridRuntimeState } from "./runtime-state";
import {
  applyBreathingToCell,
  buildBreathingCellContext,
  BreathingCellContext
} from "./breathing-system";

interface HoverInteractionsPassParams {
  buffer: PixelCellBuffer;
  runtime: Pick<PixelGridRuntimeState, "activeMaskWeightCache" | "reactiveTime">;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  hoverEnabled: boolean;
  mouse: { x: number; y: number; inside: boolean };
}

export interface HoverCellContext {
  runtime: Pick<PixelGridRuntimeState, "activeMaskWeightCache" | "reactiveTime">;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  mouse: { x: number; y: number; inside: boolean };
  applyReactive: boolean;
  applyMagnetic: boolean;
}

export interface HoverAndBreathingPassParams {
  buffer: PixelCellBuffer;
  runtime: Pick<
    PixelGridRuntimeState,
    "activeMaskWeightCache" | "imageMaskWeightCache" | "textMaskWeightCache" | "reactiveTime"
  >;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  hoverEnabled: boolean;
  breathing: ResolvedPixelGridConfig["breathing"];
  mouse: { x: number; y: number; inside: boolean };
}

interface ReactiveRipplePassParams {
  buffer: PixelCellBuffer;
  runtime: Pick<PixelGridRuntimeState, "activeMaskWeightCache" | "activeRipples" | "reactiveTime">;
  rippleEnabled: boolean;
  gap: number;
  inverseGap: number;
  columns: number;
  rows: number;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  rippleEffects: ResolvedPixelGridConfig["rippleEffects"];
  getCellIndex: (x: number, y: number) => number;
}

/**
 * Fused reactive-hover + magnetic-hover pass. Both effects share only the outer
 * shouldAffectCell/interactionScope gate ("is this cell in scope at all") -- beyond that,
 * each computes and gates on its own falloff independently: the reactive effect on
 * `hoverEffects.radius`/`hoverEffects.strength`, magnetic on its own `magnetic.radius`/
 * `magnetic.strength`. Magnetic's reach and pull magnitude are fully decoupled from
 * `hoverEffects.radius`/`strength` -- it used to reuse the reactive falloff (both as an
 * extra multiplier on pull strength and as an outer early-return gate), which silently
 * squared its effective falloff curve when the two radii matched (the default) and made
 * any `magnetic.radius` larger than `hoverEffects.radius` a dead zone beyond that point.
 */
export function applyHoverToCell(
  buffer: PixelCellBuffer,
  index: number,
  ctx: HoverCellContext
): void {
  if (
    !shouldAffectCell(
      ctx.hoverEffects.interactionScope,
      buffer.targetSize[index],
      ctx.runtime.activeMaskWeightCache[index]
    )
  ) {
    return;
  }

  if (ctx.applyReactive) {
    const falloff = getHoverWeight(buffer, index, ctx.mouse, ctx.hoverEffects);
    if (falloff > 0) {
      applyReactiveEffectsToCell({
        buffer,
        index,
        interaction: falloff * ctx.hoverEffects.strength,
        originX: ctx.mouse.x,
        originY: ctx.mouse.y,
        reactiveTime: ctx.runtime.reactiveTime,
        hoverEffects: ctx.hoverEffects,
        tintPalette: ctx.hoverEffects.tintPalette
      });
    }
  }

  if (ctx.applyMagnetic) {
    applyMagneticHoverToCell({
      buffer,
      index,
      originX: ctx.mouse.x,
      originY: ctx.mouse.y,
      hoverEffects: ctx.hoverEffects
    });
  }
}

export function applyHoverInteractionsPass(
  params: HoverInteractionsPassParams
): void {
  if (!params.hoverEnabled || !params.mouse.inside) return;

  const applyReactive = params.hoverEffects.mode === "reactive";
  const applyMagnetic = params.hoverEffects.magnetic.enabled;
  if (!applyReactive && !applyMagnetic) return;

  const ctx: HoverCellContext = {
    runtime: params.runtime,
    hoverEffects: params.hoverEffects,
    mouse: params.mouse,
    applyReactive,
    applyMagnetic
  };

  for (let i = 0; i < params.buffer.count; i++) {
    applyHoverToCell(params.buffer, i, ctx);
  }
}

/**
 * Fused hover + breathing pass -- only safe to use when no ripples are active this frame.
 * The ripple pass sits between hover and breathing in the original sequence and can mutate
 * targetSize/offset/color for cells in its AABB; breathing's unconditional targetSize gate
 * means it observes the post-ripple value today. Skipping over ripple's position is only
 * behavior-identical when applyReactiveRipplePass would have been a no-op anyway, i.e. when
 * there are zero active ripples (see applyReactiveRipple's own early return). Callers must
 * check `runtime.activeRipples.length === 0` before calling this and fall back to running
 * applyHoverInteractionsPass -> applyReactiveRipplePass -> applyBreathingSystem in sequence
 * otherwise.
 */
export function applyHoverAndBreathingPass(
  params: HoverAndBreathingPassParams
): void {
  const hoverGateOpen = params.hoverEnabled && params.mouse.inside;
  const applyReactive = hoverGateOpen && params.hoverEffects.mode === "reactive";
  const applyMagnetic = hoverGateOpen && params.hoverEffects.magnetic.enabled;
  const hoverActive = applyReactive || applyMagnetic;
  const breathingActive = params.breathing.enabled;
  if (!hoverActive && !breathingActive) return;

  const hoverCtx: HoverCellContext | null = hoverActive
    ? {
        runtime: params.runtime,
        hoverEffects: params.hoverEffects,
        mouse: params.mouse,
        applyReactive,
        applyMagnetic
      }
    : null;

  const breathingCtx: BreathingCellContext | null = breathingActive
    ? buildBreathingCellContext({
        breathing: params.breathing,
        mouse: params.mouse,
        imageMaskWeightCache: params.runtime.imageMaskWeightCache,
        textMaskWeightCache: params.runtime.textMaskWeightCache,
        reactiveTime: params.runtime.reactiveTime
      })
    : null;

  for (let i = 0; i < params.buffer.count; i++) {
    if (hoverCtx) applyHoverToCell(params.buffer, i, hoverCtx);
    if (breathingCtx) applyBreathingToCell(params.buffer, i, breathingCtx);
  }
}

export function applyReactiveRipplePass(
  params: ReactiveRipplePassParams
): void {
  if (!params.rippleEnabled) return;

  applyReactiveRipple({
    buffer: params.buffer,
    activeRipples: params.runtime.activeRipples,
    gap: params.gap,
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
