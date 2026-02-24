import { PixelCell } from "../../PixelCell";
import { computeHoverFalloff } from "../../../influences/HoverShape";
import { clamp } from "../../../utils/math";
import { ResolvedPixelGridConfig } from "../types";

interface BreathingParams {
  cells: PixelCell[];
  breathing: ResolvedPixelGridConfig["breathing"];
  mouse: { x: number; y: number; inside: boolean };
  imageMaskWeightCache: Float32Array;
  textMaskWeightCache: Float32Array;
  reactiveTime: number;
}

export function applyBreathingSystem(params: BreathingParams): void {
  if (!params.breathing.enabled) return;

  const minOpacity = clamp(params.breathing.minOpacity, 0, 1);
  const maxOpacity = clamp(params.breathing.maxOpacity, minOpacity, 1);
  const speed = Math.max(0, params.breathing.speed);
  const strength = clamp(params.breathing.strength, 0, 1);

  for (let i = 0; i < params.cells.length; i++) {
    const cell = params.cells[i];
    if (cell.targetSize <= 0.001) continue;

    let influenceWeight = 0;

    if (params.breathing.affectHover && params.mouse.inside) {
      const dx = cell.x - params.mouse.x;
      const dy = cell.y - params.mouse.y;

      const hoverWeight = computeHoverFalloff(dx, dy, {
        radiusX: params.breathing.radius,
        radiusY: params.breathing.radiusY
      });

      influenceWeight = Math.max(influenceWeight, hoverWeight);
    }

    if (params.breathing.affectImage) {
      influenceWeight = Math.max(influenceWeight, params.imageMaskWeightCache[i]);
    }

    if (params.breathing.affectText) {
      influenceWeight = Math.max(influenceWeight, params.textMaskWeightCache[i]);
    }

    if (influenceWeight <= 0.001) continue;

    const breathWave = cell.getBreathFactor(params.reactiveTime, speed);
    const randomSlice = Math.floor(params.reactiveTime * 0.001 * speed * 2);
    const seed = Math.sin((i + 1) * 12.9898 + randomSlice * 78.233) * 43758.5453;
    const randomPulse = seed - Math.floor(seed);
    const wave = clamp((breathWave * 0.65) + (randomPulse * 0.35), 0, 1);
    const breathOpacity =
      minOpacity + (maxOpacity - minOpacity) * wave;
    const mix = clamp(influenceWeight * strength, 0, 1);

    cell.opacity = 1 + (breathOpacity - 1) * mix;
  }
}
