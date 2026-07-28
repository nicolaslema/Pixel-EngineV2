import { getBreathFactor, PixelCellBuffer } from "./cell-buffer";
import { computeHoverFalloff } from "../../../influences/HoverShape";
import { clamp } from "../../../utils/math";
import { ResolvedPixelGridConfig } from "../types";

interface BreathingParams {
  buffer: PixelCellBuffer;
  breathing: ResolvedPixelGridConfig["breathing"];
  mouse: { x: number; y: number; inside: boolean };
  imageMaskWeightCache: Float32Array;
  textMaskWeightCache: Float32Array;
  reactiveTime: number;
}

export interface BreathingCellContext {
  breathing: ResolvedPixelGridConfig["breathing"];
  mouse: { x: number; y: number; inside: boolean };
  imageMaskWeightCache: Float32Array;
  textMaskWeightCache: Float32Array;
  reactiveTime: number;
  minOpacity: number;
  maxOpacity: number;
  speed: number;
  strength: number;
}

export function buildBreathingCellContext(
  params: Pick<
    BreathingParams,
    "breathing" | "mouse" | "imageMaskWeightCache" | "textMaskWeightCache" | "reactiveTime"
  >
): BreathingCellContext {
  const minOpacity = clamp(params.breathing.minOpacity, 0, 1);
  return {
    breathing: params.breathing,
    mouse: params.mouse,
    imageMaskWeightCache: params.imageMaskWeightCache,
    textMaskWeightCache: params.textMaskWeightCache,
    reactiveTime: params.reactiveTime,
    minOpacity,
    maxOpacity: clamp(params.breathing.maxOpacity, minOpacity, 1),
    speed: Math.max(0, params.breathing.speed),
    strength: clamp(params.breathing.strength, 0, 1)
  };
}

export function applyBreathingToCell(
  buffer: PixelCellBuffer,
  index: number,
  ctx: BreathingCellContext
): void {
  if (buffer.targetSize[index] <= 0.001) return;

  let influenceWeight = 0;

  if (ctx.breathing.affectHover && ctx.mouse.inside) {
    const dx = buffer.x[index] - ctx.mouse.x;
    const dy = buffer.y[index] - ctx.mouse.y;

    const hoverWeight = computeHoverFalloff(dx, dy, {
      radiusX: ctx.breathing.radius,
      radiusY: ctx.breathing.radiusY
    });

    influenceWeight = Math.max(influenceWeight, hoverWeight);
  }

  if (ctx.breathing.affectImage) {
    influenceWeight = Math.max(influenceWeight, ctx.imageMaskWeightCache[index]);
  }

  if (ctx.breathing.affectText) {
    influenceWeight = Math.max(influenceWeight, ctx.textMaskWeightCache[index]);
  }

  if (influenceWeight <= 0.001) return;

  const breathWave = getBreathFactor(buffer, index, ctx.reactiveTime, ctx.speed);
  const randomSlice = Math.floor(ctx.reactiveTime * 0.001 * ctx.speed * 2);
  const seed = Math.sin((index + 1) * 12.9898 + randomSlice * 78.233) * 43758.5453;
  const randomPulse = seed - Math.floor(seed);
  const wave = clamp((breathWave * 0.65) + (randomPulse * 0.35), 0, 1);
  const breathOpacity =
    ctx.minOpacity + (ctx.maxOpacity - ctx.minOpacity) * wave;
  const mix = clamp(influenceWeight * ctx.strength, 0, 1);

  buffer.opacity[index] = 1 + (breathOpacity - 1) * mix;
}

export function applyBreathingSystem(params: BreathingParams): void {
  if (!params.breathing.enabled) return;

  const ctx = buildBreathingCellContext(params);

  for (let i = 0; i < params.buffer.count; i++) {
    applyBreathingToCell(params.buffer, i, ctx);
  }
}
