import { ImageMaskOptions } from "../../influences/Masks/ImageMaskInfluence";
import { TextMaskRevealOptions } from "../../influences/Masks/TextMaskInfluence";
import {
  OrganicNoiseFalloff,
  OrganicNoisePattern,
  OrganicNoisePosition
} from "../../influences/OrganicNoiseInfluence";
import { BlendMode } from "../../influences/Influence";

/** `"classic"` (default): a single always-on hover `Influence`. `"reactive"`: adds `deactivate`/`displace`/`jitter`/tint on top, gated by `interactionScope`. */
export type HoverMode = "classic" | "reactive";
/** Which cells `mode: "reactive"` reacts on. `"imageMask"` (default): only cells inside the active image mask. `"all"`: every cell. `"activeOnly"`: only cells already active (e.g. inside any mask/ripple). */
export type ReactiveHoverScope = "all" | "activeOnly" | "imageMask";
/** `"attract"` (default) pulls cells toward the pointer; `"repel"` pushes them away. */
export type MagneticHoverMode = "attract" | "repel";
export type InitialMask = "image" | "text";
/** `performance.detail` tier — selects the viewportCulling/cullingPadding/minRenderableSize/maxRipplesCap/maxCellsCap defaults. Default `"medium"`. */
export type PixelGridDetailLevel = "low" | "medium" | "high";
/** Mask timeline step transition: `"morph"` interpolates the mask weight fields, `"fade"` cross-fades opacity, `"dissolve"` randomizes the swap order per cell. */
export type MaskTimelineTransitionMode = "morph" | "fade" | "dissolve";
export type PixelGridMaskType = InitialMask;
/** Which cells a post-effect (`PixelGridEffectsOptions`) applies to. `"activeOnly"` (the common default) skips cells at/under `activationThreshold`; `"all"` applies to every cell regardless. */
export type PostEffectScope = "all" | "activeOnly";

/**
 * Independent, additive pull layered on top of `HoverEffectsOptions` -- not mutually
 * exclusive with `mode: "reactive"` (both write into the same per-cell offset). Disabled
 * (`enabled: false`) by default; `strength`/`radius` are fully independent of
 * `hoverEffects.strength`/`hoverEffects.radius`.
 */
export interface HoverMagneticOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Default `"attract"`. */
  mode?: MagneticHoverMode;
  /** Pull magnitude. Clamped to `[0, 2.5]`. Default `1` (clamp fallback). */
  strength?: number;
  /** Reach, independent of `hoverEffects.radius` -- may be set larger or smaller with no interaction between the two. Clamped to at least `0.1`. Default `hoverEffects.radius` (120 if that's also unset). */
  radius?: number;
}

