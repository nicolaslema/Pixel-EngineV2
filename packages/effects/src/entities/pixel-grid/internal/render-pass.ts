import { IRenderer } from "@pixel-engine/core";
import { PixelCellBuffer } from "./cell-buffer";

export interface PixelRenderViewport {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function renderPixelCells(
  renderer: IRenderer,
  buffer: PixelCellBuffer,
  minRenderableSize = 0.5,
  viewport?: PixelRenderViewport,
  alpha = 1
): void {
  const ctx = renderer.getContext();
  const renderAlpha = Math.max(0, Math.min(1, alpha));
  const gap = buffer.gap;
  let currentColor = "";
  let currentOpacity = -1;

  for (let i = 0; i < buffer.count; i++) {
    const previousSize = buffer.previousSize[i];
    const size = previousSize + (buffer.size[i] - previousSize) * renderAlpha;
    if (size <= minRenderableSize) continue;

    const previousOffsetX = buffer.previousOffsetX[i];
    const offsetX = previousOffsetX + (buffer.offsetX[i] - previousOffsetX) * renderAlpha;
    const previousOffsetY = buffer.previousOffsetY[i];
    const offsetY = previousOffsetY + (buffer.offsetY[i] - previousOffsetY) * renderAlpha;
    const previousOpacity = buffer.previousOpacity[i];
    const opacity = previousOpacity + (buffer.opacity[i] - previousOpacity) * renderAlpha;

    const offset = (gap - size) * 0.5;
    const drawX = buffer.x[i] + offsetX + offset;
    const drawY = buffer.y[i] + offsetY + offset;

    if (viewport) {
      const drawMaxX = drawX + size;
      const drawMaxY = drawY + size;
      if (
        drawMaxX < viewport.minX ||
        drawX > viewport.maxX ||
        drawMaxY < viewport.minY ||
        drawY > viewport.maxY
      ) {
        continue;
      }
    }

    const color = buffer.color[i];
    if (color !== currentColor) {
      currentColor = color;
      ctx.fillStyle = currentColor;
    }

    if (opacity !== currentOpacity) {
      currentOpacity = opacity;
      ctx.globalAlpha = currentOpacity;
    }
    const drawSize = size | 0;
    if (drawSize <= 0) continue;

    ctx.fillRect(
      drawX | 0,
      drawY | 0,
      drawSize,
      drawSize
    );
  }

  if (currentOpacity !== 1) {
    ctx.globalAlpha = 1;
  }
}
