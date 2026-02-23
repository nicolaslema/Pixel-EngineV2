import { ResolvedPixelGridConfig, PixelGridConfig } from "./types";

export function resolvePixelGridConfig(
  config: PixelGridConfig
): ResolvedPixelGridConfig {
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
  const maskTimeline = resolveMaskTimeline(config, autoMorph);

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
    initialMask: config.initialMask ?? "image"
  };
}

function resolveMaskTimeline(
  config: PixelGridConfig,
  autoMorph: Required<ResolvedPixelGridConfig["autoMorph"]>
): ResolvedPixelGridConfig["maskTimeline"] {
  type TimelineSourceStep = {
    mask: "image" | "text";
    holdMs?: number;
    transition?: {
      mode?: "morph" | "fade" | "dissolve";
      durationMs?: number;
      seed?: number;
    };
  };

  const explicitSteps: TimelineSourceStep[] = config.maskTimeline?.steps ?? [];
  const hasExplicitSteps = explicitSteps.length > 0;

  const legacySteps: TimelineSourceStep[] =
    autoMorph.enabled
      ? [
        {
          mask: "image" as const,
          holdMs: autoMorph.holdImageMs + autoMorph.intervalMs,
          transition: {
            mode: "morph" as const,
            durationMs: autoMorph.morphDurationMs
          }
        },
        {
          mask: "text" as const,
          holdMs: autoMorph.holdTextMs + autoMorph.intervalMs,
          transition: {
            mode: "morph" as const,
            durationMs: autoMorph.morphDurationMs
          }
        }
      ]
      : [];

  const sourceSteps = hasExplicitSteps ? explicitSteps : legacySteps;
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

  const resolvedSteps = sourceSteps.map((step, index) => ({
    mask: step.mask,
    holdMs: Math.max(0, step.holdMs ?? defaultHoldMs),
    transition: {
      mode: step.transition?.mode ?? defaultTransition.mode,
      durationMs: Math.max(1, step.transition?.durationMs ?? defaultTransition.durationMs),
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
