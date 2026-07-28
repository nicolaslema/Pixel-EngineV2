import { PixelCell } from "../../PixelCell";
import { RippleInfluence } from "../../../influences/RippleInfluence";

export interface PixelGridRuntimeState {
  reactiveTime: number;
  activeRipples: RippleInfluence[];
  recycledRipples: RippleInfluence[];
  activeMaskWeightCache: Float32Array;
  imageMaskWeightCache: Float32Array;
  textMaskWeightCache: Float32Array;
}

export function createPixelGridRuntimeState(
  cellCount: number
): PixelGridRuntimeState {
  return {
    reactiveTime: 0,
    activeRipples: [],
    recycledRipples: [],
    activeMaskWeightCache: new Float32Array(cellCount),
    imageMaskWeightCache: new Float32Array(cellCount),
    textMaskWeightCache: new Float32Array(cellCount)
  };
}

export function resetCell(cell: PixelCell): void {
  cell.snapshotPreviousState();
  cell.targetSize = 0;
  cell.resetVisualState();
}

export function resetCells(cells: PixelCell[]): void {
  for (let i = 0; i < cells.length; i++) {
    resetCell(cells[i]);
  }
}

export function compactAliveRipples(
  ripples: RippleInfluence[],
  recycled?: RippleInfluence[]
): void {
  let write = 0;
  for (let read = 0; read < ripples.length; read++) {
    const ripple = ripples[read];
    if (ripple.isAlive()) {
      ripples[write++] = ripple;
    } else if (recycled) {
      recycled.push(ripple);
    }
  }
  ripples.length = write;
}
