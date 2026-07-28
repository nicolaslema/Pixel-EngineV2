import { PixelCell } from "../../PixelCell";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { compactAliveRipples, PixelGridRuntimeState, resetCell } from "./runtime-state";
import { MaskStateMachine } from "./mask-state-machine";

interface UpdatePipelineParams {
  delta: number;
  cells: PixelCell[];
  expandEase: number;
  runtime: PixelGridRuntimeState;
  influenceManager: InfluenceManager;
  maskState: MaskStateMachine;
  getCellIndex: (x: number, y: number) => number;
  prepareMaskWeightRecompute: () => boolean;
  writeCellMaskWeights: (cell: PixelCell, index: number) => void;
  applyHoverBreathingAndRipple: () => void;
  applyPostEffects: () => void;
}

export function runPixelGridUpdatePipeline(
  params: UpdatePipelineParams
): void {
  params.runtime.reactiveTime += params.delta;

  params.influenceManager.update(params.delta);
  compactAliveRipples(
    params.runtime.activeRipples,
    params.runtime.recycledRipples
  );
  params.maskState.update(params.delta);

  // resetCell() and (conditionally) writeCellMaskWeights() are fused into one full-grid
  // loop here -- both are independent per-cell operations (resetCell touches only PixelCell
  // fields, writeCellMaskWeights only the separate mask-weight Float32Arrays), and this is
  // the earliest point in the frame where the mask-weight recompute gate is decidable
  // (shouldRecompute() depends on activeRipples.length post-compaction and maskState's
  // current masks post-update, both finalized just above).
  const recomputeMaskCache = params.prepareMaskWeightRecompute();
  for (let i = 0; i < params.cells.length; i++) {
    const cell = params.cells[i];
    resetCell(cell);
    if (recomputeMaskCache) params.writeCellMaskWeights(cell, i);
  }

  params.influenceManager.apply(
    params.cells,
    params.getCellIndex
  );

  params.applyHoverBreathingAndRipple();
  params.applyPostEffects();

  for (let i = 0; i < params.cells.length; i++) {
    params.cells[i].update(params.expandEase);
  }
}
