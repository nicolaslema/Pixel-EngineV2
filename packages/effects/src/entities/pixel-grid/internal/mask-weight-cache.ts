import { PixelCell } from "../../PixelCell";
import { PixelGridInfluenceOptions, ResolvedPixelGridConfig } from "../types";
import { MaskStateMachine } from "./mask-state-machine";
import { PixelGridRuntimeState } from "./runtime-state";

export interface MaskWeightCacheCoordinator {
  shouldRecompute(): boolean;
  recompute(): void;
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

  const recompute = () => {
    const imageMask = params.maskState.imageMask;
    const textMask = params.maskState.textMask;
    const morphMask = params.maskState.morphMask;
    const hasImage = imageMask !== null;
    const hasText = textMask !== null;
    const hasMorph = morphMask !== null;

    if (!hasImage && !hasText && !hasMorph) {
      zeroCaches();
      return;
    }

    for (let i = 0; i < params.cells.length; i++) {
      const cell = params.cells[i];
      const image = hasImage
        ? imageMask!.getInfluence(cell.x, cell.y, 1)
        : 0;
      const text = hasText
        ? textMask!.getInfluence(cell.x, cell.y, 1)
        : 0;
      const morph = hasMorph
        ? morphMask!.getInfluence(cell.x, cell.y, 1)
        : 0;

      const textOrMorph = Math.max(text, morph);

      params.runtime.imageMaskWeightCache[i] = image;
      params.runtime.textMaskWeightCache[i] = textOrMorph;
      params.runtime.activeMaskWeightCache[i] = Math.max(image, textOrMorph);
    }

    maskCacheIsZeroed = false;
  };

  return {
    shouldRecompute,
    recompute
  };
}
