import {
  InitialMask,
  MaskTimelineItemOptions,
  OrganicNoiseOptions,
  PixelGridConfig,
  PixelGridImageMaskConfig,
  PixelGridTextMaskConfig,
  ResolvedMaskRef,
  ResolvedPixelGridConfig,
  ResolvedPixelGridImageMaskConfig,
  ResolvedPixelGridTextMaskConfig
} from "./types";
import {
  OrganicNoiseFalloff,
  OrganicNoisePattern,
  OrganicNoisePosition
} from "../../influences/OrganicNoiseInfluence";
import { DEFAULT_NOISE_SEED } from "../../utils/math";

const DEFAULT_COLORS = ["#334155", "#475569", "#64748b"];
const DEFAULT_GAP = 7;
const DEFAULT_EXPAND_EASE = 0.08;
const DEFAULT_BREATH_SPEED = 1;
const ORGANIC_NOISE_PATTERNS: OrganicNoisePattern[] = ["waves", "perlin", "cells", "turbulence"];
const ORGANIC_NOISE_POSITIONS: OrganicNoisePosition[] = ["center", "follow-mouse"];
const ORGANIC_NOISE_FALLOFFS: OrganicNoiseFalloff[] = ["radial", "none"];

export function resolvePixelGridConfig(
  config: PixelGridConfig
): ResolvedPixelGridConfig {
  const warnings: string[] = [];
  const resolvedMasks = normalizeMaskCollections(config, warnings);
  const hoverEffects = config.hoverEffects;
  const rippleEffects = config.rippleEffects;

  // Required scalars have no fallback at the type level; this is the safety net for
  // consumers constructing PixelGridEffect directly (bypassing @pixel-engine/react's
  // own preset-aware validation), so an invalid value never reaches createCellBuffer's math.
  const hasValidColors = Array.isArray(config.colors) && config.colors.length > 0;
  if (!hasValidColors) {
    warnings.push("colors must be a non-empty array. Falling back to default colors.");
  }
  const colors = hasValidColors ? config.colors : DEFAULT_COLORS;
  const gap = ensurePositiveScalar(config.gap, DEFAULT_GAP, "gap", warnings);
  const expandEase = ensurePositiveScalar(config.expandEase, DEFAULT_EXPAND_EASE, "expandEase", warnings);
  const breathSpeed = ensurePositiveScalar(config.breathSpeed, DEFAULT_BREATH_SPEED, "breathSpeed", warnings);

  const resolvedHover: ResolvedPixelGridConfig["hoverEffects"] = {
    mode: hoverEffects?.mode ?? "classic",
    radius: hoverEffects?.radius ?? 120,
    strength: hoverEffects?.strength ?? 1,
    interactionScope: hoverEffects?.interactionScope ?? "imageMask",
    deactivate: hoverEffects?.deactivate ?? 0.8,
    displace: hoverEffects?.displace ?? 3,
    jitter: hoverEffects?.jitter ?? 1.25,
    tintPalette: hoverEffects?.tintPalette ?? [],
    magnetic: {
      enabled: hoverEffects?.magnetic?.enabled ?? false,
      mode: hoverEffects?.magnetic?.mode ?? "attract",
      strength: clampMin(hoverEffects?.magnetic?.strength, 0, 2.5),
      radius: clampMin(hoverEffects?.magnetic?.radius, 0.1, hoverEffects?.radius ?? 120)
    }
  };

  let rippleMaxRadius = rippleEffects?.maxRadius;
  if (rippleMaxRadius !== undefined && (!Number.isFinite(rippleMaxRadius) || rippleMaxRadius <= 0)) {
    warnings.push("rippleEffects.maxRadius must be > 0. Falling back to the canvas-derived default.");
    rippleMaxRadius = undefined;
  }

  const resolvedRipple: ResolvedPixelGridConfig["rippleEffects"] = {
    speed: rippleEffects?.speed ?? 0.5,
    thickness: rippleEffects?.thickness ?? 50,
    strength: rippleEffects?.strength ?? 30,
    maxRipples: rippleEffects?.maxRipples ?? 20,
    enabled: rippleEffects?.enabled ?? true,
    deactivateMultiplier: rippleEffects?.deactivateMultiplier ?? 1,
    displaceMultiplier: rippleEffects?.displaceMultiplier ?? 1,
    jitterMultiplier: rippleEffects?.jitterMultiplier ?? 1,
    tintPalette: rippleEffects?.tintPalette ?? [],
    maxRadius: rippleMaxRadius
  };

  const sharedMorphHold = config.autoMorph?.intervalMs;
  const autoMorph: Required<ResolvedPixelGridConfig["autoMorph"]> = {
    enabled: config.autoMorph?.enabled ?? false,
    holdImageMs: config.autoMorph?.holdImageMs ?? sharedMorphHold ?? 2500,
    holdTextMs: config.autoMorph?.holdTextMs ?? sharedMorphHold ?? 2500,
    morphDurationMs: config.autoMorph?.morphDurationMs ?? 1200,
    intervalMs: config.autoMorph?.intervalMs ?? 0
  };
  const maskTimeline = resolveMaskTimeline(config, autoMorph, resolvedMasks, warnings);

  const breathing: Required<ResolvedPixelGridConfig["breathing"]> = {
    enabled: config.breathing?.enabled ?? false,
    speed: config.breathing?.speed ?? 1,
    radius: config.breathing?.radius ?? resolvedHover.radius,
    radiusY:
      config.breathing?.radiusY ??
      config.breathing?.radius ??
      resolvedHover.radius,
    strength: config.breathing?.strength ?? 0.9,
    minOpacity: config.breathing?.minOpacity ?? 0.55,
    maxOpacity: config.breathing?.maxOpacity ?? 1,
    affectHover: config.breathing?.affectHover ?? true,
    affectImage: config.breathing?.affectImage ?? true,
    affectText: config.breathing?.affectText ?? true
  };

  if (breathing.minOpacity > breathing.maxOpacity) {
    warnings.push("breathing.minOpacity cannot be greater than breathing.maxOpacity. Swapping values.");
    const min = breathing.maxOpacity;
    const max = breathing.minOpacity;
    breathing.minOpacity = min;
    breathing.maxOpacity = max;
  }

  if (config.organicRadius !== undefined) {
    warnings.push("organicRadius is deprecated. Use organicNoise.radius instead.");
  }
  if (config.organicStrength !== undefined) {
    warnings.push("organicStrength is deprecated. Use organicNoise.strength instead.");
  }
  if (config.organicSpeed !== undefined) {
    warnings.push("organicSpeed is deprecated. Use organicNoise.speed instead.");
  }

  const organicNoise = resolveOrganicNoiseLayer(
    config.organicNoise,
    false,
    "organicNoise",
    { radius: config.organicRadius, strength: config.organicStrength, speed: config.organicSpeed },
    warnings
  );

  const organicNoiseLayers = (config.organicNoises ?? []).map((raw, i) =>
    resolveOrganicNoiseLayer(raw, true, `organicNoises[${i}]`, undefined, warnings)
  );

  const detail = config.performance?.detail ?? "medium";
  const detailDefaults = getDetailDefaults(detail);
  const resolvedPerformance: ResolvedPixelGridConfig["performance"] = {
    detail,
    viewportCulling: config.performance?.viewportCulling ?? detailDefaults.viewportCulling,
    cullingPadding: Math.max(0, config.performance?.cullingPadding ?? detailDefaults.cullingPadding),
    minRenderableSize: Math.max(
      0.1,
      config.performance?.minRenderableSize ?? detailDefaults.minRenderableSize
    ),
    maxRipplesCap: detailDefaults.maxRipplesCap,
    maxCellsCap: detailDefaults.maxCellsCap
  };
  const resolvedEffects: ResolvedPixelGridConfig["effects"] = {
    paletteCycle: {
      enabled: config.effects?.paletteCycle?.enabled ?? false,
      speed: clampMin(config.effects?.paletteCycle?.speed, 0, 0.45),
      scope: config.effects?.paletteCycle?.scope ?? "activeOnly",
      activationThreshold: clampMin(config.effects?.paletteCycle?.activationThreshold, 0, 0.025),
      palette: resolvePaletteCyclePalette(config, colors, warnings)
    },
    dissolve: {
      enabled: config.effects?.dissolve?.enabled ?? false,
      speed: clampMin(config.effects?.dissolve?.speed, 0, 0.85),
      amount: clamp(config.effects?.dissolve?.amount, 0, 1, 0.35),
      scope: config.effects?.dissolve?.scope ?? "activeOnly",
      activationThreshold: clampMin(config.effects?.dissolve?.activationThreshold, 0, 0.025)
    },
    shockwaveBurst: {
      enabled: config.effects?.shockwaveBurst?.enabled ?? false,
      speed: clampMin(config.effects?.shockwaveBurst?.speed, 0, 0.85),
      strength: clamp(config.effects?.shockwaveBurst?.strength, 0, 2, 0.4),
      thickness: clamp(config.effects?.shockwaveBurst?.thickness, 1, 160, 32),
      maxBursts: clampInt(config.effects?.shockwaveBurst?.maxBursts, 1, 64, 16),
      triggerMode: config.effects?.shockwaveBurst?.triggerMode ?? "pointerDown",
      activationThreshold: clampMin(config.effects?.shockwaveBurst?.activationThreshold, 0, 0.025),
      scope: config.effects?.shockwaveBurst?.scope ?? "activeOnly"
    }
  };

  return {
    colors,
    gap,
    expandEase,
    breathSpeed,
    respectReducedMotion: config.respectReducedMotion ?? true,
    hoverEffects: resolvedHover,
    rippleEffects: resolvedRipple,
    breathing,
    autoMorph,
    organicNoise,
    organicNoiseLayers,
    maskTimeline,
    performance: resolvedPerformance,
    effects: resolvedEffects,
    initialMask: config.initialMask ?? "image",
    imageMasks: resolvedMasks.imageMasks,
    textMasks: resolvedMasks.textMasks,
    warnings: Array.from(new Set(warnings))
  };
}

