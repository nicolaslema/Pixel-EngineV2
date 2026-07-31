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

/** Only relevant when `fitMode="client"`: how the canvas tracks its container's size. `"observer"` (default) uses a `ResizeObserver`; `"window"` listens to the window `resize` event; `"none"` measures once and never re-syncs. */
export type ResizeMode = "observer" | "window" | "none";
/** `"none"` (default): fixed pixel size from `width`/`height`, applied once at mount. `"client"`: measures the canvas's own `clientWidth`/`clientHeight` instead, kept in sync via `resizeMode`. Required for a responsive canvas -- see the `fitMode` note in API.md. */
export type FitMode = "none" | "client";
/** Built-in DOM event that triggers a ripple. `"none"` disables the built-in trigger entirely (still triggerable manually via the imperative handle). */
export type RippleTriggerMode = "click" | "pointerdown" | "none";
/** `PixelSurface`/`PixelCard` overlay interaction mode. Any standard CSS `pointer-events` value, plus `"hybrid"`: overlay pointer events are redispatched onto the canvas as real `PointerEvent`s, so canvas hover/ripple/tint keep working while the pointer is over interactive overlay content. */
export type OverlayPointerEventsMode = React.CSSProperties["pointerEvents"] | "hybrid";
export type PixelGridPresetName = "minimal" | "card-soft" | "card-ripple" | "hero-image";
/** How well a preset supports a `mask` — `"recommended"` (e.g. `hero-image`, mask-oriented by design), `"optional"` (works with or without one), or `"none"`. */
export type PixelGridPresetMaskSupport = "none" | "optional" | "recommended";
export type ScrollReactiveDirection = "up" | "down" | "both";
/** Where scroll-triggered ripples originate on the canvas: `"leading"` (the edge scroll is moving toward), `"trailing"`, or `"center"`. */
export type ScrollReactiveEdge = "leading" | "trailing" | "center";
export type SectionTransitionPresetName = "fade" | "lift" | "zoom";
/** `"light"`/`"dark"` apply a built-in neutral palette; `"brand"` applies `brandColors`/`brandCanvasBackground`/`brandHoverTintPalette`/`brandRippleTintPalette`. */
export type ThemeSyncMode = "light" | "dark" | "brand";
export type StatePresetName = "idle" | "hover" | "active" | "success" | "error" | "loading";
export type DebugHudPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type SsrPlaceholderPresetName = "minimal" | "card-soft" | "hero-image";

/** Static metadata about a built-in preset, as returned by `getPixelPresetDefinition`/`listPixelPresets`. */
export interface PixelGridPresetDefinition {
  name: PixelGridPresetName;
  description: string;
  recommendedFor: string;
  maskSupport: PixelGridPresetMaskSupport;
}

/** Payload passed to `onHoverStart`/`onHoverEnd`/`onRipple` callbacks. */
export interface PixelPointerEventPayload {
  /** Pointer position in canvas coordinates. */
  x: number;
  /** Pointer position in canvas coordinates. */
  y: number;
  /** The original DOM event that triggered this callback. */
  nativeEvent: MouseEvent | PointerEvent;
}

/** Triggers ripple bursts in response to scroll/wheel gestures. Listens on `source` (a scrollable container, `window`, or auto-detected nearest scrollable ancestor). Disabled by default. */
export interface ScrollReactiveGridOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Scales gesture velocity into ripple count/spread. Clamped to `[0, 4]`. Default `1`. */
  intensity?: number;
  /** Which scroll direction(s) trigger ripples. Default `"both"`. */
  direction?: ScrollReactiveDirection;
  /** Where the ripple burst originates vertically on the canvas. Default `"leading"`. */
  edge?: ScrollReactiveEdge;
  /** Scroll listener target. `"auto"` (default) finds the nearest scrollable ancestor, falling back to `window`. `"window"` always uses the window. A ref or direct element listens on that element specifically. */
  source?: "auto" | "window" | HTMLElement | React.RefObject<HTMLElement | null>;
  /** Minimum time between ripple bursts. Clamped to `[0, 2000]`. Default `90`. */
  cooldownMs?: number;
  /** Cap on ripples spawned per burst, reached at full gesture intensity. Default `3`. */
  maxBurstRipples?: number;
  /** Whether this feature is disabled entirely under `prefers-reduced-motion: reduce`. Default `true`. */
  respectReducedMotion?: boolean;
}

