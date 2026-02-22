import { HoverShape } from "../../influences/HoverShape";
import { TextMaskOptions } from "../../influences/Masks/TextMaskInfluence";
import { ImageMaskOptions } from "../../influences/Masks/ImageMaskInfluence";

export type HoverMode = "classic" | "reactive";
export type ReactiveHoverScope = "all" | "activeOnly" | "imageMask";
export type InitialMask = "image" | "text";
export type PixelGridQualityLevel = "low" | "medium" | "high";

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

export interface PixelGridTextMaskConfig extends TextMaskOptions {
  text?: string;
  centerX?: number;
  centerY?: number;
}

export interface PixelGridImageMaskConfig extends ImageMaskOptions {
  src?: string;
  centerX?: number;
  centerY?: number;
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
  performance?: PerformanceOptions;

  imageMask?: PixelGridImageMaskConfig;
  textMask?: PixelGridTextMaskConfig;
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
  performance: ResolvedPerformanceOptions;
  initialMask: InitialMask;
}
