import {
  PixelGridConfig,
  PixelGridImageMaskConfig,
  PixelGridTextMaskConfig
} from "@pixel-engine/effects";
import {
  HybridMaskInput,
  ImageMaskInput,
  PixelGridMaskInput,
  PixelGridPresetName,
  TextMaskInput
} from "./types";
import { createPixelPreset, mergePixelOptions } from "./presets";

function warnDev(message: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.warn(`[pixel-engine/react] ${message}`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ensurePositive(
  value: number | undefined,
  fallback: number,
  label: string
): number {
  if (typeof value === "undefined") {
    return fallback;
  }
  if (!Number.isFinite(value) || value <= 0) {
    warnDev(`${label} must be > 0. Falling back to ${fallback}.`);
    return fallback;
  }
  return value;
}

function ensureNonNegative(
  value: number | undefined,
  fallback: number,
  label: string
): number {
  if (typeof value === "undefined") {
    return fallback;
  }
  if (!Number.isFinite(value) || value < 0) {
    warnDev(`${label} must be >= 0. Falling back to ${fallback}.`);
    return fallback;
  }
  return value;
}

function cloneTimelineStep(
  step: NonNullable<NonNullable<PixelGridConfig["maskTimeline"]>["steps"]>[number]
) {
  return {
    ...step,
    transition: step.transition ? { ...step.transition } : undefined
  };
}

function cloneTimelineItem(
  item: NonNullable<NonNullable<PixelGridConfig["maskTimeline"]>["items"]>[number]
) {
  return { ...item };
}

function cloneMaskTimeline(
  timeline?: PixelGridConfig["maskTimeline"]
): PixelGridConfig["maskTimeline"] {
  if (!timeline) return undefined;
  return {
    ...timeline,
    defaultTransition: timeline.defaultTransition
      ? { ...timeline.defaultTransition }
      : undefined,
    items: timeline.items ? timeline.items.map(cloneTimelineItem) : undefined,
    steps: timeline.steps ? timeline.steps.map(cloneTimelineStep) : undefined
  };
}

function normalizeTextMask(
  input: PixelGridTextMaskConfig,
  fallbackId: string
): PixelGridTextMaskConfig {
  return {
    ...input,
    id: input.id?.trim() || fallbackId,
    font: input.font ?? "bold 160px Arial"
  };
}

function normalizeImageMask(
  input: PixelGridImageMaskConfig,
  fallbackId: string
): PixelGridImageMaskConfig {
  return {
    ...input,
    id: input.id?.trim() || fallbackId
  };
}

type TimelineStepInput = NonNullable<NonNullable<PixelGridConfig["maskTimeline"]>["steps"]>[number];
type TimelineItemInput = NonNullable<NonNullable<PixelGridConfig["maskTimeline"]>["items"]>[number];
type RegisteredMaskType = "text" | "image";
type RegisteredMaskEntry = { type: RegisteredMaskType; source: string };

function buildMaskIdRegistry(config: Partial<PixelGridConfig>): Map<string, RegisteredMaskEntry> {
  const registry = new Map<string, RegisteredMaskEntry>();
  const sourceGroup = (source: string): "textMasks" | "imageMasks" | "timelineItems" | "other" => {
    if (source.startsWith("textMasks[")) return "textMasks";
    if (source.startsWith("imageMasks[")) return "imageMasks";
    if (source.startsWith("maskTimeline.items[")) return "timelineItems";
    return "other";
  };
  const register = (id: unknown, type: RegisteredMaskType, source: string) => {
    if (typeof id !== "string") return;
    const normalized = id.trim();
    if (!normalized) {
      warnDev(`${source}: empty id is not allowed.`);
      return;
    }
    const previous = registry.get(normalized);
    if (previous && previous.type !== type) {
      warnDev(
        `${source}: id "${normalized}" was already declared as "${previous.type}" and is now "${type}".`
      );
      return;
    }
    if (previous && previous.type === type) {
      const previousGroup = sourceGroup(previous.source);
      const nextGroup = sourceGroup(source);
      // Allow same id across different groups because they can be deliberate aliases
      // between masks and timeline items.
      if (previousGroup !== nextGroup) {
        return;
      }
      warnDev(`${source}: duplicate id "${normalized}" detected.`);
      return;
    }
    registry.set(normalized, { type, source });
  };

  for (let index = 0; index < (config.textMasks?.length ?? 0); index++) {
    register(config.textMasks?.[index]?.id, "text", `textMasks[${index}]`);
  }
  for (let index = 0; index < (config.imageMasks?.length ?? 0); index++) {
    register(config.imageMasks?.[index]?.id, "image", `imageMasks[${index}]`);
  }
  for (let index = 0; index < (config.maskTimeline?.items?.length ?? 0); index++) {
    const item = config.maskTimeline?.items?.[index] as TimelineItemInput | undefined;
    if (!item) continue;
    if (item.type !== "text" && item.type !== "image") {
      warnDev(`maskTimeline.items[${index}]: unknown item type "${String((item as { type?: unknown }).type)}".`);
      continue;
    }
    register(item.id, item.type, `maskTimeline.items[${index}]`);
  }
  return registry;
}

function validateHybridTimelineConsistency(config: Partial<PixelGridConfig>): void {
  const registry = buildMaskIdRegistry(config);
  const steps = config.maskTimeline?.steps ?? [];
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index] as TimelineStepInput;
    const source = `maskTimeline.steps[${index}]`;
    const rawAssetId = typeof step.assetId === "string" ? step.assetId : undefined;
    const rawMaskId = typeof step.maskId === "string" ? step.maskId : undefined;
    const assetId = rawAssetId?.trim() ?? "";
    const maskId = rawMaskId?.trim() ?? "";

    if (rawAssetId !== undefined && assetId.length === 0) {
      warnDev(`${source}: assetId is empty.`);
    }
    if (rawMaskId !== undefined && maskId.length === 0) {
      warnDev(`${source}: maskId is empty.`);
    }
    if (assetId && maskId && assetId !== maskId) {
      warnDev(`${source}: assetId and maskId differ; assetId will be used.`);
    }

    const resolvedId = assetId || maskId;
    const requestedType = step.maskType ?? step.mask;
    if (!resolvedId) {
      if (!requestedType) {
        warnDev(`${source}: missing asset reference; provide assetId (or maskId).`);
      }
      continue;
    }

    const registered = registry.get(resolvedId);
    if (!registered) {
      warnDev(
        `${source}: unknown asset id "${resolvedId}". Declare it in hybrid texts/images/items.`
      );
      continue;
    }
    if (requestedType && requestedType !== registered.type) {
      warnDev(
        `${source}: asset "${resolvedId}" is "${registered.type}" but step requests "${requestedType}".`
      );
    }
  }
}