/** Hover interaction config -- the only switch that turns this on/off is `PixelGridInfluenceOptions.hover` (this type has no `enabled` field of its own). */
export interface HoverEffectsOptions {
  /** Default `"classic"`. */
  mode?: HoverMode;
  /** Single circular radius (no `radiusY`). Default `120`. */
  radius?: number;
  /** Default `1`. */
  strength?: number;
  /** Only read in `mode: "reactive"`. Default `"imageMask"`. */
  interactionScope?: ReactiveHoverScope;
  /** `mode: "reactive"` only: how strongly hovered cells shrink/deactivate. Default `0.8`. */
  deactivate?: number;
  /** `mode: "reactive"` only: outward push magnitude, away from the cursor. Default `3`. */
  displace?: number;
  /** `mode: "reactive"` only: random per-cell wobble magnitude. Default `1.25`. */
  jitter?: number;
  /** `mode: "reactive"` only: colors cycled through for hovered cells. Default `[]` (no tint). */
  tintPalette?: string[];
  /** Independent magnetic pull layered on top -- see `HoverMagneticOptions`. */
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

/**
 * Reactive (automatic, on-hover/click) ripple config. `enabled` here only gates the
 * automatic reactive-ripple-on-interaction pass -- it's a narrower scope than
 * `PixelGridInfluenceOptions.ripple`, the master switch that also blocks manual
 * `triggerRipple()` calls. See the `influenceOptions` reference in API.md.
 */
export interface RippleEffectsOptions {
  /** Expansion speed. Default `0.5`. */
  speed?: number;
  /** Ring thickness in px. Default `50`. */
  thickness?: number;
  /** Peak size boost applied to cells inside the ring. Default `30`. */
  strength?: number;
  /** Cap on simultaneous ripples (oldest recycled once exceeded). Default `20`. */
  maxRipples?: number;
  /** Whether the automatic reactive-ripple-on-interaction pass is active. Default `true`. */
  enabled?: boolean;
  /** Multiplier on how strongly a ripple deactivates/shrinks cells it passes through. Default `1`. */
  deactivateMultiplier?: number;
  /** Multiplier on the outward displacement a ripple applies to cells it passes through. Default `1`. */
  displaceMultiplier?: number;
  /** Multiplier on the random jitter a ripple applies to cells it passes through. Default `1`. */
  jitterMultiplier?: number;
  /** Colors cycled through for cells inside an active ripple. Default `[]` (no tint). */
  tintPalette?: string[];
  /**
   * Radius at which a ripple dies. Omit to derive it from canvas size at construction time
   * (`max(width, height) * 1.2`, the historical default) -- set explicitly for a ripple
   * that stays contained regardless of canvas size.
   */
  maxRadius?: number;
}

/** Ambient per-cell opacity oscillation (a sine wave, phase/offset randomized once per cell at grid creation). Disabled by default. */
export interface BreathingOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Oscillation speed. Default `1`. */
  speed?: number;
  /** Horizontal radius of cells affected. Default `hoverEffects.radius`. */
  radius?: number;
  /** Vertical radius, independent of `radius`. Default `radius` (or `hoverEffects.radius` if both are unset). */
  radiusY?: number;
  /** Oscillation amplitude. Default `0.9`. */
  strength?: number;
  /** Opacity floor of the oscillation. Default `0.55`. Swapped with `maxOpacity` (with a warning) if it ends up greater. */
  minOpacity?: number;
  /** Opacity ceiling of the oscillation. Default `1`. */
  maxOpacity?: number;
  /** Whether breathing also affects cells already active from hover. Default `true`. */
  affectHover?: boolean;
  /** Whether breathing also affects cells active from an image mask. Default `true`. */
  affectImage?: boolean;
  /** Whether breathing also affects cells active from a text mask. Default `true`. */
  affectText?: boolean;
}

/** Legacy auto-cycling between the first image and first text mask. Prefer the declarative `maskTimeline` for anything beyond a simple two-asset loop -- when both are set, `maskTimeline` takes precedence (this only supplies the fallback source steps used when neither `maskTimeline.steps` nor mask-derived `items` steps are present). */
export interface AutoMorphOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** How long the image mask stays fully shown before morphing away. Default `intervalMs` if set, else `2500`. */
  holdImageMs?: number;
  /** How long the text mask stays fully shown before morphing away. Default `intervalMs` if set, else `2500`. */
  holdTextMs?: number;
  /** Duration of each morph transition between the two masks. Default `1200`. */
  morphDurationMs?: number;
  /** Convenience shared default for `holdImageMs`/`holdTextMs` when they're not set individually. Default `0`. */
  intervalMs?: number;
}

export interface OrganicNoiseOptions {
  /**
   * A second, independent way to turn organic noise on, OR'd with
   * `PixelGridInfluenceOptions.organic` -- either one being true enables it.
   */
  enabled?: boolean;
  /** Effect radius, moot when `falloff` is `"none"`. Default `150` (or the deprecated top-level `organicRadius`, if set). */
  radius?: number;
  /** Displacement/size boost magnitude. Default `0.4` (or the deprecated top-level `organicStrength`, if set). */
  strength?: number;
  /** Animation speed. Default `0.002` (or the deprecated top-level `organicSpeed`, if set). */
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
  /** Default `"morph"`, or `maskTimeline.defaultTransition.mode` when set. */
  mode?: MaskTimelineTransitionMode;
  /** Default `maskTimeline.defaultTransition.durationMs`, or `autoMorph.morphDurationMs` (1200) if that's also unset. */
  durationMs?: number;
  /** Deterministic seed for the `dissolve` mode's per-cell randomized swap order. Default `maskTimeline.defaultTransition.seed` (1337), offset per step. */
  seed?: number;
}

