import { PixelCellBuffer } from "../cell-buffer";

export interface CellInit {
  x: number;
  y: number;
  color: string;
  gap: number;
  size?: number;
  previousSize?: number;
  targetSize?: number;
  offsetX?: number;
  previousOffsetX?: number;
  offsetY?: number;
  previousOffsetY?: number;
  opacity?: number;
  previousOpacity?: number;
  breathPhase?: number;
  breathOffset?: number;
}

/**
 * Builds a PixelCellBuffer directly from explicit per-cell values -- no Math.random()
 * involved (breathPhase/breathOffset default to 0), unlike production's createCellBuffer.
 * `gap` is taken from the first cell (grid-uniform, matches the real buffer's collapsed
 * scalar); all cells must agree on the same gap.
 */
export function createTestCellBuffer(cells: CellInit[]): PixelCellBuffer {
  const count = cells.length;
  const gap = cells.length > 0 ? cells[0].gap : 0;

  const buffer: PixelCellBuffer = {
    count,
    gap,
    maxSize: gap,
    x: new Float32Array(count),
    y: new Float32Array(count),
    size: new Float32Array(count),
    previousSize: new Float32Array(count),
    targetSize: new Float32Array(count),
    offsetX: new Float32Array(count),
    previousOffsetX: new Float32Array(count),
    offsetY: new Float32Array(count),
    previousOffsetY: new Float32Array(count),
    opacity: new Float32Array(count).fill(1),
    previousOpacity: new Float32Array(count).fill(1),
    breathPhase: new Float32Array(count),
    breathOffset: new Float32Array(count),
    color: new Array(count),
    baseColor: new Array(count)
  };

  for (let i = 0; i < count; i++) {
    const init = cells[i];
    buffer.x[i] = init.x;
    buffer.y[i] = init.y;
    buffer.color[i] = init.color;
    buffer.baseColor[i] = init.color;
    buffer.size[i] = init.size ?? 0;
    buffer.previousSize[i] = init.previousSize ?? buffer.size[i];
    buffer.targetSize[i] = init.targetSize ?? 0;
    buffer.offsetX[i] = init.offsetX ?? 0;
    buffer.previousOffsetX[i] = init.previousOffsetX ?? buffer.offsetX[i];
    buffer.offsetY[i] = init.offsetY ?? 0;
    buffer.previousOffsetY[i] = init.previousOffsetY ?? buffer.offsetY[i];
    buffer.opacity[i] = init.opacity ?? 1;
    buffer.previousOpacity[i] = init.previousOpacity ?? buffer.opacity[i];
    buffer.breathPhase[i] = init.breathPhase ?? 0;
    buffer.breathOffset[i] = init.breathOffset ?? 0;
  }

  return buffer;
}

export function createTestCell(init: CellInit): { buffer: PixelCellBuffer; index: 0 } {
  return { buffer: createTestCellBuffer([init]), index: 0 };
}