/**
 * Resolves one organicNoise "layer" -- either the singular legacy `organicNoise` slot
 * (`defaultEnabled=false`, `legacy` carries the deprecated organicRadius/etc. fallback) or
 * one entry of the `organicNoises[]` array (`defaultEnabled=true`, `legacy=undefined` --
 * there's no legacy array form to fall back from).
 */
function resolveOrganicNoiseLayer(
  raw: OrganicNoiseOptions | undefined,
  defaultEnabled: boolean,
  sourceLabel: string,
  legacy: { radius?: number; strength?: number; speed?: number } | undefined,
  warnings: string[]
): Required<OrganicNoiseOptions> {
  let pattern = raw?.pattern ?? "waves";
  if (!ORGANIC_NOISE_PATTERNS.includes(pattern)) {
    warnings.push(`${sourceLabel}.pattern "${pattern}" is not recognized. Falling back to "waves".`);
    pattern = "waves";
  }

  let position = raw?.position ?? "center";
  if (!ORGANIC_NOISE_POSITIONS.includes(position)) {
    warnings.push(`${sourceLabel}.position "${position}" is not recognized. Falling back to "center".`);
    position = "center";
  }

  let falloff = raw?.falloff ?? "radial";
  if (!ORGANIC_NOISE_FALLOFFS.includes(falloff)) {
    warnings.push(`${sourceLabel}.falloff "${falloff}" is not recognized. Falling back to "radial".`);
    falloff = "radial";
  }

  const seed = typeof raw?.seed === "number" && Number.isFinite(raw.seed) ? raw.seed : DEFAULT_NOISE_SEED;

  return {
    enabled: raw?.enabled ?? defaultEnabled,
    radius: raw?.radius ?? legacy?.radius ?? 150,
    strength: raw?.strength ?? legacy?.strength ?? 0.4,
    speed: raw?.speed ?? legacy?.speed ?? 0.002,
    pattern,
    scale: clampMin(raw?.scale, 0.01, 1),
    position,
    falloff,
    seed
  };
}