function toMaskConfig(mask?: PixelGridMaskInput): Partial<PixelGridConfig> {
  if (!mask) return {};

  if (mask.type === "text") {
    const textMask = mask as TextMaskInput;
    return {
      textMask: {
        text: textMask.text,
        centerX: textMask.centerX,
        centerY: textMask.centerY,
        font: textMask.font ?? "bold 160px Arial",
        strength: textMask.strength,
        blurRadius: textMask.blurRadius
      }
    };
  }

  if (mask.type === "image") {
    const imageMask = mask as ImageMaskInput;
    return {
      imageMask: {
        src: imageMask.src,
        centerX: imageMask.centerX,
        centerY: imageMask.centerY,
        scale: imageMask.scale,
        sampleMode: imageMask.sampleMode,
        strength: imageMask.strength,
        threshold: imageMask.threshold,
        blurRadius: imageMask.blurRadius,
        dithering: imageMask.dithering
      }
    };
  }

  const hybrid = mask as HybridMaskInput;
  const timeline = cloneMaskTimeline(hybrid.maskTimeline) ?? {};

  const textCandidates: PixelGridTextMaskConfig[] = [];
  if (hybrid.text) textCandidates.push(hybrid.text);
  if (hybrid.texts) textCandidates.push(...hybrid.texts);

  const imageCandidates: PixelGridImageMaskConfig[] = [];
  if (hybrid.image) imageCandidates.push(hybrid.image);
  if (hybrid.images) imageCandidates.push(...hybrid.images);

  const textMasks = textCandidates.map((candidate, index) =>
    normalizeTextMask(candidate, `text-${index + 1}`)
  );
  const imageMasks = imageCandidates.map((candidate, index) =>
    normalizeImageMask(candidate, `image-${index + 1}`)
  );

  if (hybrid.items) {
    timeline.items = hybrid.items.map(cloneTimelineItem);
  }
  if (hybrid.steps) {
    timeline.steps = hybrid.steps.map(cloneTimelineStep);
  }
  if (!timeline.items || timeline.items.length === 0) {
    const derivedItems: NonNullable<PixelGridConfig["maskTimeline"]>["items"] = [];
    for (const textMask of textMasks) {
      derivedItems.push({
        type: "text",
        ...textMask
      });
    }
    for (const imageMask of imageMasks) {
      derivedItems.push({
        type: "image",
        ...imageMask
      });
    }
    if (derivedItems.length > 0) {
      timeline.items = derivedItems;
    }
  }

  const hasTimelineConfig =
    timeline.enabled !== undefined ||
    timeline.autoplay !== undefined ||
    timeline.loop !== undefined ||
    timeline.initialStep !== undefined ||
    timeline.defaultHoldMs !== undefined ||
    timeline.defaultTransition !== undefined ||
    (timeline.items?.length ?? 0) > 0 ||
    (timeline.steps?.length ?? 0) > 0;

  const firstImageMask = imageMasks[0];
  const firstTextMask = textMasks[0];

  return {
    imageMask: firstImageMask ? { ...firstImageMask } : undefined,
    textMask: firstTextMask ? { ...firstTextMask } : undefined,
    imageMasks: imageMasks.length > 0 ? imageMasks : undefined,
    textMasks: textMasks.length > 0 ? textMasks : undefined,
    autoMorph: hybrid.autoMorph,
    maskTimeline: hasTimelineConfig ? timeline : undefined,
    initialMask: hybrid.initialMask
  };
}

