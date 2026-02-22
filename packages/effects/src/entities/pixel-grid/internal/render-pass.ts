import { IRenderer } from "@pixel-engine/core";
import { PixelCell } from "../../PixelCell";

export interface PixelRenderViewport {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function renderPixelCells(
  renderer: IRenderer,
  cells: PixelCell[],
  minRenderableSize = 0.5,
  viewport?: PixelRenderViewport
): void {
  const ctx = renderer.getContext();
  let currentColor = "";
  let currentOpacity = -1;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.size <= minRenderableSize) continue;

    const offset = (cell.gap - cell.size) * 0.5;
    const drawX = cell.x + cell.offsetX + offset;
    const drawY = cell.y + cell.offsetY + offset;

    if (viewport) {
      const drawMaxX = drawX + cell.size;
      const drawMaxY = drawY + cell.size;
      if (
        drawMaxX < viewport.minX ||
        drawX > viewport.maxX ||
        drawMaxY < viewport.minY ||
        drawY > viewport.maxY
      ) {
        continue;
      }
    }

    if (cell.color !== currentColor) {
      currentColor = cell.color;
      ctx.fillStyle = currentColor;
    }

    if (cell.opacity !== currentOpacity) {
      currentOpacity = cell.opacity;
      ctx.globalAlpha = currentOpacity;
    }
    const drawSize = cell.size | 0;
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
