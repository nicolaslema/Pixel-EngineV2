import type * as React from "react";
import type { PixelEngine, PixelEngineOptions, QualityLevel } from "@pixel-engine/core";
import type {
  PixelGridConfig,
  PixelGridEffect,
  PixelGridInfluenceOptions,
  PixelGridImageMaskConfig,
  PixelGridTextMaskConfig,
  InitialMask
} from "@pixel-engine/effects";

export type ResizeMode = "observer" | "window" | "none";
export type FitMode = "none" | "client";
export type RippleTriggerMode = "click" | "pointerdown" | "none";
export type OverlayPointerEventsMode = React.CSSProperties["pointerEvents"] | "hybrid";
export type PixelGridPresetName = "minimal" | "card-soft" | "card-ripple" | "hero-image";
export type PixelGridPresetMaskSupport = "none" | "optional" | "recommended";

export interface PixelGridPresetDefinition {
  name: PixelGridPresetName;
  description: string;
  recommendedFor: string;
  maskSupport: PixelGridPresetMaskSupport;
}

export interface PixelPointerEventPayload {
  x: number;
  y: number;
  nativeEvent: MouseEvent | PointerEvent;
}

export interface UsePixelEngineOptions {
  width: number;
  height: number;
  autoStart?: boolean;
  quality?: QualityLevel;
  clearColor?: string | null;
  devicePixelRatio?: number;
  resizeMode?: ResizeMode;
  fitMode?: FitMode;
  onReady?: (engine: PixelEngine) => void;
  onDestroy?: (engine: PixelEngine) => void;
  onHoverStart?: (event: PixelPointerEventPayload) => void;
  onHoverEnd?: (event: PixelPointerEventPayload) => void;
  createEngine?: (options: PixelEngineOptions) => PixelEngine;
}

export interface UsePixelEngineResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  engine: PixelEngine | null;
  isReady: boolean;
}

export interface PixelCanvasProps extends UsePixelEngineOptions {
  className?: string;
  style?: React.CSSProperties;
}

export interface TextMaskInput extends PixelGridTextMaskConfig {
  type: "text";
  text: string;
}

export interface ImageMaskInput extends PixelGridImageMaskConfig {
  type: "image";
  src: string;
}

export interface HybridMaskInput {
  type: "hybrid";
  text: Omit<TextMaskInput, "type">;
  image: Omit<ImageMaskInput, "type">;
  initialMask?: InitialMask;
  autoMorph?: PixelGridConfig["autoMorph"];
}

export type PixelGridMaskInput = TextMaskInput | ImageMaskInput | HybridMaskInput;

export interface UsePixelGridEffectOptions extends UsePixelEngineOptions {
  gridConfig?: Partial<PixelGridConfig>;
  preset?: PixelGridPresetName;
  mask?: PixelGridMaskInput;
  influenceOptions?: PixelGridInfluenceOptions;
  effectKey?: string | number;
  gridWidth?: number;
  gridHeight?: number;
  autoAttach?: boolean;
  rippleTrigger?: RippleTriggerMode;
  onGridReady?: (effect: PixelGridEffect, engine: PixelEngine) => void;
  onRipple?: (event: PixelPointerEventPayload) => void;
  createGridEffect?: (
    engine: PixelEngine,
    width: number,
    height: number,
    config: PixelGridConfig,
    influenceOptions?: PixelGridInfluenceOptions
  ) => PixelGridEffect;
}

export interface UsePixelGridEffectResult extends UsePixelEngineResult {
  grid: PixelGridEffect | null;
}

export interface PixelGridCanvasProps extends UsePixelGridEffectOptions {
  className?: string;
  style?: React.CSSProperties;
}