export function createMaskConfig(mask?: PixelGridMaskInput): Partial<PixelGridConfig> {
  return toMaskConfig(mask);
}

export function resolveGridConfigInput(params: {
  preset?: PixelGridPresetName;
  gridConfig?: Partial<PixelGridConfig>;
  mask?: PixelGridMaskInput;
}): PixelGridConfig {
  const { preset = "minimal", gridConfig, mask } = params;
  const presetConfig = createPixelPreset(preset);
  const withOverrides = mergePixelOptions(presetConfig, gridConfig ?? {});
  const withMask = mergePixelOptions(withOverrides, toMaskConfig(mask));

  const safeColors =
    withMask.colors && withMask.colors.length > 0
      ? withMask.colors
      : presetConfig.colors;
  if (!withMask.colors || withMask.colors.length === 0) {
    warnDev("gridConfig.colors was missing or empty. Falling back to preset colors.");
  }

  const safeGap = withMask.gap > 0 ? withMask.gap : presetConfig.gap;
  if (!(withMask.gap > 0)) {
    warnDev("gridConfig.gap must be > 0. Falling back to preset gap.");
  }

  const safeExpandEase = withMask.expandEase > 0 ? withMask.expandEase : presetConfig.expandEase;
  if (!(withMask.expandEase > 0)) {
    warnDev("gridConfig.expandEase must be > 0. Falling back to preset expandEase.");
  }

  const safeBreathSpeed =
    withMask.breathSpeed > 0 ? withMask.breathSpeed : presetConfig.breathSpeed;
  if (!(withMask.breathSpeed > 0)) {
    warnDev("gridConfig.breathSpeed must be > 0. Falling back to preset breathSpeed.");
  }

  const hasAnyImageMask =
    !!withMask.imageMask?.src ||
    !!withMask.imageMasks?.some((imageMask) => !!imageMask.src?.trim()) ||
    !!withMask.maskTimeline?.items?.some(
      (item) => item.type === "image" && !!item.src?.trim()
    );
  if (preset === "hero-image" && !hasAnyImageMask) {
    warnDev("Preset 'hero-image' is intended to be used with an image mask (`mask.image` or `gridConfig.imageMask`).");
  }
  if (mask?.type === "text" && !mask.text.trim()) {
    warnDev("Text mask is empty. Provide a non-empty `mask.text` value.");
  }
  if (mask?.type === "image" && !mask.src.trim()) {
    warnDev("Image mask `src` is empty. Provide a valid image URL.");
  }
  if (mask?.type === "hybrid" && mask.image && !mask.image.src.trim()) {
    warnDev("Hybrid mask image `src` is empty. Provide a valid image URL.");
  }
  if (mask?.type === "hybrid" && mask.text && !mask.text.text.trim()) {
    warnDev("Hybrid mask text is empty. Provide a non-empty `mask.text.text` value.");
  }
  if (mask?.type === "hybrid" && mask.images?.some((image) => !image.src.trim())) {
    warnDev("Hybrid mask contains image entries with empty `src`.");
  }
  if (mask?.type === "hybrid" && mask.texts?.some((text) => !text.text.trim())) {
    warnDev("Hybrid mask contains text entries with empty `text`.");
  }
  if (mask?.type === "hybrid") {
    validateHybridTimelineConsistency(withMask);
  }

  const legacyHover = withMask.hoverEffects as (typeof withMask.hoverEffects & {
    radiusY?: unknown;
    shape?: unknown;
  });
  if (legacyHover?.radiusY !== undefined) {
    warnDev("hoverEffects.radiusY is no longer supported. Use hoverEffects.radius.");
  }
  if (legacyHover?.shape !== undefined && legacyHover.shape !== "circle") {
    warnDev("hoverEffects.shape only supports \"circle\" in the current API.");
  }

  const hover = withMask.hoverEffects
    ? {
      ...withMask.hoverEffects,
      radius: ensurePositive(withMask.hoverEffects.radius, 120, "hoverEffects.radius"),
      strength: ensureNonNegative(withMask.hoverEffects.strength, 1, "hoverEffects.strength"),
      deactivate: clamp(
        ensureNonNegative(withMask.hoverEffects.deactivate, 0.8, "hoverEffects.deactivate"),
        0,
        1
      ),
      displace: ensureNonNegative(withMask.hoverEffects.displace, 3, "hoverEffects.displace"),
      jitter: ensureNonNegative(withMask.hoverEffects.jitter, 1.25, "hoverEffects.jitter"),
      magnetic: withMask.hoverEffects.magnetic
        ? {
          ...withMask.hoverEffects.magnetic,
          strength: ensureNonNegative(
            withMask.hoverEffects.magnetic.strength,
            2.5,
            "hoverEffects.magnetic.strength"
          ),
          radius: ensurePositive(
            withMask.hoverEffects.magnetic.radius,
            withMask.hoverEffects.radius ?? 120,
            "hoverEffects.magnetic.radius"
          )
        }
        : undefined
    }
    : undefined;

  const ripple = withMask.rippleEffects
    ? {
      ...withMask.rippleEffects,
      speed: ensurePositive(withMask.rippleEffects.speed, 0.5, "rippleEffects.speed"),
      thickness: ensurePositive(withMask.rippleEffects.thickness, 50, "rippleEffects.thickness"),
      strength: ensureNonNegative(withMask.rippleEffects.strength, 30, "rippleEffects.strength"),
      maxRipples: Math.max(
        1,
        Math.round(
          ensurePositive(withMask.rippleEffects.maxRipples, 20, "rippleEffects.maxRipples")
        )
      ),
      deactivateMultiplier: ensureNonNegative(
        withMask.rippleEffects.deactivateMultiplier,
        1,
        "rippleEffects.deactivateMultiplier"
      ),
      displaceMultiplier: ensureNonNegative(
        withMask.rippleEffects.displaceMultiplier,
        1,
        "rippleEffects.displaceMultiplier"
      ),
      jitterMultiplier: ensureNonNegative(
        withMask.rippleEffects.jitterMultiplier,
        1,
        "rippleEffects.jitterMultiplier"
      )
    }
    : undefined;

  const breathing = withMask.breathing
    ? {
      ...withMask.breathing,
      speed: ensurePositive(withMask.breathing.speed, 1, "breathing.speed"),
      radius: ensurePositive(
        withMask.breathing.radius,
        hover?.radius ?? 120,
        "breathing.radius"
      ),
      radiusY: ensurePositive(
        withMask.breathing.radiusY ?? withMask.breathing.radius,
        hover?.radius ?? 120,
        "breathing.radiusY"
      ),
      strength: ensureNonNegative(withMask.breathing.strength, 0.9, "breathing.strength"),
      minOpacity: clamp(
        ensureNonNegative(withMask.breathing.minOpacity, 0.55, "breathing.minOpacity"),
        0,
        1
      ),
      maxOpacity: clamp(
        ensureNonNegative(withMask.breathing.maxOpacity, 1, "breathing.maxOpacity"),
        0,
        1
      )
    }
    : undefined;

  if (breathing && breathing.minOpacity > breathing.maxOpacity) {
    warnDev("breathing.minOpacity cannot be greater than breathing.maxOpacity. Swapping values.");
    const min = breathing.maxOpacity;
    const max = breathing.minOpacity;
    breathing.minOpacity = min;
    breathing.maxOpacity = max;
  }

  return {
    ...withMask,
    colors: safeColors,
    gap: safeGap,
    expandEase: safeExpandEase,
    breathSpeed: safeBreathSpeed,
    hoverEffects: hover,
    rippleEffects: ripple,
    breathing
  };
}