interface NormalizedMaskCollections {
  imageMasks: ResolvedPixelGridImageMaskConfig[];
  textMasks: ResolvedPixelGridTextMaskConfig[];
  byId: Map<string, ResolvedMaskRef>;
  timelineItemRefs: ResolvedMaskRef[];
  firstByType: {
    image: ResolvedMaskRef | null;
    text: ResolvedMaskRef | null;
  };
}

interface MaskSource<TMask> {
  value: TMask;
  sourcePath: string;
  trackTimelineItem?: boolean;
}

function resolveTextMaskFont(mask: PixelGridTextMaskConfig): string {
  if (typeof mask.font === "string" && mask.font.trim().length > 0) {
    return mask.font.trim();
  }

  const fontSizeRaw = mask.fontSize;
  const resolvedSize =
    typeof fontSizeRaw === "number" && Number.isFinite(fontSizeRaw)
      ? Math.max(1, fontSizeRaw)
      : 160;
  const fontWeightRaw = mask.fontWeight;
  const resolvedWeight =
    typeof fontWeightRaw === "number"
      ? String(Math.max(100, Math.min(900, Math.round(fontWeightRaw))))
      : typeof fontWeightRaw === "string" && fontWeightRaw.trim().length > 0
        ? fontWeightRaw.trim()
        : "bold";
  const resolvedFamily =
    typeof mask.fontFamily === "string" && mask.fontFamily.trim().length > 0
      ? mask.fontFamily.trim()
      : "Arial";

  return `${resolvedWeight} ${resolvedSize}px ${resolvedFamily}`;
}

