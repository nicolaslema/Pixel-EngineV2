import { ImageMaskOptions } from "../../influences/Masks/ImageMaskInfluence";
import { TextMaskRevealOptions } from "../../influences/Masks/TextMaskInfluence";
import {
  OrganicNoiseFalloff,
  OrganicNoisePattern,
  OrganicNoisePosition
} from "../../influences/OrganicNoiseInfluence";
import { BlendMode } from "../../influences/Influence";

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
  /**
   * `"center"` (default) fixes the effect at the canvas center. `"follow-mouse"` recenters
   * it on the pointer every frame (read fresh, no caching -- same pattern as `HoverInfluence`),
   * turning it into an ambient "aura". Moot when `falloff` is `"none"` (no radial boundary
   * to recenter).
   */
  position?: OrganicNoisePosition;
  /**
   * `"radial"` (default): smoothstep falloff from the center out to `radius`, as before.
   * `"none"`: unbounded, full-canvas coverage -- an ambient background texture with no edge;
   * `radius` is ignored for the falloff shape (still fine to leave set, just unused for
   * bounding).
   */
  falloff?: OrganicNoiseFalloff;
  /**
   * Deterministic seed for the `perlin`/`cells`/`turbulence` patterns (`"waves"` has no seed
   * concept, unaffected). Default reproduces the original fixed output exactly.
   */
  seed?: number;
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
  /**
   * Overrides this mask's blend mode (default "max"/union) while it's active as part of a
   * combo step's `masks[]`. E.g. "multiply" gives an intersection look instead of a union.
   * Resets back to "max" whenever this mask is later resolved without an override, so it
   * never leaks onto an unrelated step reusing the same mask id.
   */
  blendMode?: BlendMode;
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

/**
 * A per-step combo entry -- a fresh object built for each step's `masks[]` (never the
 * shared/interned ResolvedMaskRef instance for a mask id), so `blendMode` can vary per step
 * without leaking onto other steps referencing the same mask id.
 */
export interface ResolvedMaskComboRef {
  id: string;
  type: PixelGridMaskType;
  blendMode?: BlendMode;
}

