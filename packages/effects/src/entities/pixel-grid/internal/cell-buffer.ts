export interface PixelCellBuffer {
  readonly count: number;
  readonly gap: number;
  readonly maxSize: number;

  readonly x: Float32Array;
  readonly y: Float32Array;

  readonly size: Float32Array;
  readonly previousSize: Float32Array;
  readonly targetSize: Float32Array;

  readonly offsetX: Float32Array;
  readonly previousOffsetX: Float32Array;
  readonly offsetY: Float32Array;
  readonly previousOffsetY: Float32Array;

  readonly opacity: Float32Array;
  readonly previousOpacity: Float32Array;

  readonly breathPhase: Float32Array;
  readonly breathOffset: Float32Array;

  readonly color: string[];
  readonly baseColor: string[];
}

export function createCellBuffer(
  columns: number,
  rows: number,
  gap: number,
  colors: readonly string[]
): PixelCellBuffer {
  const count = columns * rows;
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

  // Single fused loop, x-outer/y-inner, matching getCellIndex's `x * rows + y` mapping and
  // calling Math.random() exactly 3 times per cell (color, breathPhase, breathOffset) in
  // this order, cell-by-cell -- required for visual-baseline.test.ts's seeded-Math.random
  // snapshot to stay bit-identical, and for PaletteCycleEffect's index-aligned baseIndices.
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      const i = x * rows + y;
      buffer.x[i] = x * gap;
      buffer.y[i] = y * gap;

      const color = colors[Math.floor(Math.random() * colors.length)];
      buffer.color[i] = color;
      buffer.baseColor[i] = color;

      buffer.breathPhase[i] = Math.random() * Math.PI * 2;
      buffer.breathOffset[i] = Math.random() * 0.5 + 0.5;
    }
  }

  return buffer;
}

export function getBreathFactor(
  buffer: PixelCellBuffer,
  index: number,
  time: number,
  breathSpeed: number
): number {
  const t = time * 0.001 * breathSpeed;
  return (
    (Math.sin(t + buffer.breathPhase[index]) * 0.5 + 0.5) *
    buffer.breathOffset[index]
  );
}

export function updateCell(
  buffer: PixelCellBuffer,
  index: number,
  expandEase: number
): void {
  buffer.size[index] +=
    (buffer.targetSize[index] - buffer.size[index]) * expandEase;
}

export function snapshotPreviousState(
  buffer: PixelCellBuffer,
  index: number
): void {
  buffer.previousSize[index] = buffer.size[index];
  buffer.previousOffsetX[index] = buffer.offsetX[index];
  buffer.previousOffsetY[index] = buffer.offsetY[index];
  buffer.previousOpacity[index] = buffer.opacity[index];
}

export function resetVisualState(
  buffer: PixelCellBuffer,
  index: number
): void {
  buffer.offsetX[index] = 0;
  buffer.offsetY[index] = 0;
  buffer.color[index] = buffer.baseColor[index];
  buffer.opacity[index] = 1;
}

export function getInterpolatedSize(
  buffer: PixelCellBuffer,
  index: number,
  alpha: number
): number {
  return (
    buffer.previousSize[index] +
    (buffer.size[index] - buffer.previousSize[index]) * alpha
  );
}

export function getInterpolatedOffsetX(
  buffer: PixelCellBuffer,
  index: number,
  alpha: number
): number {
  return (
    buffer.previousOffsetX[index] +
    (buffer.offsetX[index] - buffer.previousOffsetX[index]) * alpha
  );
}

export function getInterpolatedOffsetY(
  buffer: PixelCellBuffer,
  index: number,
  alpha: number
): number {
  return (
    buffer.previousOffsetY[index] +
    (buffer.offsetY[index] - buffer.previousOffsetY[index]) * alpha
  );
}

export function getInterpolatedOpacity(
  buffer: PixelCellBuffer,
  index: number,
  alpha: number
): number {
  return (
    buffer.previousOpacity[index] +
    (buffer.opacity[index] - buffer.previousOpacity[index]) * alpha
  );
}