function normalizeMaskCollections(
  config: PixelGridConfig,
  warnings: string[]
): NormalizedMaskCollections {
  const imageMasks: ResolvedPixelGridImageMaskConfig[] = [];
  const textMasks: ResolvedPixelGridTextMaskConfig[] = [];
  const byId = new Map<string, ResolvedMaskRef>();
  const timelineItemRefs: ResolvedMaskRef[] = [];
  const usedIds = new Set<string>();
  const counters: Record<InitialMask, number> = {
    image: 1,
    text: 1
  };

  const nextGeneratedId = (type: InitialMask): string => {
    while (true) {
      const candidate = `${type}-${counters[type]++}`;
      if (!usedIds.has(candidate)) {
        return candidate;
      }
    }
  };

  const resolveId = (
    type: InitialMask,
    sourcePath: string,
    rawId: unknown
  ): string | null => {
    const hasId = typeof rawId === "string";
    const normalizedId = hasId ? rawId.trim() : "";

    if (hasId && normalizedId.length === 0) {
      warnings.push(`${sourcePath}: empty mask id is not allowed.`);
      return null;
    }

    const id = normalizedId.length > 0 ? normalizedId : nextGeneratedId(type);
    if (usedIds.has(id)) {
      warnings.push(`${sourcePath}: duplicate mask id "${id}" ignored.`);
      return null;
    }

    usedIds.add(id);
    byId.set(id, {
      id,
      type
    });
    return id;
  };

  const addImageMask = (source: MaskSource<PixelGridImageMaskConfig>) => {
    const src = typeof source.value.src === "string" ? source.value.src.trim() : "";
    if (src.length === 0) {
      warnings.push(`${source.sourcePath}: missing "src", mask ignored.`);
      return;
    }

    const id = resolveId("image", source.sourcePath, source.value.id);
    if (!id) return;

    const ref: ResolvedMaskRef = {
      id,
      type: "image"
    };
    if (source.trackTimelineItem) {
      timelineItemRefs.push(ref);
    }

    imageMasks.push({
      ...source.value,
      id,
      src
    });
  };

  const addTextMask = (source: MaskSource<PixelGridTextMaskConfig>) => {
    const text = typeof source.value.text === "string" ? source.value.text : "";
    if (!text.trim()) {
      warnings.push(`${source.sourcePath}: missing "text", mask ignored.`);
      return;
    }

    const id = resolveId("text", source.sourcePath, source.value.id);
    if (!id) return;

    const ref: ResolvedMaskRef = {
      id,
      type: "text"
    };
    if (source.trackTimelineItem) {
      timelineItemRefs.push(ref);
    }

    textMasks.push({
      ...source.value,
      id,
      text,
      font: resolveTextMaskFont(source.value)
    });
  };

  const imageSources: Array<MaskSource<PixelGridImageMaskConfig>> = [];
  for (let i = 0; i < (config.imageMasks?.length ?? 0); i++) {
    imageSources.push({
      value: config.imageMasks![i],
      sourcePath: `imageMasks[${i}]`
    });
  }
  if (config.imageMask) {
    imageSources.push({
      value: config.imageMask,
      sourcePath: "imageMask"
    });
  }

  const textSources: Array<MaskSource<PixelGridTextMaskConfig>> = [];
  for (let i = 0; i < (config.textMasks?.length ?? 0); i++) {
    textSources.push({
      value: config.textMasks![i],
      sourcePath: `textMasks[${i}]`
    });
  }
  if (config.textMask) {
    textSources.push({
      value: config.textMask,
      sourcePath: "textMask"
    });
  }

  for (const source of imageSources) addImageMask(source);
  for (const source of textSources) addTextMask(source);

  const timelineItems: MaskTimelineItemOptions[] = config.maskTimeline?.items ?? [];
  for (let i = 0; i < timelineItems.length; i++) {
    const item = timelineItems[i];
    const sourcePath = `maskTimeline.items[${i}]`;
    if (item.type === "image") {
      addImageMask({
        value: item,
        sourcePath,
        trackTimelineItem: true
      });
      continue;
    }
    if (item.type === "text") {
      addTextMask({
        value: item,
        sourcePath,
        trackTimelineItem: true
      });
      continue;
    }
    warnings.push(`${sourcePath}: unknown item type.`);
  }

  return {
    imageMasks,
    textMasks,
    byId,
    timelineItemRefs,
    firstByType: {
      image: imageMasks[0]
        ? {
          id: imageMasks[0].id,
          type: "image"
        }
        : null,
      text: textMasks[0]
        ? {
          id: textMasks[0].id,
          type: "text"
        }
        : null
    }
  };
}

