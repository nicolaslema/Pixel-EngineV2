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
  onEngineError?: (error: unknown) => void;
  createEngine?: (options: PixelEngineOptions) => PixelEngine;
}

export interface UsePixelEngineResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  engine: PixelEngine | null;
  isReady: boolean;
}

/** Imperative handle exposed via `ref` on `PixelCanvas` (and `PixelSurface`). */
export interface PixelCanvasHandle {
  /** The active engine instance, or `null` before mount / after unmount. */
  getEngine: () => PixelEngine | null;
}

/** Imperative handle exposed via `ref` on `PixelGridCanvas`. */
export interface PixelGridCanvasHandle extends PixelCanvasHandle {
  getGrid: () => PixelGridEffect | null;
  triggerRipple: (x: number, y: number) => void;
  playMaskTimeline: () => void;
  pauseMaskTimeline: () => void;
  resetMaskTimeline: () => void;
}

export type PixelSurfaceHandle = PixelCanvasHandle;

/**
 * Imperative handle exposed via `ref` on `PixelCard`. Same shape as
 * `PixelGridCanvasHandle` regardless of `mode` — in `mode="plain"`, the
 * grid-specific methods are no-ops and `getGrid` returns `null`.
 */
export type PixelCardHandle = PixelGridCanvasHandle;

export interface CanvasAccessibilityProps {
  /**
   * Whether the rendered `<canvas>` is purely decorative (default `true`, matching the
   * common case for this engine — a visual background/effect with the real content, if
   * any, living in an overlay's `children`). When `true`, the canvas renders
   * `aria-hidden="true"` so assistive technology skips it entirely. Set to `false` when the
   * canvas itself is meaningful content, and pair it with `aria-label`/`aria-labelledby`.
   */
  decorative?: boolean;
  role?: React.AriaRole;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export interface PixelCanvasProps extends UsePixelEngineOptions, CanvasAccessibilityProps {
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
  onConfigWarning?: (warnings: string[]) => void;
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

export interface PixelGridCanvasProps
  extends UsePixelGridEffectOptions, CanvasAccessibilityProps {
  className?: string;
  style?: React.CSSProperties;
  /**
   * Convenience default for `prefers-reduced-motion: reduce` handling across all 3
   * independent switches this package exposes: `gridConfig.respectReducedMotion`,
   * `scrollReactive.respectReducedMotion`, and `sectionTransition.respectReducedMotion`
   * (each already defaults to `true` on its own). Set this once instead of all 3 — e.g.
   * `respectReducedMotion={false}` for a controlled demo that should ignore the OS
   * preference everywhere. Any of the 3 nested options can still override this on its own
   * surface by setting its own `respectReducedMotion` explicitly, which always wins.
   */
  respectReducedMotion?: boolean;
  scrollReactive?: ScrollReactiveGridOptions;
  sectionTransition?: SectionTransitionOptions;
  themeSync?: ThemeSyncOptions;
  statePreset?: StatePresetInput;
  debugHud?: DebugHudOptions;
  ssrPlaceholder?: SsrPlaceholderInput;
}