/**
 * Identifies which mask a timeline step (or step combo entry) activates. Resolution order:
 * `assetId`/`maskId` (aliases -- if both are set and differ, `assetId` wins with a warning)
 * looked up against every declared mask's id; if omitted, falls back to the first mask of
 * `maskType`/`mask` (aliases), or the first mask of any type if that's also omitted.
 */
export interface MaskTimelineStepMaskRefOptions {
  /** Alias for `maskType`, used only as a fallback hint when no `assetId`/`maskId` is given. */
  mask?: InitialMask;
  /** Preferred id lookup -- an explicit reference to a mask declared via `items[]`, `imageMask(s)`/`textMask(s)`, etc. */
  assetId?: string;
  /** Legacy alias for `assetId`. */
  maskId?: string;
  /** Alias for `mask`, used only as a fallback hint when no `assetId`/`maskId` is given. */
  maskType?: InitialMask;
  /**
   * Overrides this mask's blend mode (default "max"/union) while it's active as part of a
   * combo step's `masks[]`. E.g. "multiply" gives an intersection look instead of a union.
   * Resets back to "max" whenever this mask is later resolved without an override, so it
   * never leaks onto an unrelated step reusing the same mask id.
   */
  blendMode?: BlendMode;
}

/** A single step in a declarative `maskTimeline`. See `MaskTimelineStepMaskRefOptions` for how the active mask is resolved. */
export interface MaskTimelineStepOptions {
  /** Alias for `maskType`, used only as a fallback hint when no `assetId`/`maskId` is given. */
  mask?: InitialMask;
  /** Preferred id lookup -- an explicit reference to a mask declared via `items[]`, `imageMask(s)`/`textMask(s)`, etc. */
  assetId?: string;
  /** Legacy alias for `assetId`. */
  maskId?: string;
  /** Alias for `mask`, used only as a fallback hint when no `assetId`/`maskId` is given. */
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
  /** How long this step stays fully shown before transitioning to the next. Default `maskTimeline.defaultHoldMs` (2500). */
  holdMs?: number;
  /** Shorthand for `transition.mode` -- ignored if `transition.mode` is also set. */
  mode?: MaskTimelineTransitionMode;
  /** Shorthand for `transition.durationMs` -- ignored if `transition.durationMs` is also set. */
  durationMs?: number;
  /** Explicit transition override; takes precedence over the `mode`/`durationMs` shorthands above. */
  transition?: MaskTimelineTransitionOptions;
}

/** A named text-mask asset declared for a timeline -- referenced from `steps[]` by `assetId`/`id`. */
export interface MaskTimelineTextItemOptions extends PixelGridTextMaskConfig {
  type: "text";
}

/** A named image-mask asset declared for a timeline -- referenced from `steps[]` by `assetId`/`id`. */
export interface MaskTimelineImageItemOptions extends PixelGridImageMaskConfig {
  type: "image";
}

export type MaskTimelineItemOptions =
  | MaskTimelineTextItemOptions
  | MaskTimelineImageItemOptions;

/**
 * Declarative sequence of mask steps with configurable hold/transition timing. If `steps[]`
 * is omitted and `items[]` is provided, steps are auto-generated in item declaration order.
 * Independent of the legacy `autoMorph` option, but `autoMorph`-derived steps are only used
 * as a last-resort fallback when neither `steps[]` nor `items[]`-derived steps exist.
 */
