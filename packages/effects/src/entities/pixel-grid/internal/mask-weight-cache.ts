import { PixelCell } from "../../PixelCell";
import { PixelGridInfluenceOptions, ResolvedPixelGridConfig } from "../types";
import { MaskStateMachine } from "./mask-state-machine";
import { PixelGridRuntimeState } from "./runtime-state";

export interface MaskWeightCacheCoordinator {
  shouldRecompute(): boolean;
  recompute(): void;
  /**
   * Combines shouldRecompute()'s gate check with capturing the current mask
   * references for writeCellMaskWeights() to read per-cell. Call once per frame,
   * before iterating cells; use the returned boolean to decide whether to call
   * writeCellMaskWeights() for each cell.
   */
  prepareRecompute(): boolean;
  /** Stable closure -- reads the masks captured by the last prepareRecompute() call. */
  writeCellMaskWeights(cell: PixelCell, index: number): void;
}

interface CreateMaskWeightCacheCoordinatorParams {
  cells: PixelCell[];
  runtime: PixelGridRuntimeState;
  maskState: MaskStateMachine;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  rippleEffects: ResolvedPixelGridConfig["rippleEffects"];
  breathing: ResolvedPixelGridConfig["breathing"];
  influenceOptions: PixelGridInfluenceOptions;
}

export function createMaskWeightCacheCoordinator(
  params: CreateMaskWeightCacheCoordinatorParams
): MaskWeightCacheCoordinator {
  let maskCacheIsZeroed = true;
  let planImageMask: MaskStateMachine["imageMask"] = null;
  let planTextMask: MaskStateMachine["textMask"] = null;
  let planMorphMask: MaskStateMachine["morphMask"] = null;

  const zeroCaches = () => {
    if (maskCacheIsZeroed) return;
    params.runtime.activeMaskWeightCache.fill(0);
    params.runtime.imageMaskWeightCache.fill(0);
    params.runtime.textMaskWeightCache.fill(0);
    maskCacheIsZeroed = true;
  };

  const hasAnyMaskSources = () =>
    params.maskState.imageMask !== null ||
    params.maskState.textMask !== null ||
    params.maskState.morphMask !== null;

  const shouldRecompute = () => {
    const needsMaskScope =
      params.hoverEffects.interactionScope === "imageMask" &&
      ((params.influenceOptions.hover && params.hoverEffects.mode === "reactive") ||
        (params.influenceOptions.ripple &&
          params.rippleEffects.enabled &&
          params.runtime.activeRipples.length > 0));

    const needsBreathingMasks =
      params.breathing.enabled &&
      (params.breathing.affectImage || params.breathing.affectText);

    const needsMaskWeights = needsMaskScope || needsBreathingMasks;
    if (!needsMaskWeights) return false;

    if (!hasAnyMaskSources()) {
      zeroCaches();
      return false;
    }

    return true;
  };

  // Shared by recompute() and writeCellMaskWeights() -- keeps the per-cell weight math
  // (image/text/morph sampling + the textOrMorph max-blend) defined in exactly one place.
  const writeCellMaskWeightsWith = (
    cell: PixelCell,
    index: number,
    imageMask: MaskStateMachine["imageMask"],
    textMask: MaskStateMachine["textMask"],
    morphMask: MaskStateMachine["morphMask"]
  ): void => {
    const image = imageMask ? imageMask.getInfluence(cell.x, cell.y, 1) : 0;
    const text = textMask ? textMask.getInfluence(cell.x, cell.y, 1) : 0;
    const morph = morphMask ? morphMask.getInfluence(cell.x, cell.y, 1) : 0;

    const textOrMorph = Math.max(text, morph);

    params.runtime.imageMaskWeightCache[index] = image;
    params.runtime.textMaskWeightCache[index] = textOrMorph;
    params.runtime.activeMaskWeightCache[index] = Math.max(image, textOrMorph);
  };

  const recompute = () => {
    const imageMask = params.maskState.imageMask;
    const textMask = params.maskState.textMask;
    const morphMask = params.maskState.morphMask;

    if (!imageMask && !textMask && !morphMask) {
      zeroCaches();
      return;
    }

    for (let i = 0; i < params.cells.length; i++) {
      writeCellMaskWeightsWith(params.cells[i], i, imageMask, textMask, morphMask);
    }

    maskCacheIsZeroed = false;
  };

  const prepareRecompute = (): boolean => {
    if (!shouldRecompute()) return false;

    planImageMask = params.maskState.imageMask;
    planTextMask = params.maskState.textMask;
    planMorphMask = params.maskState.morphMask;
    maskCacheIsZeroed = false;
    return true;
  };

  const writeCellMaskWeights = (cell: PixelCell, index: number): void => {
    writeCellMaskWeightsWith(cell, index, planImageMask, planTextMask, planMorphMask);
  };

  return {
    shouldRecompute,
    recompute,
    prepareRecompute,
    writeCellMaskWeights
  };
}
