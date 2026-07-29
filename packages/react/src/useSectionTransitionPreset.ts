import { CSSProperties, MutableRefObject, RefObject, useEffect, useMemo, useState } from "react";
import { PixelGridEffect, prefersReducedMotion } from "@pixel-engine/effects";
import { SectionTransitionOptions, SectionTransitionPresetName } from "./types";

interface UseSectionTransitionPresetParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gridRef: MutableRefObject<PixelGridEffect | null>;
  options?: SectionTransitionOptions;
}

interface ResolvedSectionTransitionOptions {
  enabled: boolean;
  preset: SectionTransitionPresetName;
  amount: number;
  threshold: number | number[];
  once: boolean;
  rippleOnEnter: boolean;
  playTimelineOnEnter: boolean;
  pauseTimelineOnExit: boolean;
  respectReducedMotion: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveOptions(
  options: SectionTransitionOptions | undefined
): ResolvedSectionTransitionOptions {
  return {
    enabled: options?.enabled ?? false,
    preset: options?.preset ?? "fade",
    amount: clamp(options?.amount ?? 24, 0, 120),
    threshold: options?.threshold ?? [0, 0.15, 0.35, 0.55, 0.75, 1],
    once: options?.once ?? false,
    rippleOnEnter: options?.rippleOnEnter ?? true,
    playTimelineOnEnter: options?.playTimelineOnEnter ?? true,
    pauseTimelineOnExit: options?.pauseTimelineOnExit ?? false,
    respectReducedMotion: options?.respectReducedMotion ?? true
  };
}

export function buildSectionTransitionStyle(
  progress: number,
  options: Pick<ResolvedSectionTransitionOptions, "enabled" | "preset" | "amount">
): CSSProperties {
  if (!options.enabled) return {};

  const p = clamp(progress, 0, 1);
  const amount = options.amount;

  if (options.preset === "fade") {
    return {
      opacity: 0.15 + p * 0.85,
      transform: "translate3d(0, 0, 0)",
      transition: "opacity 140ms linear, transform 140ms linear",
      willChange: "opacity, transform"
    };
  }

  if (options.preset === "zoom") {
    const delta = clamp(amount / 420, 0.02, 0.12);
    const scale = 1 - (1 - p) * delta;
    return {
      opacity: 0.2 + p * 0.8,
      transform: `translate3d(0, 0, 0) scale(${scale.toFixed(4)})`,
      transition: "opacity 160ms linear, transform 160ms linear",
      willChange: "opacity, transform"
    };
  }

  const y = (1 - p) * amount;
  return {
    opacity: 0.15 + p * 0.85,
    transform: `translate3d(0, ${y.toFixed(2)}px, 0)`,
    transition: "opacity 160ms linear, transform 160ms linear",
    willChange: "opacity, transform"
  };
}

export function useSectionTransitionPreset(params: UseSectionTransitionPresetParams): CSSProperties {
  const options = resolveOptions(params.options);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!options.enabled) return;
    if (typeof window === "undefined") return;

    const canvas = params.canvasRef.current;
    if (!canvas) return;

    const reduceMotion = options.respectReducedMotion && prefersReducedMotion();
    const enteredRef = { current: false };

    const onEnter = () => {
      const grid = params.gridRef.current;
      if (!grid) return;
      if (options.rippleOnEnter) {
        const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
        const height = Math.max(1, canvas.clientHeight || canvas.height || 1);
        grid.triggerRipple(width * 0.5, height * 0.5);
      }
      if (options.playTimelineOnEnter) {
        grid.playMaskTimeline?.();
      }
    };

    const onExit = () => {
      if (!options.pauseTimelineOnExit) return;
      params.gridRef.current?.pauseMaskTimeline?.();
    };

    if (typeof IntersectionObserver === "undefined") {
      setProgress(1);
      onEnter();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const ratio = clamp(entry.intersectionRatio, 0, 1);
        const isVisible = entry.isIntersecting && ratio > 0.01;
        setProgress(reduceMotion ? (isVisible ? 1 : 0) : ratio);

        if (isVisible && !enteredRef.current) {
          enteredRef.current = true;
          onEnter();
          if (options.once) {
            setProgress(1);
            observer.disconnect();
          }
          return;
        }

        if (!isVisible && enteredRef.current) {
          enteredRef.current = false;
          onExit();
        }
      },
      {
        threshold: options.threshold
      }
    );

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [
    params.canvasRef,
    params.gridRef,
    options.enabled,
    options.preset,
    options.amount,
    options.threshold,
    options.once,
    options.rippleOnEnter,
    options.playTimelineOnEnter,
    options.pauseTimelineOnExit,
    options.respectReducedMotion
  ]);

  return useMemo(
    () =>
      buildSectionTransitionStyle(progress, {
        enabled: options.enabled,
        preset: options.preset,
        amount: options.amount
      }),
    [options.amount, options.enabled, options.preset, progress]
  );
}
