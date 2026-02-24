import { IRenderer } from "../renderers/IRenderer";

export type QualityLevel = "low" | "medium" | "high";

export interface PixelEngineRendererFactory {
  (canvas: HTMLCanvasElement): IRenderer;
}

export interface PixelEngineLoopOptions {
  fixedTimeStep?: number;
  maxDelta?: number;
  maxUpdatesPerFrame?: number;
}

export interface PixelEngineOptions {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  // Runtime scheduling profile used to derive loop defaults.
  quality?: QualityLevel;
  // Explicit loop tuning overrides quality defaults.
  loop?: PixelEngineLoopOptions;
  clearColor?: string | null;
  devicePixelRatio?: number;
  rendererFactory?: PixelEngineRendererFactory;
}
