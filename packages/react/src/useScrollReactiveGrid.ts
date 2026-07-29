import { MutableRefObject, RefObject, useEffect } from "react";
import { PixelGridEffect, prefersReducedMotion } from "@pixel-engine/effects";
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
  source: ScrollReactiveGridOptions["source"];
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
    source: options?.source ?? "auto",
    cooldownMs: clamp(options?.cooldownMs ?? 90, 0, 2000),
    maxBurstRipples: Math.max(1, Math.round(options?.maxBurstRipples ?? 3)),
    respectReducedMotion: options?.respectReducedMotion ?? true
  };
}

function isDirectionAllowed(allowed: ScrollReactiveDirection, direction: "up" | "down"): boolean {
  return allowed === "both" || allowed === direction;
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

type ScrollTarget = Window | HTMLElement;

function isRefSource(
  source: ScrollReactiveGridOptions["source"]
): source is RefObject<HTMLElement | null> {
  return typeof source === "object" && source !== null && "current" in source;
}

function readScrollOffset(target: ScrollTarget): number {
  if ("scrollTop" in target) {
    return target.scrollTop;
  }
  return target.scrollY || target.pageYOffset || 0;
}

function isScrollableElement(element: HTMLElement): boolean {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return false;
  const style = window.getComputedStyle(element);
  const overflowY = `${style.overflowY || ""} ${style.overflow || ""}`;
  return /(auto|scroll|overlay)/i.test(overflowY);
}

function findNearestScrollableAncestor(canvas: HTMLCanvasElement | null): HTMLElement | null {
  let node = canvas?.parentElement ?? null;
  while (node) {
    if (isScrollableElement(node)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function resolveScrollTargets(
  source: ScrollReactiveGridOptions["source"],
  canvas: HTMLCanvasElement | null
): { scrollTargets: ScrollTarget[]; wheelTarget: ScrollTarget } {
  if (typeof window === "undefined") {
    return { scrollTargets: [], wheelTarget: window };
  }

  if (source === "window") {
    return { scrollTargets: [window], wheelTarget: window };
  }

  if (source instanceof HTMLElement) {
    return { scrollTargets: [source], wheelTarget: source };
  }

  if (isRefSource(source)) {
    const node = source.current;
    if (node instanceof HTMLElement) {
      return { scrollTargets: [node], wheelTarget: node };
    }
    return { scrollTargets: [window], wheelTarget: window };
  }

  const autoContainer = findNearestScrollableAncestor(canvas);
  if (!autoContainer) {
    return { scrollTargets: [window], wheelTarget: window };
  }

  return { scrollTargets: [autoContainer, window], wheelTarget: autoContainer };
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function useScrollReactiveGrid(params: UseScrollReactiveGridParams): void {
  const options = resolveOptions(params.options);

  useEffect(() => {
    if (!options.enabled) return;
    if (typeof window === "undefined") return;
    if (options.respectReducedMotion && prefersReducedMotion()) return;

    const canvas = params.canvasRef.current;
    const { scrollTargets, wheelTarget } = resolveScrollTargets(options.source, canvas);
    if (scrollTargets.length === 0) return;

    let rafId = 0;
    let pendingDeltaY = 0;
    let lastProcessedTimestamp = nowMs();
    let lastBurstTimestamp = 0;
    let lastWheelTimestamp = Number.NEGATIVE_INFINITY;
    const lastOffsets = new Map<ScrollTarget, number>();
    for (const target of scrollTargets) {
      lastOffsets.set(target, readScrollOffset(target));
    }

    const scheduleFlush = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(flush);
      }
    };

    const flush = () => {
      rafId = 0;
      const dy = pendingDeltaY;
      pendingDeltaY = 0;
      if (Math.abs(dy) < 0.5) {
        return;
      }

      const direction: "up" | "down" = dy > 0 ? "down" : "up";
      if (!isDirectionAllowed(options.direction, direction)) {
        return;
      }

      const now = nowMs();
      if (now - lastBurstTimestamp < options.cooldownMs) {
        return;
      }

      const dt = Math.max(1, now - lastProcessedTimestamp);
      lastProcessedTimestamp = now;
      const velocity = Math.abs(dy) / dt;
      const normalizedIntensity = clamp(velocity * 16 * options.intensity, 0, 1);
      if (normalizedIntensity <= 0.01) {
        return;
      }

      const canvas = params.canvasRef.current;
      const grid = params.gridRef.current;
      if (!canvas || !grid) {
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

      lastBurstTimestamp = now;
    };

    const onScroll = (target: ScrollTarget) => () => {
      const now = nowMs();
      const previous = lastOffsets.get(target) ?? readScrollOffset(target);
      const current = readScrollOffset(target);
      lastOffsets.set(target, current);
      const delta = current - previous;
      if (Math.abs(delta) < 0.5) return;

      // Avoid counting wheel + scroll from the same gesture twice.
      if (now - lastWheelTimestamp < 40) {
        return;
      }

      pendingDeltaY += delta;
      scheduleFlush();
    };

    const onWheel: EventListener = (event) => {
      const wheelEvent = event as WheelEvent;
      if (!Number.isFinite(wheelEvent.deltaY) || Math.abs(wheelEvent.deltaY) < 0.01) return;
      lastWheelTimestamp = nowMs();
      pendingDeltaY += wheelEvent.deltaY;
      scheduleFlush();
    };

    const detachScrollHandlers: Array<() => void> = [];
    for (const target of scrollTargets) {
      const handler = onScroll(target);
      target.addEventListener("scroll", handler, { passive: true });
      detachScrollHandlers.push(() => target.removeEventListener("scroll", handler));
    }
    wheelTarget.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      for (const detach of detachScrollHandlers) {
        detach();
      }
      wheelTarget.removeEventListener("wheel", onWheel);
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
    options.source,
    options.cooldownMs,
    options.maxBurstRipples,
    options.respectReducedMotion
  ]);
}