export interface MaskTimelineOptions {
  /** Default: `true` if any steps resolve (explicit, item-derived, or `autoMorph`-derived), `false` otherwise. */
  enabled?: boolean;
  /** Whether the timeline starts playing automatically once ready. Default `true`. */
  autoplay?: boolean;
  /** Whether the timeline restarts from the first step after the last one completes. Default `true`. */
  loop?: boolean;
  /** Which step index to start on. Clamped to the resolved step count. Default `0`. */
  initialStep?: number;
  /** Fallback `holdMs` for any step that doesn't set its own. Default `2500`. */
  defaultHoldMs?: number;
  /** Fallback transition for any step that doesn't set its own `transition`/`mode`/`durationMs`. Default `{ mode: "morph", durationMs: autoMorph.morphDurationMs, seed: 1337 }`. */
  defaultTransition?: MaskTimelineTransitionOptions;
  /** Named mask assets available to reference from `steps[]` by `assetId`. When `steps[]` is omitted, also used to auto-generate steps in declaration order. */
  items?: MaskTimelineItemOptions[];
  /** Explicit step sequence. Takes precedence over steps auto-generated from `items[]`. */
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
  /** Runtime quality tier, selects the defaults for the other 3 fields below. Default `"medium"`. */
  detail?: PixelGridDetailLevel;
  /** Whether cells outside the viewport (plus `cullingPadding`) are skipped during render. Default depends on `detail` (`true` for all 3 tiers). */
  viewportCulling?: boolean;
  /** Extra px margin around the viewport before a cell is culled. Default depends on `detail` (`low`: 12, `medium`: 20, `high`: 28). Floored at `0`. */
  cullingPadding?: number;
  /** Cells rendered smaller than this (px) are skipped entirely. Default depends on `detail` (`low`: 1, `medium`: 0.75, `high`: 0.5). Floored at `0.1`. */
  minRenderableSize?: number;
}

/** Cycles every cell's `color` through `palette` in lockstep, globally synchronized (contrast with `chromaticBreathing`'s per-cell out-of-phase variant). Disabled by default. */
export interface PaletteCycleEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Cycle speed. Default `0.45`. */
  speed?: number;
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
  /** Default `0.025`. */
  activationThreshold?: number;
  /** Colors cycled through. Default: the grid's own `colors`. */
  palette?: string[];
}

/** Fades/dissolves cells out (opacity), typically used for a reveal/transition look. Disabled by default. */
export interface PixelDissolveEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Dissolve speed. Default `0.9`. */
  speed?: number;
  /** Dissolve intensity, `0-1`. Default `0.35`. */
  amount?: number;
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/** Trigger source shared by `shockwaveBurst` and `glitchRgbSplit`: `"pointerDown"`, `"hoverEnter"`, or `"both"`. */
export type ShockwaveTriggerMode = "pointerDown" | "hoverEnter" | "both";

/** An expanding ring burst spawned on trigger, distinct from the `rippleEffects` ripple system. Disabled by default. */
export interface ShockwaveBurstEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Expansion speed. Default `0.85`. */
  speed?: number;
  /** Peak effect magnitude. Clamped to `[0, 2]`. Default `0.4`. */
  strength?: number;
  /** Ring thickness in px. Clamped to `[1, 160]`. Default `32`. */
  thickness?: number;
  /** Cap on simultaneous bursts. Clamped to `[1, 64]`. Default `16`. */
  maxBursts?: number;
  /** Default `"pointerDown"`. */
  triggerMode?: ShockwaveTriggerMode;
  /** Default `0.025`. */
  activationThreshold?: number;
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
}

/** Restricts which axis `waveWobble` displaces. */
export type WaveWobbleDirection = "horizontal" | "vertical" | "both";

/** Sinusoidal traveling displacement, additive with hover/magnetic/ripple displacement rather than overwriting it. Disabled by default. */
export interface WaveWobbleEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Displacement magnitude in px. Default `6`. */
  amplitude?: number;
  /** Spatial frequency -- higher means tighter waves. Default `0.02`. */
  frequency?: number;
  /** Time scale. Default `1`. */
  speed?: number;
  /** Default `"both"`. */
  direction?: WaveWobbleDirection;
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/** Dims every cell's opacity outside `radius` of the pointer -- the inverse of a hover glow. No `scope`/`activationThreshold` (position-gated, not activity-gated). Disabled by default. */
export interface CursorSpotlightEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Radius around the pointer left undimmed. Default `180`. */
  radius?: number;
  /** Distance (px) over which dimming ramps down to `minOpacity`. Default `140`. */
  falloff?: number;
  /** Opacity floor at the edge of `falloff`. Default `0.12`. */
  minOpacity?: number;
}

