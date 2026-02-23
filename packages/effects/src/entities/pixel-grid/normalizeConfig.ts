import {
  InitialMask,
  MaskTimelineItemOptions,
  PixelGridConfig,
  PixelGridImageMaskConfig,
  PixelGridTextMaskConfig,
  ResolvedMaskRef,
  ResolvedPixelGridConfig,
  ResolvedPixelGridImageMaskConfig,
  ResolvedPixelGridTextMaskConfig
} from "./types";

export function resolvePixelGridConfig(
  config: PixelGridConfig
): ResolvedPixelGridConfig {
  const warnings: string[] = [];
  const resolvedMasks = normalizeMaskCollections(config, warnings);
  const hoverEffects = config.hoverEffects;
  const rippleEffects = config.rippleEffects;

  const resolvedHover: Required<ResolvedPixelGridConfig["hoverEffects"]> = {
    mode: hoverEffects?.mode ?? "classic",
    radius: hoverEffects?.radius ?? 120,
    radiusY: hoverEffects?.radiusY ?? hoverEffects?.radius ?? 120,
    shape: hoverEffects?.shape ?? "circle",
    strength: hoverEffects?.strength ?? 1,
    interactionScope: hoverEffects?.interactionScope ?? "imageMask",
    deactivate: hoverEffects?.deactivate ?? 0.8,
    displace: hoverEffects?.displace ?? 3,
    jitter: hoverEffects?.jitter ?? 1.25,
    tintPalette: hoverEffects?.tintPalette ?? []
  };

  const resolvedRipple: Required<ResolvedPixelGridConfig["rippleEffects"]> = {
    speed: rippleEffects?.speed ?? 0.5,
    thickness: rippleEffects?.thickness ?? 50,
    strength: rippleEffects?.strength ?? 30,
    maxRipples: rippleEffects?.maxRipples ?? 20,
    enabled: rippleEffects?.enabled ?? true,
    deactivateMultiplier: rippleEffects?.deactivateMultiplier ?? 1,
    displaceMultiplier: rippleEffects?.displaceMultiplier ?? 1,
    jitterMultiplier: rippleEffects?.jitterMultiplier ?? 1,
    tintPalette: rippleEffects?.tintPalette ?? []
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
      resolvedHover.radiusY,
    shape: config.breathing?.shape ?? resolvedHover.shape,
    strength: config.breathing?.strength ?? 0.9,
    minOpacity: config.breathing?.minOpacity ?? 0.55,
    maxOpacity: config.breathing?.maxOpacity ?? 1,
    affectHover: config.breathing?.affectHover ?? true,
    affectImage: config.breathing?.affectImage ?? true,
    affectText: config.breathing?.affectText ?? true
  };

  const quality = config.performance?.quality ?? "medium";
  const qualityDefaults = getQualityDefaults(quality);
  const resolvedPerformance: ResolvedPixelGridConfig["performance"] = {
    quality,
    viewportCulling: config.performance?.viewportCulling ?? qualityDefaults.viewportCulling,
    cullingPadding: Math.max(0, config.performance?.cullingPadding ?? qualityDefaults.cullingPadding),
    minRenderableSize: Math.max(
      0.1,
      config.performance?.minRenderableSize ?? qualityDefaults.minRenderableSize
    ),
    maxRipplesCap: qualityDefaults.maxRipplesCap
  };

  return {
    hoverEffects: resolvedHover,
    rippleEffects: resolvedRipple,
    breathing,
    autoMorph,
    maskTimeline,
    performance: resolvedPerformance,
    initialMask: config.initialMask ?? "image",
    imageMasks: resolvedMasks.imageMasks,
    textMasks: resolvedMasks.textMasks,
    warnings: Array.from(new Set(warnings))
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
  type TimelineSourceStep = {
    mask?: "image" | "text";
    assetId?: string;
    maskId?: string;
    maskType?: "image" | "text";
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

  const resolveStepMaskRef = (
    step: TimelineSourceStep,
    index: number
  ): { mask: InitialMask; maskRef: ResolvedMaskRef | null } => {
    const sourcePath = `maskTimeline.steps[${index}]`;
    const preferredType = step.maskType ?? step.mask;

    const rawAssetId = typeof step.assetId === "string" ? step.assetId : undefined;
    const rawMaskId = typeof step.maskId === "string" ? step.maskId : undefined;

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

  const resolvedSteps = sourceSteps.map((step, index) => ({
    ...resolveStepMaskRef(step, index),
    holdMs: Math.max(0, step.holdMs ?? defaultHoldMs),
    transition: {
      mode: step.transition?.mode ?? step.mode ?? defaultTransition.mode,
      durationMs: Math.max(1, step.transition?.durationMs ?? step.durationMs ?? defaultTransition.durationMs),
      seed: step.transition?.seed ?? defaultTransition.seed + index * 97
    }
  }));

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

function getQualityDefaults(quality: ResolvedPixelGridConfig["performance"]["quality"]) {
  if (quality === "low") {
    return {
      viewportCulling: true,
      cullingPadding: 12,
      minRenderableSize: 1,
      maxRipplesCap: 24
    };
  }

  if (quality === "high") {
    return {
      viewportCulling: true,
      cullingPadding: 28,
      minRenderableSize: 0.5,
      maxRipplesCap: 80
    };
  }

  return {
    viewportCulling: true,
    cullingPadding: 20,
    minRenderableSize: 0.75,
    maxRipplesCap: 48
  };
}
