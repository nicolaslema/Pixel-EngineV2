import { PixelCell } from "../../PixelCell";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { compactAliveRipples, PixelGridRuntimeState, resetCells } from "./runtime-state";
import { MaskStateMachine } from "./mask-state-machine";

interface UpdatePipelineParams {
  delta: number;
  cells: PixelCell[];
  expandEase: number;
  runtime: PixelGridRuntimeState;
  influenceManager: InfluenceManager;
  maskState: MaskStateMachine;
  getCellIndex: (x: number, y: number) => number;
  shouldRecomputeMaskWeightCache: () => boolean;
  updateMaskWeightCache: () => void;
  applyHoverInteractions: () => void;
  applyReactiveRippleEffects: () => void;
  applyBreathing: () => void;
  applyPostEffects: () => void;
}

export function runPixelGridUpdatePipeline(
  params: UpdatePipelineParams
): void {
  params.runtime.reactiveTime += params.delta;

  resetCells(params.cells);

  params.influenceManager.update(params.delta);
  compactAliveRipples(
    params.runtime.activeRipples,
    params.runtime.recycledRipples
  );
  params.maskState.update(params.delta);

  params.influenceManager.apply(
    params.cells,
    params.getCellIndex
  );

  if (params.shouldRecomputeMaskWeightCache()) {
    params.updateMaskWeightCache();
  }

  params.applyHoverInteractions();
  params.applyReactiveRippleEffects();
  params.applyBreathing();
  params.applyPostEffects();

  for (let i = 0; i < params.cells.length; i++) {
    params.cells[i].update(params.expandEase);
  }
}