export interface ResolvedMaskTimelineStep {
  mask: InitialMask;
  maskRef: ResolvedMaskRef | null;
  /**
   * Present (non-empty) only for a step whose `masks` option resolved to at least one
   * mask -- absent/empty for every normal single-mask step. See MaskTimelineStepOptions.
   */
  maskRefs?: ResolvedMaskComboRef[];
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

export type WaveWobbleDirection = "horizontal" | "vertical" | "both";

export interface WaveWobbleEffectOptions {
  enabled?: boolean;
  amplitude?: number;
  frequency?: number;
  speed?: number;
  direction?: WaveWobbleDirection;
  scope?: PostEffectScope;
  activationThreshold?: number;
}

export interface CursorSpotlightEffectOptions {
  enabled?: boolean;
  radius?: number;
  falloff?: number;
  minOpacity?: number;
}

export interface ChromaticBreathingEffectOptions {
  enabled?: boolean;
  speed?: number;
  palette?: string[];
  scope?: PostEffectScope;
  activationThreshold?: number;
}

export type ScanLineDirection = "horizontal" | "vertical";

export interface ScanLineRevealEffectOptions {
  enabled?: boolean;
  direction?: ScanLineDirection;
  speed?: number;
  bandWidth?: number;
  loop?: boolean;
}

export interface MagneticTrailEffectOptions {
  enabled?: boolean;
  radius?: number;
  strength?: number;
  lifetimeMs?: number;
  maxPoints?: number;
  sampleIntervalMs?: number;
  scope?: PostEffectScope;
  activationThreshold?: number;
}

export interface GlitchRgbSplitEffectOptions {
  enabled?: boolean;
  radius?: number;
  jitterAmount?: number;
  durationMs?: number;
  maxBursts?: number;
  triggerMode?: ShockwaveTriggerMode;
  scope?: PostEffectScope;
  activationThreshold?: number;
}

export interface GravityFallApartEffectOptions {
  enabled?: boolean;
  gravity?: number;
  fallDurationMs?: number;
  activationThreshold?: number;
}

export interface ConstellationConnectEffectOptions {
  enabled?: boolean;
  radius?: number;
  linkDistance?: number;
  maxCandidates?: number;
  strength?: number;
  activationThreshold?: number;
}

export interface PixelGridEffectsOptions {
  paletteCycle?: PaletteCycleEffectOptions;
  dissolve?: PixelDissolveEffectOptions;
  shockwaveBurst?: ShockwaveBurstEffectOptions;
  waveWobble?: WaveWobbleEffectOptions;
  cursorSpotlight?: CursorSpotlightEffectOptions;
  chromaticBreathing?: ChromaticBreathingEffectOptions;
  scanLineReveal?: ScanLineRevealEffectOptions;
  magneticTrail?: MagneticTrailEffectOptions;
  glitchRgbSplit?: GlitchRgbSplitEffectOptions;
  gravityFallApart?: GravityFallApartEffectOptions;
  constellationConnect?: ConstellationConnectEffectOptions;
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

export interface ResolvedWaveWobbleEffectOptions {
  enabled: boolean;
  amplitude: number;
  frequency: number;
  speed: number;
  direction: WaveWobbleDirection;
  scope: PostEffectScope;
  activationThreshold: number;
}

export interface ResolvedCursorSpotlightEffectOptions {
  enabled: boolean;
  radius: number;
  falloff: number;
  minOpacity: number;
}

export interface ResolvedChromaticBreathingEffectOptions {
  enabled: boolean;
  speed: number;
  palette: string[];
  scope: PostEffectScope;
  activationThreshold: number;
}

export interface ResolvedScanLineRevealEffectOptions {
  enabled: boolean;
  direction: ScanLineDirection;
  speed: number;
  bandWidth: number;
  loop: boolean;
}

export interface ResolvedMagneticTrailEffectOptions {
  enabled: boolean;
  radius: number;
  strength: number;
  lifetimeMs: number;
  maxPoints: number;
  sampleIntervalMs: number;
  scope: PostEffectScope;
  activationThreshold: number;
}

export interface ResolvedGlitchRgbSplitEffectOptions {
  enabled: boolean;
  radius: number;
  jitterAmount: number;
  durationMs: number;
  maxBursts: number;
  triggerMode: ShockwaveTriggerMode;
  scope: PostEffectScope;
  activationThreshold: number;
}

export interface ResolvedGravityFallApartEffectOptions {
  enabled: boolean;
  gravity: number;
  fallDurationMs: number;
  activationThreshold: number;
}

export interface ResolvedConstellationConnectEffectOptions {
  enabled: boolean;
  radius: number;
  linkDistance: number;
  maxCandidates: number;
  strength: number;
  activationThreshold: number;
}

export interface ResolvedPixelGridEffectsOptions {
  paletteCycle: ResolvedPaletteCycleEffectOptions;
  dissolve: ResolvedPixelDissolveEffectOptions;
  shockwaveBurst: ResolvedShockwaveBurstEffectOptions;
  waveWobble: ResolvedWaveWobbleEffectOptions;
  cursorSpotlight: ResolvedCursorSpotlightEffectOptions;
  chromaticBreathing: ResolvedChromaticBreathingEffectOptions;
  scanLineReveal: ResolvedScanLineRevealEffectOptions;
  magneticTrail: ResolvedMagneticTrailEffectOptions;
  glitchRgbSplit: ResolvedGlitchRgbSplitEffectOptions;
  gravityFallApart: ResolvedGravityFallApartEffectOptions;
  constellationConnect: ResolvedConstellationConnectEffectOptions;
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
  reveal?: TextMaskRevealOptions;
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
  /**
   * Additional, independent organic-noise instances layered on top of the single
   * `organicNoise` slot above. Each entry defaults `enabled: true` (explicit array
   * membership already signals intent, unlike the legacy singular slot which defaults
   * `enabled: false`). The deprecated loose `organicRadius`/`organicStrength`/`organicSpeed`
   * fallback fields apply only to the singular `organicNoise` slot, never to entries here
   * (there is no legacy array form to fall back from).
   */
  organicNoises?: OrganicNoiseOptions[];

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
  organicNoiseLayers: Required<OrganicNoiseOptions>[];
  maskTimeline: ResolvedMaskTimelineOptions;
  performance: ResolvedPerformanceOptions;
  effects: ResolvedPixelGridEffectsOptions;
  initialMask: InitialMask;
  imageMasks: ResolvedPixelGridImageMaskConfig[];
  textMasks: ResolvedPixelGridTextMaskConfig[];
  warnings: string[];
}
