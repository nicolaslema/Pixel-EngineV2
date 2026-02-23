import { HoverShape } from "../../influences/HoverShape";
import { ImageMaskOptions } from "../../influences/Masks/ImageMaskInfluence";

export type HoverMode = "classic" | "reactive";
export type ReactiveHoverScope = "all" | "activeOnly" | "imageMask";
export type InitialMask = "image" | "text";
export type PixelGridQualityLevel = "low" | "medium" | "high";
export type MaskTimelineTransitionMode = "morph" | "fade" | "dissolve";
export type PixelGridMaskType = InitialMask;

export interface HoverEffectsOptions {
  mode?: HoverMode;
  radius?: number;
  radiusY?: number;
  shape?: HoverShape;
  strength?: number;
  interactionScope?: ReactiveHoverScope;
  deactivate?: number;
  displace?: number;
  jitter?: number;
  tintPalette?: string[];
}

export interface RippleEffectsOptions {
  speed?: number;
  thickness?: number;
  strength?: number;
  maxRipples?: number;
  enabled?: boolean;
  deactivateMultiplier?: number;
  displaceMultiplier?: number;
  jitterMultiplier?: number;
  tintPalette?: string[];
}

export interface BreathingOptions {
  enabled?: boolean;
  speed?: number;
  radius?: number;
  radiusY?: number;
  shape?: HoverShape;
  strength?: number;
  minOpacity?: number;
  maxOpacity?: number;
  affectHover?: boolean;
  affectImage?: boolean;
  affectText?: boolean;
}

export interface AutoMorphOptions {
  enabled?: boolean;
  holdImageMs?: number;
  holdTextMs?: number;
  morphDurationMs?: number;
  intervalMs?: number;
}

export interface MaskTimelineTransitionOptions {
  mode?: MaskTimelineTransitionMode;
  durationMs?: number;
  seed?: number;
}

export interface MaskTimelineStepOptions {
  mask?: InitialMask;
  assetId?: string;
  maskId?: string;
  maskType?: InitialMask;
  holdMs?: number;
  mode?: MaskTimelineTransitionMode;
  durationMs?: number;
  transition?: MaskTimelineTransitionOptions;
}

export interface MaskTimelineTextItemOptions extends PixelGridTextMaskConfig {
  type: "text";
}

export interface MaskTimelineImageItemOptions extends PixelGridImageMaskConfig {
  type: "image";
}

export type MaskTimelineItemOptions =
  | MaskTimelineTextItemOptions
  | MaskTimelineImageItemOptions;

export interface MaskTimelineOptions {
  enabled?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  initialStep?: number;
  defaultHoldMs?: number;
  defaultTransition?: MaskTimelineTransitionOptions;
  items?: MaskTimelineItemOptions[];
  steps?: MaskTimelineStepOptions[];
}

export interface ResolvedMaskTimelineTransition {
  mode: MaskTimelineTransitionMode;
  durationMs: number;
  seed: number;
}

export interface ResolvedMaskRef {
  id: string;
  type: PixelGridMaskType;
}

export interface ResolvedMaskTimelineStep {
  mask: InitialMask;
  maskRef: ResolvedMaskRef | null;
  holdMs: number;
  transition: ResolvedMaskTimelineTransition;
}

export interface ResolvedMaskTimelineOptions {
  enabled: boolean;
  autoplay: boolean;
  loop: boolean;
  initialStep: number;
  steps: ResolvedMaskTimelineStep[];
}

export interface PerformanceOptions {
  quality?: PixelGridQualityLevel;
  viewportCulling?: boolean;
  cullingPadding?: number;
  minRenderableSize?: number;
}

export interface ResolvedPerformanceOptions {
  quality: PixelGridQualityLevel;
  viewportCulling: boolean;
  cullingPadding: number;
  minRenderableSize: number;
  maxRipplesCap: number;
}

export interface PixelGridTextMaskConfig {
  id?: string;
  text?: string;
  centerX?: number;
  centerY?: number;
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  strength?: number;
  blurRadius?: number;
}

export interface PixelGridImageMaskConfig extends ImageMaskOptions {
  id?: string;
  src?: string;
  centerX?: number;
  centerY?: number;
}

export interface ResolvedPixelGridTextMaskConfig extends PixelGridTextMaskConfig {
  id: string;
  text: string;
  font: string;
}

export interface ResolvedPixelGridImageMaskConfig extends PixelGridImageMaskConfig {
  id: string;
  src: string;
}

export interface PixelGridConfig {
  colors: string[];
  gap: number;
  expandEase: number;
  breathSpeed: number;
  canvasBackground?: string | null;

  organicRadius?: number;
  organicStrength?: number;
  organicSpeed?: number;

  hoverEffects?: HoverEffectsOptions;
  rippleEffects?: RippleEffectsOptions;
  breathing?: BreathingOptions;
  autoMorph?: AutoMorphOptions;
  maskTimeline?: MaskTimelineOptions;
  performance?: PerformanceOptions;

  imageMask?: PixelGridImageMaskConfig;
  textMask?: PixelGridTextMaskConfig;
  imageMasks?: PixelGridImageMaskConfig[];
  textMasks?: PixelGridTextMaskConfig[];
  initialMask?: InitialMask;
}

export interface PixelGridInfluenceOptions {
  ripple?: boolean;
  hover?: boolean;
  organic?: boolean;
}

export interface ResolvedPixelGridConfig {
  hoverEffects: Required<HoverEffectsOptions>;
  rippleEffects: Required<RippleEffectsOptions>;
  breathing: Required<BreathingOptions>;
  autoMorph: Required<AutoMorphOptions>;
  maskTimeline: ResolvedMaskTimelineOptions;
  performance: ResolvedPerformanceOptions;
  initialMask: InitialMask;
  imageMasks: ResolvedPixelGridImageMaskConfig[];
  textMasks: ResolvedPixelGridTextMaskConfig[];
  warnings: string[];
}