/** Cycles each cell's `color` through `palette` driven by that cell's own breathing phase/offset -- out of phase per cell, unlike `paletteCycle`'s synchronized sweep. Disabled by default. */
export interface ChromaticBreathingEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Same units as `breathing.speed`. Default `1`. */
  speed?: number;
  /** Colors cycled through. Default: the grid's own `colors`. */
  palette?: string[];
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/** Axis `scanLineReveal` sweeps along. */
export type ScanLineDirection = "horizontal" | "vertical";

/** A size-boosting sweep that travels along `direction`, revealing cells behind it. No `scope`/`activationThreshold` (an `activeOnly` gate would defeat its own purpose of activating previously-inactive cells). Disabled by default. */
export interface ScanLineRevealEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Default `"horizontal"`. */
  direction?: ScanLineDirection;
  /** Sweep speed. Default `80`. */
  speed?: number;
  /** Width (px) of the soft leading edge. Default `60`. */
  bandWidth?: number;
  /** Whether the sweep wraps back to the start after clearing the grid, vs. sweeping once and stopping. Default `true`. */
  loop?: boolean;
}

/** Samples the pointer position into a capped, decaying trail; each point pulls nearby cells toward it (same falloff math as `hoverEffects.magnetic`). Disabled by default. */
export interface MagneticTrailEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Pull reach per trail point. Default `90`. */
  radius?: number;
  /** Pull magnitude per trail point. Default `1.2`. */
  strength?: number;
  /** How long a trail point survives before fully fading. Default `500`. */
  lifetimeMs?: number;
  /** Cap on trail points retained at once. Default `24`. */
  maxPoints?: number;
  /** Minimum interval between recorded trail points while the pointer is over the canvas. Default `40`. */
  sampleIntervalMs?: number;
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/** On trigger, spawns a short-lived burst near the pointer: cells within `radius` get a random offset jitter and their color swapped with another cell's, reading as glitchy/chaotic by design. Disabled by default. */
export interface GlitchRgbSplitEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Burst reach. Default `70`. */
  radius?: number;
  /** Max random offset jitter magnitude. Default `4`. */
  jitterAmount?: number;
  /** Burst lifetime. Default `220`. */
  durationMs?: number;
  /** Cap on simultaneous bursts. Default `6`. */
  maxBursts?: number;
  /** Same values as `shockwaveBurst.triggerMode`. Default `"pointerDown"`. */
  triggerMode?: ShockwaveTriggerMode;
  /** Default `"activeOnly"`. */
  scope?: PostEffectScope;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/** Makes a cell fall (accumulating `offsetY` under `gravity`) the moment it deactivates, instead of vanishing instantly. Disabled by default. */
export interface GravityFallApartEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Fall acceleration, px/ms². Default `0.0009`. */
  gravity?: number;
  /** How long the size/opacity fade-out takes once a cell starts falling. Default `650`. */
  fallDurationMs?: number;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/** Glows active cells near the pointer proportionally to how many nearby candidate cells are within `linkDistance` of them -- clustered groups glow more than isolated cells. Disabled by default. */
export interface ConstellationConnectEffectOptions {
  /** Default `false`. */
  enabled?: boolean;
  /** Reach around the pointer considered. Default `140`. */
  radius?: number;
  /** Distance within which two cells count as "linked" for the glow boost. Default `45`. */
  linkDistance?: number;
  /** Bounds the pairwise-comparison cost -- never a full-grid scan. Default `120`. */
  maxCandidates?: number;
  /** Glow boost multiplier. Clamped to `[0, 2]`. Default `1`. */
  strength?: number;
  /** Default `0.025`. */
  activationThreshold?: number;
}

