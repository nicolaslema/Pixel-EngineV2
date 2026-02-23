import { IRenderer } from "../../../renderers/IRenderer";
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
  viewport?: PixelRenderViewport,
  alpha = 1
): void {
  const ctx = renderer.getContext();
  const renderAlpha = Math.max(0, Math.min(1, alpha));
  let currentColor = "";
  let currentOpacity = -1;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const size = cell.getInterpolatedSize(renderAlpha);
    if (size <= minRenderableSize) continue;

    const offsetX = cell.getInterpolatedOffsetX(renderAlpha);
    const offsetY = cell.getInterpolatedOffsetY(renderAlpha);
    const opacity = cell.getInterpolatedOpacity(renderAlpha);

    const offset = (cell.gap - size) * 0.5;
    const drawX = cell.x + offsetX + offset;
    const drawY = cell.y + offsetY + offset;

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

    if (cell.color !== currentColor) {
      currentColor = cell.color;
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