/** Fades/lifts/zooms the canvas in via an `IntersectionObserver` as it enters the viewport, optionally also triggering a ripple/mask-timeline play on first entry. Disabled by default. */
export interface SectionTransitionOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Visual transition style applied via CSS (see `buildSectionTransitionStyle`). Default `"fade"`. */
  preset?: SectionTransitionPresetName;
  /** Transition magnitude in px (used by the `"lift"`/`"zoom"` presets). Clamped to `[0, 120]`. Default `24`. */
  amount?: number;
  /** `IntersectionObserver` threshold(s) driving the transition's progress granularity. Default `[0, 0.15, 0.35, 0.55, 0.75, 1]`. */
  threshold?: number | number[];
  /** When `true`, the transition plays once and then stops observing (no reverse/exit transition on scroll away). Default `false`. */
  once?: boolean;
  /** Whether entering the viewport also triggers a centered ripple. Default `true`. */
  rippleOnEnter?: boolean;
  /** Whether entering the viewport also calls `playMaskTimeline()`. Default `true`. */
  playTimelineOnEnter?: boolean;
  /** Whether leaving the viewport calls `pauseMaskTimeline()`. Default `false`. */
  pauseTimelineOnExit?: boolean;
  /** Whether this feature is disabled entirely under `prefers-reduced-motion: reduce`. Default `true`. */
  respectReducedMotion?: boolean;
}

/** Overrides `gridConfig` colors/tints to match a light/dark/brand theme. Disabled by default. */
export interface ThemeSyncOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Default `"dark"`. Ignored (fixed to whatever the OS/browser reports) when `followSystem` is `true` and `mode` isn't `"brand"`. */
  mode?: ThemeSyncMode;
  /** When `true` and `mode` isn't `"brand"`, tracks `prefers-color-scheme` live instead of using the fixed `mode` value. Default `true`. */
  followSystem?: boolean;
  /** `mode: "brand"` only. Default `["#0f766e", "#14b8a6", "#2dd4bf"]`. */
  brandColors?: string[];
  /** `mode: "brand"` only. Default `"#0b1220"`. */
  brandCanvasBackground?: string;
  /** `mode: "brand"` only. Default `["#5eead4", "#99f6e4", "#ccfbf1"]`. */
  brandHoverTintPalette?: string[];
  /** `mode: "brand"` only. Default `["#2dd4bf", "#5eead4", "#99f6e4"]`. */
  brandRippleTintPalette?: string[];
}

export interface StatePresetOptions {
  /** `false` clears any active state preset override entirely. Default `true` (i.e. present-but-unset means "on"). */
  enabled?: boolean;
  /** Which named state's `gridConfig` overrides to apply. Default `"idle"`. */
  value?: StatePresetName;
}

/** Shorthand form: a bare preset name is equivalent to `{ enabled: true, value: name }`. */
export type StatePresetInput = StatePresetName | StatePresetOptions;

/** Fixed-position debug overlay (fps/quality/cells/ripples/timeline), portaled to `document.body`. Disabled by default. */
export interface DebugHudOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Default `"top-left"`. */
  position?: DebugHudPosition;
  /** How often the HUD text refreshes. Clamped to `[16, 2000]`. Default `200`. */
  updateIntervalMs?: number;
  /** Horizontal offset from the chosen corner, px. Default `10`. */
  offsetX?: number;
  /** Vertical offset from the chosen corner, px. Default `10`. */
  offsetY?: number;
  /** Default `true`. */
  showFps?: boolean;
  /** Default `true`. */
  showQuality?: boolean;
  /** Default `false`. */
  showLoop?: boolean;
  /** Default `true`. */
  showCells?: boolean;
  /** Default `true`. */
  showRipples?: boolean;
  /** Default `true`. */
  showTimeline?: boolean;
}

/** A static background shown before the engine is ready (e.g. during SSR/hydration or initial mount). Disabled by default. */
export interface SsrPlaceholderOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Which built-in placeholder look to use. Default `"minimal"`. */
  preset?: SsrPlaceholderPresetName;
  /** Whether the placeholder style stops applying once the engine reports ready. Default depends on the component. */
  hideOnReady?: boolean;
  /** Merged on top of the chosen preset's style. */
  style?: React.CSSProperties;
}

/** Shorthand form: a bare preset name is equivalent to `{ enabled: true, preset: name }`. */
export type SsrPlaceholderInput = SsrPlaceholderPresetName | SsrPlaceholderOptions;
export type CmsPixelConfigSchemaVersion = "1.0";