function resolveMaskTimeline(
  config: PixelGridConfig,
  autoMorph: Required<ResolvedPixelGridConfig["autoMorph"]>,
  masks: NormalizedMaskCollections,
  warnings: string[]
): ResolvedPixelGridConfig["maskTimeline"] {
  type MaskRefEntry = {
    mask?: "image" | "text";
    assetId?: string;
    maskId?: string;
    maskType?: "image" | "text";
  };

  type TimelineSourceStep = MaskRefEntry & {
    masks?: MaskRefEntry[];
    holdMs?: number;
    mode?: "morph" | "fade" | "dissolve";
    durationMs?: number;
    transition?: {
      mode?: "morph" | "fade" | "dissolve";
      durationMs?: number;
      seed?: number;
    };
  };

  const explicitSteps: TimelineSourceStep[] = config.maskTimeline?.steps ?? [];
  const hasExplicitSteps = explicitSteps.length > 0;

  const itemSteps: TimelineSourceStep[] = masks.timelineItemRefs.map((ref) => ({
    mask: ref.type,
    assetId: ref.id
  }));
  const hasItemSteps = itemSteps.length > 0;

  const legacySteps: TimelineSourceStep[] =
    autoMorph.enabled
      ? [
        {
          mask: "image" as const,
          assetId: masks.firstByType.image?.id,
          holdMs: autoMorph.holdImageMs + autoMorph.intervalMs,
          transition: {
            mode: "morph" as const,
            durationMs: autoMorph.morphDurationMs
          }
        },
        {
          mask: "text" as const,
          assetId: masks.firstByType.text?.id,
          holdMs: autoMorph.holdTextMs + autoMorph.intervalMs,
          transition: {
            mode: "morph" as const,
            durationMs: autoMorph.morphDurationMs
          }
        }
      ]
      : [];

  const sourceSteps = hasExplicitSteps
    ? explicitSteps
    : hasItemSteps
      ? itemSteps
      : legacySteps;
  const defaultTransition = {
    mode: config.maskTimeline?.defaultTransition?.mode ?? "morph",
    durationMs: Math.max(1, config.maskTimeline?.defaultTransition?.durationMs ?? autoMorph.morphDurationMs),
    seed: config.maskTimeline?.defaultTransition?.seed ?? 1337
  };
  const defaultHoldMs = Math.max(0, config.maskTimeline?.defaultHoldMs ?? 2500);
  const enabled = config.maskTimeline?.enabled ?? (sourceSteps.length > 0);
  const loop = config.maskTimeline?.loop ?? true;
  const autoplay = config.maskTimeline?.autoplay ?? true;
  const initialStepRaw = config.maskTimeline?.initialStep ?? 0;

  const resolveFallbackRef = (
    preferredType?: InitialMask,
    sourcePath?: string
  ): ResolvedMaskRef | null => {
    if (preferredType === "image") {
      const image = masks.firstByType.image;
      if (image) return image;
      const text = masks.firstByType.text;
      if (text) {
        if (sourcePath) {
          warnings.push(`${sourcePath}: no image masks available, falling back to text mask "${text.id}".`);
        }
        return text;
      }
      return null;
    }

    if (preferredType === "text") {
      const text = masks.firstByType.text;
      if (text) return text;
      const image = masks.firstByType.image;
      if (image) {
        if (sourcePath) {
          warnings.push(`${sourcePath}: no text masks available, falling back to image mask "${image.id}".`);
        }
        return image;
      }
      return null;
    }

    return masks.firstByType.image ?? masks.firstByType.text ?? null;
  };

  const resolveMaskRefEntry = (
    entry: MaskRefEntry,
    sourcePath: string
  ): { mask: InitialMask; maskRef: ResolvedMaskRef | null } => {
    const preferredType = entry.maskType ?? entry.mask;

    const rawAssetId = typeof entry.assetId === "string" ? entry.assetId : undefined;
    const rawMaskId = typeof entry.maskId === "string" ? entry.maskId : undefined;

    if (rawAssetId !== undefined && rawAssetId.trim().length === 0) {
      warnings.push(`${sourcePath}: empty "assetId" is not allowed.`);
    }
    if (rawMaskId !== undefined && rawMaskId.trim().length === 0) {
      warnings.push(`${sourcePath}: empty "maskId" is not allowed.`);
    }

    const normalizedAssetId = rawAssetId?.trim() ?? "";
    const normalizedMaskId = rawMaskId?.trim() ?? "";

    if (
      normalizedAssetId.length > 0 &&
      normalizedMaskId.length > 0 &&
      normalizedAssetId !== normalizedMaskId
    ) {
      warnings.push(
        `${sourcePath}: "assetId" and "maskId" both provided with different values; using assetId "${normalizedAssetId}".`
      );
    }

    const resolvedId =
      normalizedAssetId.length > 0
        ? normalizedAssetId
        : normalizedMaskId.length > 0
          ? normalizedMaskId
          : "";

    if (resolvedId.length > 0) {
      const byId = masks.byId.get(resolvedId);
      if (byId) {
        if (preferredType && byId.type !== preferredType) {
          warnings.push(
            `${sourcePath}: asset "${resolvedId}" is "${byId.type}" but step requested "${preferredType}".`
          );
        }
        return {
          mask: byId.type,
          maskRef: byId
        };
      }

      warnings.push(`${sourcePath}: unknown asset id "${resolvedId}".`);
    }

    if (!preferredType && resolvedId.length === 0) {
      warnings.push(`${sourcePath}: missing mask reference; using first available mask.`);
    }

    const fallbackRef = resolveFallbackRef(preferredType, sourcePath);
    return {
      mask: fallbackRef?.type ?? preferredType ?? "image",
      maskRef: fallbackRef
    };
  };

  const resolveStepMaskRef = (
    step: TimelineSourceStep,
    index: number
  ): { mask: InitialMask; maskRef: ResolvedMaskRef | null } =>
    resolveMaskRefEntry(step, `maskTimeline.steps[${index}]`);

  // Resolves a step's `masks` combo entries (up to one per type), for a static
  // image+text-simultaneously step. Returns [] when the step doesn't use `masks`.
  const resolveComboMaskRefs = (step: TimelineSourceStep, index: number): ResolvedMaskRef[] => {
    const entries = step.masks ?? [];
    if (entries.length === 0) return [];

    const seenTypes = new Set<InitialMask>();
    const refs: ResolvedMaskRef[] = [];

    entries.forEach((entry, entryIndex) => {
      const sourcePath = `maskTimeline.steps[${index}].masks[${entryIndex}]`;
      const { maskRef } = resolveMaskRefEntry(entry, sourcePath);
      if (!maskRef) return;
      if (seenTypes.has(maskRef.type)) {
        warnings.push(
          `${sourcePath}: only one "${maskRef.type}" mask is supported per step; extra ignored.`
        );
        return;
      }
      seenTypes.add(maskRef.type);
      refs.push(maskRef);
    });

    return refs;
  };

  const resolvedSteps = sourceSteps.map((step, index) => {
    const maskRefs = resolveComboMaskRefs(step, index);
    const singular =
      maskRefs.length > 0
        ? { mask: maskRefs[0].type, maskRef: maskRefs[0] }
        : resolveStepMaskRef(step, index);

    return {
      ...singular,
      ...(maskRefs.length > 0 ? { maskRefs } : {}),
      holdMs: Math.max(0, step.holdMs ?? defaultHoldMs),
      transition: {
        mode: step.transition?.mode ?? step.mode ?? defaultTransition.mode,
        durationMs: Math.max(1, step.transition?.durationMs ?? step.durationMs ?? defaultTransition.durationMs),
        seed: step.transition?.seed ?? defaultTransition.seed + index * 97
      }
    };
  });

  const initialStep =
    resolvedSteps.length === 0
      ? 0
      : Math.min(
        resolvedSteps.length - 1,
        Math.max(0, Math.floor(initialStepRaw))
      );

  return {
    enabled,
    loop,
    autoplay,
    initialStep,
    steps: resolvedSteps
  };
}

