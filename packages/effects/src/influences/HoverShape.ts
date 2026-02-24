import { smoothstep } from "../utils/math";

export type HoverShape = "circle";

export interface HoverShapeOptions {
  radiusX: number;
  radiusY: number;
}

export function computeHoverFalloff(
  dx: number,
  dy: number,
  options: HoverShapeOptions
): number {
  const nx = Math.abs(dx) / options.radiusX;
  const ny = Math.abs(dy) / options.radiusY;

  const distance = Math.sqrt(nx * nx + ny * ny);
  if (distance >= 1) return 0;
  return 1 - smoothstep(0, 1, distance);
}
