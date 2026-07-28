import { PixelCellBuffer, updateCell } from "./cell-buffer";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { compactAliveRipples, PixelGridRuntimeState, resetCell } from "./runtime-state";
import { MaskStateMachine } from "./mask-state-machine";

interface UpdatePipelineParams {
  delta: number;
  buffer: PixelCellBuffer;
  expandEase: number;
  runtime: PixelGridRuntimeState;
  influenceManager: InfluenceManager;
  maskState: MaskStateMachine;
  getCellIndex: (x: number, y: number) => number;
  prepareMaskWeightRecompute: () => boolean;
  writeCellMaskWeights: (buffer: PixelCellBuffer, index: number) => void;
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
  // loop here -- both are independent per-cell operations (resetCell touches only the
  // buffer's visual/size fields, writeCellMaskWeights only the separate mask-weight
  // Float32Arrays), and this is the earliest point in the frame where the mask-weight
  // recompute gate is decidable (shouldRecompute() depends on activeRipples.length
  // post-compaction and maskState's current masks post-update, both finalized just above).
  const recomputeMaskCache = params.prepareMaskWeightRecompute();
  for (let i = 0; i < params.buffer.count; i++) {
    resetCell(params.buffer, i);
    if (recomputeMaskCache) params.writeCellMaskWeights(params.buffer, i);
  }

  params.influenceManager.apply(
    params.buffer,
    params.getCellIndex
  );

  params.applyHoverBreathingAndRipple();
  params.applyPostEffects();

  for (let i = 0; i < params.buffer.count; i++) {
    updateCell(params.buffer, i, params.expandEase);
  }
}