function getDetailDefaults(detail: ResolvedPixelGridConfig["performance"]["detail"]) {
  if (detail === "low") {
    return {
      viewportCulling: true,
      cullingPadding: 12,
      minRenderableSize: 1,
      maxRipplesCap: 24,
      maxCellsCap: 120_000
    };
  }

  if (detail === "high") {
    return {
      viewportCulling: true,
      cullingPadding: 28,
      minRenderableSize: 0.5,
      maxRipplesCap: 80,
      maxCellsCap: 320_000
    };
  }

  return {
    viewportCulling: true,
    cullingPadding: 20,
    minRenderableSize: 0.75,
    maxRipplesCap: 48,
    maxCellsCap: 200_000
  };
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function clampMin(value: number | undefined, min: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function ensurePositiveScalar(
  value: number | undefined,
  fallback: number,
  label: string,
  warnings: string[]
): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  warnings.push(`${label} must be > 0. Falling back to ${fallback}.`);
  return fallback;
}

function resolvePaletteCyclePalette(
  config: PixelGridConfig,
  gridColors: string[],
  warnings: string[]
): string[] {
  const candidatePalette = config.effects?.paletteCycle?.palette;
  if (!candidatePalette) {
    return gridColors;
  }

  const sanitized = candidatePalette
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (sanitized.length === 0) {
    warnings.push("effects.paletteCycle.palette: no valid colors found, using grid colors.");
    return gridColors;
  }

  return sanitized;
}
