import { HoverShape } from "../../influences/HoverShape";
import { ImageMaskOptions } from "../../influences/Masks/ImageMaskInfluence";

export type HoverMode = "classic" | "reactive";
export type ReactiveHoverScope = "all" | "activeOnly" | "imageMask";
export type MagneticHoverMode = "attract" | "repel";
export type InitialMask = "image" | "text";
export type PixelGridDetailLevel = "low" | "medium" | "high";
export type MaskTimelineTransitionMode = "morph" | "fade" | "dissolve";
export type PixelGridMaskType = InitialMask;
export type PaletteCycleScope = "all" | "activeOnly";

export interface HoverMagneticOptions {
  enabled?: boolean;
  mode?: MagneticHoverMode;
  strength?: number;
  radius?: number;
}

export interface HoverEffectsOptions {
  mode?: HoverMode;
  radius?: number;
  strength?: number;
  interactionScope?: ReactiveHoverScope;
  deactivate?: number;
  displace?: number;
  jitter?: number;
  tintPalette?: string[];
  magnetic?: HoverMagneticOptions;
}

export interface ResolvedHoverMagneticOptions {
  enabled: boolean;
  mode: MagneticHoverMode;
  strength: number;
  radius: number;
}

export interface ResolvedHoverEffectsOptions {
  mode: HoverMode;
  radius: number;
  strength: number;
  interactionScope: ReactiveHoverScope;
  deactivate: number;
  displace: number;
  jitter: number;
  tintPalette: string[];
  magnetic: ResolvedHoverMagneticOptions;
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
  detail?: PixelGridDetailLevel;
  viewportCulling?: boolean;
  cullingPadding?: number;
  minRenderableSize?: number;
}

export interface PaletteCycleEffectOptions {
  enabled?: boolean;
  speed?: number;
  scope?: PaletteCycleScope;
  activationThreshold?: number;
  palette?: string[];
}

export interface PixelDissolveEffectOptions {
  enabled?: boolean;
  speed?: number;
  amount?: number;
  scope?: PaletteCycleScope;
  activationThreshold?: number;
}

export type ShockwaveTriggerMode = "pointerDown" | "hoverEnter" | "both";

export interface ShockwaveBurstEffectOptions {
  enabled?: boolean;
  speed?: number;
  strength?: number;
  thickness?: number;
  maxBursts?: number;
  triggerMode?: ShockwaveTriggerMode;
  activationThreshold?: number;
}

export interface PixelGridEffectsOptions {
  paletteCycle?: PaletteCycleEffectOptions;
  dissolve?: PixelDissolveEffectOptions;
  shockwaveBurst?: ShockwaveBurstEffectOptions;
}

export interface ResolvedPaletteCycleEffectOptions {
  enabled: boolean;
  speed: number;
  scope: PaletteCycleScope;
  activationThreshold: number;
  palette: string[];
}

export interface ResolvedPixelDissolveEffectOptions {
  enabled: boolean;
  speed: number;
  amount: number;
  scope: PaletteCycleScope;
  activationThreshold: number;
}

export interface ResolvedShockwaveBurstEffectOptions {
  enabled: boolean;
  speed: number;
  strength: number;
  thickness: number;
  maxBursts: number;
  triggerMode: ShockwaveTriggerMode;
  activationThreshold: number;
}

export interface ResolvedPixelGridEffectsOptions {
  paletteCycle: ResolvedPaletteCycleEffectOptions;
  dissolve: ResolvedPixelDissolveEffectOptions;
  shockwaveBurst: ResolvedShockwaveBurstEffectOptions;
}

export interface ResolvedPerformanceOptions {
  detail: PixelGridDetailLevel;
  viewportCulling: boolean;
  cullingPadding: number;
  minRenderableSize: number;
  maxRipplesCap: number;
  maxCellsCap: number;
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
  effects?: PixelGridEffectsOptions;

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
  colors: string[];
  gap: number;
  expandEase: number;
  breathSpeed: number;
  hoverEffects: ResolvedHoverEffectsOptions;
  rippleEffects: Required<RippleEffectsOptions>;
  breathing: Required<BreathingOptions>;
  autoMorph: Required<AutoMorphOptions>;
  maskTimeline: ResolvedMaskTimelineOptions;
  performance: ResolvedPerformanceOptions;
  effects: ResolvedPixelGridEffectsOptions;
  initialMask: InitialMask;
  imageMasks: ResolvedPixelGridImageMaskConfig[];
  textMasks: ResolvedPixelGridTextMaskConfig[];
  warnings: string[];
}
