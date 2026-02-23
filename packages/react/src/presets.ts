import { PixelGridConfig } from "@pixel-engine/effects";
import { PixelGridPresetDefinition, PixelGridPresetName } from "./types";

const BASE_MINIMAL: PixelGridConfig = {
  colors: ["#334155", "#475569", "#64748b"],
  gap: 7,
  expandEase: 0.08,
  breathSpeed: 1
};

const PRESET_MAP: Record<PixelGridPresetName, PixelGridConfig> = {
  minimal: BASE_MINIMAL,
  "card-soft": {
    ...BASE_MINIMAL,
    hoverEffects: {
      mode: "reactive",
      shape: "vignette",
      radius: 110,
      strength: 0.75,
      displace: 2,
      jitter: 0.8
    },
    breathing: {
      enabled: true,
      speed: 1.1,
      strength: 0.5,
      minOpacity: 0.6,
      maxOpacity: 1
    }
  },
  "card-ripple": {
    ...BASE_MINIMAL,
    rippleEffects: {
      enabled: true,
      speed: 0.5,
      thickness: 52,
      strength: 28,
      maxRipples: 28
    },
    hoverEffects: {
      mode: "reactive",
      shape: "circle",
      radius: 115,
      displace: 3.5,
      jitter: 1.1
    }
  },
  "hero-image": {
    ...BASE_MINIMAL,
    gap: 6,
    hoverEffects: {
      mode: "reactive",
      shape: "vignette",
      radius: 140,
      radiusY: 105,
      displace: 4.5,
      jitter: 1.35,
      interactionScope: "imageMask"
    },
    rippleEffects: {
      enabled: true,
      speed: 0.45,
      thickness: 56,
      strength: 32,
      maxRipples: 36,
      displaceMultiplier: 1.2,
      jitterMultiplier: 1.2
    },
    breathing: {
      enabled: true,
      speed: 1.4,
      strength: 0.75,
      affectImage: true,
      affectText: true
    }
  }
};

const PRESET_DEFINITIONS: Record<PixelGridPresetName, PixelGridPresetDefinition> = {
  minimal: {
    name: "minimal",
    description: "Low-complexity baseline with no strong reactive bias.",
    recommendedFor: "Backgrounds, neutral surfaces, low-noise layouts.",
    maskSupport: "optional"
  },
  "card-soft": {
    name: "card-soft",
    description: "Soft reactive hover + subtle breathing for UI cards.",
    recommendedFor: "Panels, cards, dashboard tiles, ambient interactions.",
    maskSupport: "optional"
  },
  "card-ripple": {
    name: "card-ripple",
    description: "Ripple-forward interactions with medium reactive hover.",
    recommendedFor: "Interactive cards, CTA surfaces, click feedback.",
    maskSupport: "optional"
  },
  "hero-image": {
    name: "hero-image",
    description: "High-presence interactive style tuned for image/text masks.",
    recommendedFor: "Hero sections, landing intros, visual showcases.",
    maskSupport: "recommended"
  }
};

function cloneConfig(config: PixelGridConfig): PixelGridConfig {
  const clonedMaskTimeline =
    config.maskTimeline
      ? {
        ...config.maskTimeline,
        defaultTransition: config.maskTimeline.defaultTransition
          ? { ...config.maskTimeline.defaultTransition }
          : undefined,
        steps: config.maskTimeline.steps
          ? config.maskTimeline.steps.map((step) => ({
            ...step,
            transition: step.transition ? { ...step.transition } : undefined
          }))
          : undefined
      }
      : undefined;

  return {
    ...config,
    hoverEffects: config.hoverEffects ? { ...config.hoverEffects } : undefined,
    rippleEffects: config.rippleEffects ? { ...config.rippleEffects } : undefined,
    breathing: config.breathing ? { ...config.breathing } : undefined,
    autoMorph: config.autoMorph ? { ...config.autoMorph } : undefined,
    maskTimeline: clonedMaskTimeline,
    imageMask: config.imageMask ? { ...config.imageMask } : undefined,
    textMask: config.textMask ? { ...config.textMask } : undefined
  };
}

export function createPixelPreset(
  preset: PixelGridPresetName,
  overrides?: Partial<PixelGridConfig>
): PixelGridConfig {
  const base = cloneConfig(PRESET_MAP[preset] ?? PRESET_MAP.minimal);
  return mergePixelOptions(base, overrides ?? {});
}

export function getPixelPresetDefinition(
  preset: PixelGridPresetName
): PixelGridPresetDefinition {
  return { ...PRESET_DEFINITIONS[preset] };
}

export function listPixelPresets(): PixelGridPresetDefinition[] {
  return (Object.keys(PRESET_DEFINITIONS) as PixelGridPresetName[]).map((name) => ({
    ...PRESET_DEFINITIONS[name]
  }));
}

export function mergePixelOptions(
  base: PixelGridConfig,
  override: Partial<PixelGridConfig>
): PixelGridConfig {
  const mergedHover =
    base.hoverEffects || override.hoverEffects
      ? {
        ...(base.hoverEffects ?? {}),
        ...(override.hoverEffects ?? {})
      }
      : undefined;
  const mergedRipple =
    base.rippleEffects || override.rippleEffects
      ? {
        ...(base.rippleEffects ?? {}),
        ...(override.rippleEffects ?? {})
      }
      : undefined;
  const mergedBreathing =
    base.breathing || override.breathing
      ? {
        ...(base.breathing ?? {}),
        ...(override.breathing ?? {})
      }
      : undefined;
  const mergedAutoMorph =
    base.autoMorph || override.autoMorph
      ? {
        ...(base.autoMorph ?? {}),
        ...(override.autoMorph ?? {})
      }
      : undefined;
  const mergedMaskTimeline =
    base.maskTimeline || override.maskTimeline
      ? {
        ...(base.maskTimeline ?? {}),
        ...(override.maskTimeline ?? {}),
        defaultTransition:
          base.maskTimeline?.defaultTransition || override.maskTimeline?.defaultTransition
            ? {
              ...(base.maskTimeline?.defaultTransition ?? {}),
              ...(override.maskTimeline?.defaultTransition ?? {})
            }
            : undefined,
        steps: override.maskTimeline?.steps
          ? override.maskTimeline.steps.map((step) => ({
            ...step,
            transition: step.transition ? { ...step.transition } : undefined
          }))
          : base.maskTimeline?.steps
            ? base.maskTimeline.steps.map((step) => ({
              ...step,
              transition: step.transition ? { ...step.transition } : undefined
            }))
            : undefined
      }
      : undefined;
  const mergedImageMask =
    base.imageMask || override.imageMask
      ? {
        ...(base.imageMask ?? {}),
        ...(override.imageMask ?? {})
      }
      : undefined;

  let mergedTextMask: PixelGridConfig["textMask"] | undefined;
  if (base.textMask || override.textMask) {
    const nextTextMask = {
      ...(base.textMask ?? {}),
      ...(override.textMask ?? {})
    };
    if (nextTextMask.font) {
      mergedTextMask = {
        ...nextTextMask,
        font: nextTextMask.font
      };
    }
  }

  return {
    ...base,
    ...override,
    hoverEffects: mergedHover,
    rippleEffects: mergedRipple,
    breathing: mergedBreathing,
    autoMorph: mergedAutoMorph,
    maskTimeline: mergedMaskTimeline,
    imageMask: mergedImageMask,
    textMask: mergedTextMask
  };
}
