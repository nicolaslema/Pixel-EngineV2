import { MutableRefObject, RefObject, useEffect } from "react";
import { PixelGridEffect } from "@pixel-engine/effects";
import { ScrollReactiveDirection, ScrollReactiveEdge, ScrollReactiveGridOptions } from "./types";

interface UseScrollReactiveGridParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gridRef: MutableRefObject<PixelGridEffect | null>;
  options?: ScrollReactiveGridOptions;
}

interface ResolvedScrollReactiveGridOptions {
  enabled: boolean;
  intensity: number;
  direction: ScrollReactiveDirection;
  edge: ScrollReactiveEdge;
  cooldownMs: number;
  maxBurstRipples: number;
  respectReducedMotion: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveOptions(
  options: ScrollReactiveGridOptions | undefined
): ResolvedScrollReactiveGridOptions {
  return {
    enabled: options?.enabled ?? false,
    intensity: clamp(options?.intensity ?? 1, 0, 4),
    direction: options?.direction ?? "both",
    edge: options?.edge ?? "leading",
    cooldownMs: clamp(options?.cooldownMs ?? 90, 0, 2000),
    maxBurstRipples: Math.max(1, Math.round(options?.maxBurstRipples ?? 3)),
    respectReducedMotion: options?.respectReducedMotion ?? true
  };
}

function isDirectionAllowed(allowed: ScrollReactiveDirection, direction: "up" | "down"): boolean {
  return allowed === "both" || allowed === direction;
}

function shouldReduceMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resolveOriginY(
  edge: ScrollReactiveEdge,
  direction: "up" | "down",
  height: number
): number {
  if (edge === "center") return height * 0.5;
  const top = 2;
  const bottom = Math.max(2, height - 2);
  if (edge === "leading") {
    return direction === "down" ? bottom : top;
  }
  return direction === "down" ? top : bottom;
}

export function useScrollReactiveGrid(params: UseScrollReactiveGridParams): void {
  const options = resolveOptions(params.options);

  useEffect(() => {
    if (!options.enabled) return;
    if (typeof window === "undefined") return;
    if (options.respectReducedMotion && shouldReduceMotion()) return;

    let rafId = 0;
    let latestScrollY = window.scrollY || window.pageYOffset || 0;
    let latestTimestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
    let lastScrollY = latestScrollY;
    let lastTimestamp = latestTimestamp;
    let lastTriggerTimestamp = 0;

    const flush = () => {
      rafId = 0;
      const dy = latestScrollY - lastScrollY;
      if (Math.abs(dy) < 0.5) return;

      const direction: "up" | "down" = dy > 0 ? "down" : "up";
      if (!isDirectionAllowed(options.direction, direction)) {
        lastScrollY = latestScrollY;
        lastTimestamp = latestTimestamp;
        return;
      }

      const now = latestTimestamp;
      if (now - lastTriggerTimestamp < options.cooldownMs) {
        lastScrollY = latestScrollY;
        lastTimestamp = latestTimestamp;
        return;
      }

      const dt = Math.max(1, now - lastTimestamp);
      const velocity = Math.abs(dy) / dt;
      const normalizedIntensity = clamp(velocity * 16 * options.intensity, 0, 1);
      if (normalizedIntensity <= 0.01) {
        lastScrollY = latestScrollY;
        lastTimestamp = latestTimestamp;
        return;
      }

      const canvas = params.canvasRef.current;
      const grid = params.gridRef.current;
      if (!canvas || !grid) {
        lastScrollY = latestScrollY;
        lastTimestamp = latestTimestamp;
        return;
      }

      const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
      const height = Math.max(1, canvas.clientHeight || canvas.height || 1);
      const rippleCount = Math.max(
        1,
        Math.round(1 + normalizedIntensity * (options.maxBurstRipples - 1))
      );
      const centerX = width * 0.5;
      const spread = Math.max(8, width * 0.18 * normalizedIntensity);
      const originY = resolveOriginY(options.edge, direction, height);

      for (let index = 0; index < rippleCount; index++) {
        const ratio = rippleCount === 1 ? 0.5 : index / (rippleCount - 1);
        const offset = (ratio - 0.5) * 2 * spread;
        const x = clamp(centerX + offset, 0, width);
        grid.triggerRipple(x, originY);
      }

      lastTriggerTimestamp = now;
      lastScrollY = latestScrollY;
      lastTimestamp = latestTimestamp;
    };

    const onScroll = () => {
      latestScrollY = window.scrollY || window.pageYOffset || 0;
      latestTimestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (!rafId) {
        rafId = window.requestAnimationFrame(flush);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [
    params.canvasRef,
    params.gridRef,
    options.enabled,
    options.intensity,
    options.direction,
    options.edge,
    options.cooldownMs,
    options.maxBurstRipples,
    options.respectReducedMotion
  ]);
}
