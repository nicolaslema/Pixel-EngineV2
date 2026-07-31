import { CSSProperties, MutableRefObject, ReactNode, RefObject, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "@pixel-engine/effects";
import { DebugHudOptions, DebugHudPosition } from "./types";

interface UseDebugHudOverlayParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gridRef: MutableRefObject<PixelGridEffect | null>;
  engine: PixelEngine | null;
  options?: DebugHudOptions;
}

interface ResolvedDebugHudOptions {
  enabled: boolean;
  position: DebugHudPosition;
  updateIntervalMs: number;
  offsetX: number;
  offsetY: number;
  showFps: boolean;
  showQuality: boolean;
  showLoop: boolean;
  showCells: boolean;
  showRipples: boolean;
  showTimeline: boolean;
}

const hudStyle: CSSProperties = {
  position: "fixed",
  zIndex: 2147483647,
  pointerEvents: "none",
  background: "rgba(2, 6, 23, 0.86)",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  borderRadius: "8px",
  padding: "8px 10px",
  color: "#e2e8f0",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "11px",
  lineHeight: "1.45",
  whiteSpace: "pre"
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveOptions(options: DebugHudOptions | undefined): ResolvedDebugHudOptions {
  return {
    enabled: options?.enabled ?? false,
    position: options?.position ?? "top-left",
    updateIntervalMs: clamp(options?.updateIntervalMs ?? 200, 16, 2000),
    offsetX: options?.offsetX ?? 10,
    offsetY: options?.offsetY ?? 10,
    showFps: options?.showFps ?? true,
    showQuality: options?.showQuality ?? true,
    showLoop: options?.showLoop ?? false,
    showCells: options?.showCells ?? true,
    showRipples: options?.showRipples ?? true,
    showTimeline: options?.showTimeline ?? true
  };
}

function setHudPosition(
  hud: HTMLDivElement,
  rect: DOMRect,
  options: ResolvedDebugHudOptions
): void {
  const { offsetX, offsetY, position } = options;
  const xLeft = rect.left + offsetX;
  const xRight = window.innerWidth - rect.right + offsetX;
  const yTop = rect.top + offsetY;
  const yBottom = window.innerHeight - rect.bottom + offsetY;

  hud.style.left = "";
  hud.style.right = "";
  hud.style.top = "";
  hud.style.bottom = "";

  if (position === "top-left") {
    hud.style.left = `${xLeft}px`;
    hud.style.top = `${yTop}px`;
    return;
  }
  if (position === "top-right") {
    hud.style.right = `${xRight}px`;
    hud.style.top = `${yTop}px`;
    return;
  }
  if (position === "bottom-left") {
    hud.style.left = `${xLeft}px`;
    hud.style.bottom = `${yBottom}px`;
    return;
  }
  hud.style.right = `${xRight}px`;
  hud.style.bottom = `${yBottom}px`;
}

/**
 * Renders a fixed-position debug HUD (fps/quality/cells/ripples/timeline) into
 * `document.body` via a React portal when `options.enabled`. Returns the portal node —
 * the caller must render the returned value for the HUD to actually mount (this hook does
 * not append anything to the DOM on its own). Returns `null` when disabled or outside a
 * browser (`document` unavailable, e.g. SSR).
 */
export function useDebugHudOverlay(params: UseDebugHudOverlayParams): ReactNode | null {
  const options = resolveOptions(params.options);
  const hudRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!options.enabled) return;
    if (typeof window === "undefined") return;
    const hud = hudRef.current;
    if (!hud) return;

    const update = () => {
      const canvas = params.canvasRef.current;
      if (!canvas) {
        hud.textContent = "pixel-engine hud: canvas unavailable";
        return;
      }

      const rect = canvas.getBoundingClientRect();
      setHudPosition(hud, rect, options);

      const engine = params.engine;
      const grid = params.gridRef.current;
      const lines: string[] = ["pixel-engine hud"];

      if (options.showFps) {
        const fps = engine?.getFPS?.();
        lines.push(`fps: ${typeof fps === "number" ? fps.toFixed(1) : "-"}`);
      }
      if (options.showQuality) {
        const quality = engine?.getQuality?.();
        lines.push(`quality: ${quality ?? "-"}`);
      }
      if (options.showLoop) {
        const loop = engine?.getLoopTuning?.();
        if (loop) {
          lines.push(
            `loop: step=${loop.fixedTimeStep.toFixed(2)} maxDelta=${loop.maxDelta} maxUpdates=${loop.maxUpdatesPerFrame}`
          );
        }
      }

      const snapshot = grid?.getDebugSnapshot?.();
      if (options.showCells) {
        if (snapshot) {
          lines.push(`cells: ${snapshot.activeCells}/${snapshot.totalCells}`);
        } else {
          lines.push("cells: -");
        }
      }
      if (options.showRipples) {
        lines.push(`ripples: ${snapshot?.activeRipples ?? "-"}`);
      }
      if (options.showTimeline) {
        if (snapshot) {
          lines.push(
            `timeline: ${snapshot.timeline.playing ? "playing" : "paused"} step=${snapshot.timeline.stepIndex}`
          );
        } else {
          lines.push("timeline: -");
        }
      }

      hud.textContent = lines.join("\n");
    };

    update();
    const timer = window.setInterval(update, options.updateIntervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [
    params.canvasRef,
    params.engine,
    params.gridRef,
    options.enabled,
    options.position,
    options.updateIntervalMs,
    options.offsetX,
    options.offsetY,
    options.showFps,
    options.showQuality,
    options.showLoop,
    options.showCells,
    options.showRipples,
    options.showTimeline
  ]);

  if (!options.enabled || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={hudRef}
      data-pixel-engine-debug-hud="true"
      role="status"
      aria-live="polite"
      style={hudStyle}
    />,
    document.body
  );
}