/**
 * Post-processing effects layered on top of the base grid, applied in a fixed order:
 * `dissolve → scanLineReveal → shockwaveBurst → paletteCycle → waveWobble → magneticTrail →
 * chromaticBreathing → glitchRgbSplit → gravityFallApart → constellationConnect →
 * cursorSpotlight`. Later effects see earlier ones' mutations within the same frame and win
 * on any field both touch. See API.md's "Post-effect notes" for per-effect detail.
 */
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
  /** Explicit id for `maskTimeline` step references. Auto-generated (`text-1`, `text-2`, ...) if omitted. */
  id?: string;
  /** The text to rasterize into a mask weight field. Required for the mask to register (masks with empty/missing text are dropped with a warning). */
  text?: string;
  centerX?: number;
  centerY?: number;
  /** Full CSS font shorthand (e.g. `"bold 160px Arial"`). Takes precedence over `fontSize`/`fontFamily`/`fontWeight` if set; otherwise those 3 are composed into one. Default composed font uses `fontSize: 160`, `fontWeight: "bold"`, `fontFamily: "Arial"`. */
  font?: string;
  /** Only used when `font` is unset. Default `160`. */
  fontSize?: number;
  /** Only used when `font` is unset. Default `"Arial"`. */
  fontFamily?: string;
  /** Only used when `font` is unset. Default `"bold"`. */
  fontWeight?: string | number;
  strength?: number;
  blurRadius?: number;
  /** Reveals the text progressively (character by character) instead of all at once. See `TextMaskRevealOptions`. */
  reveal?: TextMaskRevealOptions;
}

export interface PixelGridImageMaskConfig extends ImageMaskOptions {
  /** Explicit id for `maskTimeline` step references. Auto-generated (`image-1`, `image-2`, ...) if omitted. */
  id?: string;
  /** Bundler-resolved image URL. Required for the mask to register (masks with empty/missing `src` are dropped with a warning). */
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

/** Emitted (via `PixelGridEffectEvents.onMaskError` / React's `onMaskError`) when an image mask fails to load or fails to generate its sampling buffer. */
export interface PixelGridMaskErrorEvent {
  maskId: string;
  src: string;
  reason: string;
}

export interface PixelGridConfig {
  /** Required, non-empty. Base palette cells are drawn from at rest. No default -- an empty/missing array warns and falls back to a neutral gray palette. */
  colors: string[];
  /** Required, must be `> 0`. Spacing between cells in px. Invalid values warn and fall back to `7`. */
  gap: number;
  /** Required, must be `> 0`. Easing factor for a cell's size interpolating toward its target. Invalid values warn and fall back to `0.08`. */
  expandEase: number;
  /** Required, must be `> 0`. Base speed for the breathing sine wave (see `breathing.speed`, which scales this). Invalid values warn and fall back to `1`. */
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
  /** Post-processing effects layered on top of the base grid (`paletteCycle`, `dissolve`, `shockwaveBurst`, etc.). See `PixelGridEffectsOptions`. */
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

  /** Singular image mask. Coexists with `imageMasks[]` -- both are registered, plural entries first. */
  imageMask?: PixelGridImageMaskConfig;
  /** Singular text mask. Coexists with `textMasks[]` -- both are registered, plural entries first. */
  textMask?: PixelGridTextMaskConfig;
  /** Multiple image masks, registered before the singular `imageMask` (if also present). */
  imageMasks?: PixelGridImageMaskConfig[];
  /** Multiple text masks, registered before the singular `textMask` (if also present). */
  textMasks?: PixelGridTextMaskConfig[];
  /** Which mask type is active first, when more than one mask is declared. Default `"image"`. */
  initialMask?: InitialMask;
}

/**
 * Flat, top-level master switches for the 3 influence groups, deliberately separate from
 * `PixelGridConfig`'s own per-effect config blocks -- not simply an alternate spelling of an
 * `enabled` field that already exists elsewhere. See the "`influenceOptions` reference"
 * section in API.md for exactly how each relates to its `gridConfig` counterpart.
 */
export interface PixelGridInfluenceOptions {
  /** Master switch for the entire ripple system -- when `false`, also makes manual `triggerRipple()` calls a no-op (a broader scope than `rippleEffects.enabled`, which only gates the automatic reactive pass). Default `true`. */
  ripple?: boolean;
  /** The only switch for hover interaction -- `hoverEffects` has no `enabled` field of its own. Default `true`. */
  hover?: boolean;
  /** OR'd together with `organicNoise.enabled` -- either being `true` enables organic noise. Default `false`. */
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
