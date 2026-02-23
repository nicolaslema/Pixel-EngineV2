import { PixelGridConfig } from "@pixel-engine/effects";
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
  return {
    imageMask: {
      src: hybrid.image.src,
      centerX: hybrid.image.centerX,
      centerY: hybrid.image.centerY,
      scale: hybrid.image.scale,
      sampleMode: hybrid.image.sampleMode,
      strength: hybrid.image.strength,
      threshold: hybrid.image.threshold,
      blurRadius: hybrid.image.blurRadius,
      dithering: hybrid.image.dithering
    },
    textMask: {
      text: hybrid.text.text,
      centerX: hybrid.text.centerX,
      centerY: hybrid.text.centerY,
      font: hybrid.text.font ?? "bold 160px Arial",
      strength: hybrid.text.strength,
      blurRadius: hybrid.text.blurRadius
    },
    autoMorph: hybrid.autoMorph,
    maskTimeline: hybrid.maskTimeline,
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

  if (preset === "hero-image" && !withMask.imageMask?.src) {
    warnDev("Preset 'hero-image' is intended to be used with an image mask (`mask.image` or `gridConfig.imageMask`).");
  }
  if (mask?.type === "text" && !mask.text.trim()) {
    warnDev("Text mask is empty. Provide a non-empty `mask.text` value.");
  }
  if (mask?.type === "image" && !mask.src.trim()) {
    warnDev("Image mask `src` is empty. Provide a valid image URL.");
  }
  if (mask?.type === "hybrid" && !mask.image.src.trim()) {
    warnDev("Hybrid mask image `src` is empty. Provide a valid image URL.");
  }
  if (mask?.type === "hybrid" && !mask.text.text.trim()) {
    warnDev("Hybrid mask text is empty. Provide a non-empty `mask.text.text` value.");
  }

  const hover = withMask.hoverEffects
    ? {
      ...withMask.hoverEffects,
      radius: ensurePositive(withMask.hoverEffects.radius, 120, "hoverEffects.radius"),
      radiusY: ensurePositive(
        withMask.hoverEffects.radiusY ?? withMask.hoverEffects.radius,
        withMask.hoverEffects.radius ?? 120,
        "hoverEffects.radiusY"
      ),
      strength: ensureNonNegative(withMask.hoverEffects.strength, 1, "hoverEffects.strength"),
      deactivate: clamp(
        ensureNonNegative(withMask.hoverEffects.deactivate, 0.8, "hoverEffects.deactivate"),
        0,
        1
      ),
      displace: ensureNonNegative(withMask.hoverEffects.displace, 3, "hoverEffects.displace"),
      jitter: ensureNonNegative(withMask.hoverEffects.jitter, 1.25, "hoverEffects.jitter")
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
        hover?.radiusY ?? hover?.radius ?? 120,
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