/** JSON-serializable document shape accepted by `loadPixelConfigFromJson`/`validatePixelConfigDocument` -- mirrors `PixelGridCanvasProps`' declarative options for CMS-driven configs. */
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

/** Result of `validatePixelConfigDocument`/`loadPixelConfigFromJson`. */
export interface CmsPixelConfigValidationResult {
  /** `true` only if there are no `errors` (there may still be non-fatal `warnings`). */
  ok: boolean;
  /** Fatal problems (e.g. unsupported `schemaVersion`) -- `value` should not be trusted when this is non-empty. */
  errors: string[];
  /** Non-fatal issues (e.g. an unknown top-level key) that didn't block validation. */
  warnings: string[];
  /** The validated (and fallback-merged, if a fallback was provided) document. Present even alongside `errors` in some cases -- always check `ok` first. */
  value?: CmsPixelConfigDocumentV1;
}

export interface UsePixelEngineOptions {
  width: number;
  height: number;
  /** Whether the engine starts its render loop automatically on mount, vs. waiting for a manual `engine.start()`. Default `true`. */
  autoStart?: boolean;
  /** Runtime scheduling profile (`fixedTimeStep`/`maxDelta`/`maxUpdatesPerFrame` defaults). Default `"medium"`. */
  quality?: QualityLevel;
  /** Explicit fixed-step tuning, overriding `quality`'s defaults for any field set here. */
  loop?: PixelEngineOptions["loop"];
  /** Canvas clear color per frame. `null` for a transparent canvas. */
  clearColor?: string | null;
  /** Overrides the detected `window.devicePixelRatio` for rendering resolution. */
  devicePixelRatio?: number;
  /** Only relevant when `fitMode="client"`. Default `"observer"`. */
  resizeMode?: ResizeMode;
  /** Default `"none"` (fixed pixel size). Set `"client"` for a responsive canvas -- see the `FitMode` type doc. */
  fitMode?: FitMode;
  /** Called once the engine has been constructed and (if `autoStart`) started. */
  onReady?: (engine: PixelEngine) => void;
  /** Called on unmount, right before the engine instance is torn down. */
  onDestroy?: (engine: PixelEngine) => void;
  onHoverStart?: (event: PixelPointerEventPayload) => void;
  onHoverEnd?: (event: PixelPointerEventPayload) => void;
  /**
   * Called if `PixelEngine` construction throws (e.g. `canvas.getContext("2d")` returns
   * `null`). The error is caught internally so it never crashes past the component
   * (`isReady` stays `false`, `onReady`/`autoStart` are skipped) -- this is your only signal
   * construction failed. Does not cover errors thrown from your own `onReady`/`onDestroy`/
   * render code; use a React error boundary for those.
   */
  onEngineError?: (error: unknown) => void;
  /** Custom engine factory, for tests or a non-default runtime. Defaults to `new PixelEngine(options)`. */
  createEngine?: (options: PixelEngineOptions) => PixelEngine;
}

export interface UsePixelEngineResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** `null` before mount / after unmount, or if construction failed (see `onEngineError`). */
  engine: PixelEngine | null;
  /** `true` once the engine has been constructed (and started, if `autoStart`). */
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
  /** Forwarded to the canvas element's `role` attribute. */
  role?: React.AriaRole;
  /** Forwarded to the canvas element -- required for a real accessible name when `decorative={false}`. */
  "aria-label"?: string;
  /** Forwarded to the canvas element -- alternative to `aria-label` when the name lives elsewhere in the DOM. */
  "aria-labelledby"?: string;
  /** Forwarded to the canvas element. */
  "aria-describedby"?: string;
}

export interface PixelCanvasProps extends UsePixelEngineOptions, CanvasAccessibilityProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Declarative text mask, as passed to the `mask` prop. */
export interface TextMaskInput extends PixelGridTextMaskConfig {
  type: "text";
  text: string;
}

/** Declarative image mask, as passed to the `mask` prop. */
export interface ImageMaskInput extends PixelGridImageMaskConfig {
  type: "image";
  src: string;
}

