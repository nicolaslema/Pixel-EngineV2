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

// Collects warnDev messages for resolveGridConfigInputWithWarnings without touching any of
// the call sites below -- set/restored around a single resolveGridConfigInput call.
let currentWarningCollector: string[] | null = null;

function warnDev(message: string): void {
  currentWarningCollector?.push(message);
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  console.warn(`[pixel-engine/react] ${message}`);
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
    // Auto-derive a default timeline step per declared mask, referencing it by id
    // (maskTimeline.steps) rather than redeclaring it (maskTimeline.items). textMasks/
    // imageMasks above are the single declaration of each mask; redeclaring the same
    // mask+id into maskTimeline.items would register it a second time under the same id
    // once normalizeMaskCollections (in @pixel-engine/effects) processes both collections,
    // and the second registration is dropped as a duplicate -- silently disabling the
    // whole auto-derived timeline whenever more than one mask of a type is provided.
    const derivedSteps: NonNullable<PixelGridConfig["maskTimeline"]>["steps"] = [];
    for (const textMask of textMasks) {
      derivedSteps.push({ mask: "text", assetId: textMask.id });
    }
    for (const imageMask of imageMasks) {
      derivedSteps.push({ mask: "image", assetId: imageMask.id });
    }
    if (derivedSteps.length > 0 && (!timeline.steps || timeline.steps.length === 0)) {
      timeline.steps = derivedSteps;
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

  // Emit exactly one of singular/plural per mask type (never both): normalizeMaskCollections
  // treats `imageMask`/`textMask` and `imageMasks`/`textMasks` as independent declaration
  // sources, so populating both with the same single entry registered it twice under the
  // same id, always producing a spurious "duplicate mask id ignored" warning.
  return {
    imageMask: imageMasks.length === 1 ? { ...imageMasks[0] } : undefined,
    textMask: textMasks.length === 1 ? { ...textMasks[0] } : undefined,
    imageMasks: imageMasks.length > 1 ? imageMasks : undefined,
    textMasks: textMasks.length > 1 ? textMasks : undefined,
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

  // hoverEffects/rippleEffects/breathing per-field defaults & clamps (radius, strength,
  // min/max opacity swap, legacy field detection, etc.) are intentionally NOT re-derived
  // here: @pixel-engine/effects' resolvePixelGridConfig (the PixelGridEffect constructor
  // always calls it) is the single authority for that. Re-deriving it here was pure
  // duplication of the exact same defaults, with no protection for consumers who
  // construct PixelGridEffect directly instead of through this resolver.
  return {
    ...withMask,
    colors: safeColors,
    gap: safeGap,
    expandEase: safeExpandEase,
    breathSpeed: safeBreathSpeed
  };
}

/**
 * Same resolution as `resolveGridConfigInput`, but also returns every warnDev message
 * produced while resolving (instead of only logging them via `console.warn`) -- backs
 * `usePixelGridEffect`'s `onConfigWarning` callback.
 */
export function resolveGridConfigInputWithWarnings(params: {
  preset?: PixelGridPresetName;
  gridConfig?: Partial<PixelGridConfig>;
  mask?: PixelGridMaskInput;
}): { config: PixelGridConfig; warnings: string[] } {
  const warnings: string[] = [];
  const previous = currentWarningCollector;
  currentWarningCollector = warnings;
  try {
    return { config: resolveGridConfigInput(params), warnings };
  } finally {
    currentWarningCollector = previous;
  }
}
