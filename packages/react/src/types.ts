import type * as React from "react";
import type { PixelEngine, PixelEngineOptions, QualityLevel } from "@pixel-engine/core";
import type {
  PixelGridConfig,
  PixelGridEffect,
  PixelGridInfluenceOptions,
  PixelGridImageMaskConfig,
  PixelGridTextMaskConfig,
  PixelGridMaskErrorEvent,
  InitialMask
} from "@pixel-engine/effects";

export type ResizeMode = "observer" | "window" | "none";
export type FitMode = "none" | "client";
export type RippleTriggerMode = "click" | "pointerdown" | "none";
export type OverlayPointerEventsMode = React.CSSProperties["pointerEvents"] | "hybrid";
export type PixelGridPresetName = "minimal" | "card-soft" | "card-ripple" | "hero-image";
export type PixelGridPresetMaskSupport = "none" | "optional" | "recommended";
export type ScrollReactiveDirection = "up" | "down" | "both";
export type ScrollReactiveEdge = "leading" | "trailing" | "center";
export type SectionTransitionPresetName = "fade" | "lift" | "zoom";
export type ThemeSyncMode = "light" | "dark" | "brand";
export type StatePresetName = "idle" | "hover" | "active" | "success" | "error" | "loading";
export type DebugHudPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type SsrPlaceholderPresetName = "minimal" | "card-soft" | "hero-image";

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

export interface ScrollReactiveGridOptions {
  enabled?: boolean;
  intensity?: number;
  direction?: ScrollReactiveDirection;
  edge?: ScrollReactiveEdge;
  source?: "auto" | "window" | HTMLElement | React.RefObject<HTMLElement | null>;
  cooldownMs?: number;
  maxBurstRipples?: number;
  respectReducedMotion?: boolean;
}

export interface SectionTransitionOptions {
  enabled?: boolean;
  preset?: SectionTransitionPresetName;
  amount?: number;
  threshold?: number | number[];
  once?: boolean;
  rippleOnEnter?: boolean;
  playTimelineOnEnter?: boolean;
  pauseTimelineOnExit?: boolean;
  respectReducedMotion?: boolean;
}

export interface ThemeSyncOptions {
  enabled?: boolean;
  mode?: ThemeSyncMode;
  followSystem?: boolean;
  brandColors?: string[];
  brandCanvasBackground?: string;
  brandHoverTintPalette?: string[];
  brandRippleTintPalette?: string[];
}

export interface StatePresetOptions {
  enabled?: boolean;
  value?: StatePresetName;
}

export type StatePresetInput = StatePresetName | StatePresetOptions;

export interface DebugHudOptions {
  enabled?: boolean;
  position?: DebugHudPosition;
  updateIntervalMs?: number;
  offsetX?: number;
  offsetY?: number;
  showFps?: boolean;
  showQuality?: boolean;
  showLoop?: boolean;
  showCells?: boolean;
  showRipples?: boolean;
  showTimeline?: boolean;
}

export interface SsrPlaceholderOptions {
  enabled?: boolean;
  preset?: SsrPlaceholderPresetName;
  hideOnReady?: boolean;
  style?: React.CSSProperties;
}

export type SsrPlaceholderInput = SsrPlaceholderPresetName | SsrPlaceholderOptions;
export type CmsPixelConfigSchemaVersion = "1.0";

export interface CmsPixelConfigDocumentV1 {
  schemaVersion?: CmsPixelConfigSchemaVersion;
  preset?: PixelGridPresetName;
  gridConfig?: Partial<PixelGridConfig>;
  mask?: PixelGridMaskInput;
  scrollReactive?: ScrollReactiveGridOptions;
  sectionTransition?: SectionTransitionOptions;
  themeSync?: ThemeSyncOptions;
  statePreset?: StatePresetInput;
  debugHud?: DebugHudOptions;
  ssrPlaceholder?: SsrPlaceholderInput;
}

export interface CmsPixelConfigValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  value?: CmsPixelConfigDocumentV1;
}

export interface UsePixelEngineOptions {
  width: number;
  height: number;
  autoStart?: boolean;
  quality?: QualityLevel;
  loop?: PixelEngineOptions["loop"];
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
  text?: Omit<TextMaskInput, "type">;
  image?: Omit<ImageMaskInput, "type">;
  texts?: Array<Omit<TextMaskInput, "type">>;
  images?: Array<Omit<ImageMaskInput, "type">>;
  items?: NonNullable<PixelGridConfig["maskTimeline"]>["items"];
  steps?: NonNullable<PixelGridConfig["maskTimeline"]>["steps"];
  initialMask?: InitialMask;
  autoMorph?: PixelGridConfig["autoMorph"];
  maskTimeline?: PixelGridConfig["maskTimeline"];
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
  onMaskError?: (event: PixelGridMaskErrorEvent) => void;
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
  scrollReactive?: ScrollReactiveGridOptions;
  sectionTransition?: SectionTransitionOptions;
  themeSync?: ThemeSyncOptions;
  statePreset?: StatePresetInput;
  debugHud?: DebugHudOptions;
  ssrPlaceholder?: SsrPlaceholderInput;
}
