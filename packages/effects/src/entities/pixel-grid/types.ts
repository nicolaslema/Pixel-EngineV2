import { ImageMaskOptions } from "../../influences/Masks/ImageMaskInfluence";
import { OrganicNoisePattern } from "../../influences/OrganicNoiseInfluence";

export type HoverMode = "classic" | "reactive";
export type ReactiveHoverScope = "all" | "activeOnly" | "imageMask";
export type MagneticHoverMode = "attract" | "repel";
export type InitialMask = "image" | "text";
export type PixelGridDetailLevel = "low" | "medium" | "high";
export type MaskTimelineTransitionMode = "morph" | "fade" | "dissolve";
export type PixelGridMaskType = InitialMask;
export type PostEffectScope = "all" | "activeOnly";

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
  /**
   * Radius at which a ripple dies. Omit to derive it from canvas size at construction time
   * (`max(width, height) * 1.2`, the historical default) -- set explicitly for a ripple
   * that stays contained regardless of canvas size.
   */
  maxRadius?: number;
}

export interface BreathingOptions {
  enabled?: boolean;
  speed?: number;
  radius?: number;
  radiusY?: number;
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

export interface OrganicNoiseOptions {
  /**
   * A second, independent way to turn organic noise on, OR'd with
   * `PixelGridInfluenceOptions.organic` -- either one being true enables it.
   */
  enabled?: boolean;
  radius?: number;
  strength?: number;
  speed?: number;
  /** Noise algorithm. Default `"waves"` (the original, always-available pattern). */
  pattern?: OrganicNoisePattern;
  /** Grain-size multiplier for the spatial frequency. Smaller = bigger blobs, larger = finer/more granular noise. Default `1`. */
  scale?: number;
}

export interface MaskTimelineTransitionOptions {
  mode?: MaskTimelineTransitionMode;
  durationMs?: number;
  seed?: number;
}

export interface MaskTimelineStepMaskRefOptions {
  mask?: InitialMask;
  assetId?: string;
  maskId?: string;
  maskType?: InitialMask;
}

export interface MaskTimelineStepOptions {
  mask?: InitialMask;
  assetId?: string;
  maskId?: string;
  maskType?: InitialMask;
  /**
   * Activates up to one image + one text mask simultaneously for this step (e.g. text
   * superimposed over an image), blended via the existing "max" (union) blend mode --
   * no InfluenceManager changes needed. Transitions (morph/fade/dissolve) into or out of
   * a step using `masks` always hard-cut; only single-mask-to-single-mask steps support
   * animated transitions. At most one entry per type (image/text) is honored -- extras
   * are dropped with a warning.
   */
  masks?: MaskTimelineStepMaskRefOptions[];
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
  /**
   * Present (non-empty) only for a step whose `masks` option resolved to at least one
   * mask -- absent/empty for every normal single-mask step. See MaskTimelineStepOptions.
   */
  maskRefs?: ResolvedMaskRef[];
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
  scope?: PostEffectScope;
  activationThreshold?: number;
  palette?: string[];
}

export interface PixelDissolveEffectOptions {
  enabled?: boolean;
  speed?: number;
  amount?: number;
  scope?: PostEffectScope;
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
  scope?: PostEffectScope;
}

export interface PixelGridEffectsOptions {
  paletteCycle?: PaletteCycleEffectOptions;
  dissolve?: PixelDissolveEffectOptions;
  shockwaveBurst?: ShockwaveBurstEffectOptions;
}

export interface ResolvedPaletteCycleEffectOptions {
  enabled: boolean;
  speed: number;
  scope: PostEffectScope;
  activationThreshold: number;
  palette: string[];
}

export interface ResolvedPixelDissolveEffectOptions {
  enabled: boolean;
  speed: number;
  amount: number;
  scope: PostEffectScope;
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
  scope: PostEffectScope;
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

export interface PixelGridMaskErrorEvent {
  maskId: string;
  src: string;
  reason: string;
}

export interface PixelGridConfig {
  colors: string[];
  gap: number;
  expandEase: number;
  breathSpeed: number;
  canvasBackground?: string | null;
  /**
   * Whether breathing/ripple/magnetic-hover/jitter motion should be disabled when the
   * user's OS/browser signals `prefers-reduced-motion: reduce`. Default true.
   */
  respectReducedMotion?: boolean;

  /** @deprecated Use `organicNoise.radius` instead. */
  organicRadius?: number;
  /** @deprecated Use `organicNoise.strength` instead. */
  organicStrength?: number;
  /** @deprecated Use `organicNoise.speed` instead. */
  organicSpeed?: number;

  hoverEffects?: HoverEffectsOptions;
  rippleEffects?: RippleEffectsOptions;
  breathing?: BreathingOptions;
  autoMorph?: AutoMorphOptions;
  maskTimeline?: MaskTimelineOptions;
  performance?: PerformanceOptions;
  effects?: PixelGridEffectsOptions;
  organicNoise?: OrganicNoiseOptions;

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
  respectReducedMotion: boolean;
  hoverEffects: ResolvedHoverEffectsOptions;
  rippleEffects: Required<Omit<RippleEffectsOptions, "maxRadius">> & { maxRadius?: number };
  breathing: Required<BreathingOptions>;
  autoMorph: Required<AutoMorphOptions>;
  organicNoise: Required<OrganicNoiseOptions>;
  maskTimeline: ResolvedMaskTimelineOptions;
  performance: ResolvedPerformanceOptions;
  effects: ResolvedPixelGridEffectsOptions;
  initialMask: InitialMask;
  imageMasks: ResolvedPixelGridImageMaskConfig[];
  textMasks: ResolvedPixelGridTextMaskConfig[];
  warnings: string[];
}