/** Declarative combined text+image mask config, for a `mask` prop that also wants a `maskTimeline` and/or multiple named assets. */
export interface HybridMaskInput {
  type: "hybrid";
  /** A single named text mask, shorthand for a one-entry `texts[]`. */
  text?: Omit<TextMaskInput, "type">;
  /** A single named image mask, shorthand for a one-entry `images[]`. */
  image?: Omit<ImageMaskInput, "type">;
  texts?: Array<Omit<TextMaskInput, "type">>;
  images?: Array<Omit<ImageMaskInput, "type">>;
  /** Named mask assets referenced from `steps[]` by `assetId` -- forwarded straight to `gridConfig.maskTimeline.items`. */
  items?: NonNullable<PixelGridConfig["maskTimeline"]>["items"];
  /** Explicit timeline step sequence -- forwarded straight to `gridConfig.maskTimeline.steps`. */
  steps?: NonNullable<PixelGridConfig["maskTimeline"]>["steps"];
  initialMask?: InitialMask;
  autoMorph?: PixelGridConfig["autoMorph"];
  /** Timeline-level controls (`enabled`/`autoplay`/`loop`/`initialStep`/`defaultHoldMs`/`defaultTransition`) -- merged with `items`/`steps` above. */
  maskTimeline?: PixelGridConfig["maskTimeline"];
}

export type PixelGridMaskInput = TextMaskInput | ImageMaskInput | HybridMaskInput;

export interface UsePixelGridEffectOptions extends UsePixelEngineOptions {
  /** Manual config overrides, merged on top of `preset` (if given). */
  gridConfig?: Partial<PixelGridConfig>;
  /** Declarative base config. Optional when `gridConfig` alone is sufficient. */
  preset?: PixelGridPresetName;
  /** Declarative text/image/hybrid mask input, merged into the resolved `gridConfig`. */
  mask?: PixelGridMaskInput;
  /** Enable/disable the 3 influence groups (`ripple`/`hover`/`organic`) -- see the `influenceOptions` reference in API.md. Default `{ ripple: true, hover: true, organic: false }`. */
  influenceOptions?: PixelGridInfluenceOptions;
  /** Additional explicit remount key -- the effect is already recreated automatically when resolved `gridConfig`/`influenceOptions` change; use this for an extra forced-reset boundary. */
  effectKey?: string | number;
  /** Effect footprint override, independent of the canvas's own `width`. Defaults to `width`. */
  gridWidth?: number;
  /** Effect footprint override, independent of the canvas's own `height`. Defaults to `height`. */
  gridHeight?: number;
  /** Whether the effect is automatically added to / removed from the engine's scene on mount/unmount. Default `true`. */
  autoAttach?: boolean;
  /** Built-in DOM event that triggers a ripple at the pointer position. Default `"click"`. */
  rippleTrigger?: RippleTriggerMode;
  /** Called once the `PixelGridEffect` instance has been created and attached. */
  onGridReady?: (effect: PixelGridEffect, engine: PixelEngine) => void;
  onRipple?: (event: PixelPointerEventPayload) => void;
  onMaskError?: (event: PixelGridMaskErrorEvent) => void;
  /** Fired once per resolved-config recomputation that produced one or more dev warnings (the same messages `console.warn` would print). Not called when the resolved config is warning-free. */
  onConfigWarning?: (warnings: string[]) => void;
  /** Custom effect factory, for tests or a non-default `PixelGridEffect` subclass. Defaults to `new PixelGridEffect(...)`. */
  createGridEffect?: (
    engine: PixelEngine,
    width: number,
    height: number,
    config: PixelGridConfig,
    influenceOptions?: PixelGridInfluenceOptions
  ) => PixelGridEffect;
}

export interface UsePixelGridEffectResult extends UsePixelEngineResult {
  /** `null` before mount / after unmount, or before the resolved config is ready. */
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
  /** Triggers ripple bursts in response to scroll/wheel gestures. See `ScrollReactiveGridOptions`. */
  scrollReactive?: ScrollReactiveGridOptions;
  /** Fades/lifts/zooms the canvas in as it enters the viewport. See `SectionTransitionOptions`. */
  sectionTransition?: SectionTransitionOptions;
  /** Syncs `gridConfig` colors/tints to a light/dark/brand theme. See `ThemeSyncOptions`. */
  themeSync?: ThemeSyncOptions;
  /** Applies a named `gridConfig` override for a UI state (e.g. `"success"`, `"loading"`). See `StatePresetOptions`. */
  statePreset?: StatePresetInput;
  /** Fixed-position fps/quality/cells/ripples/timeline overlay. See `DebugHudOptions`. */
  debugHud?: DebugHudOptions;
  /** Static background shown before the engine is ready (SSR/hydration/initial mount). See `SsrPlaceholderOptions`. */
  ssrPlaceholder?: SsrPlaceholderInput;
}
