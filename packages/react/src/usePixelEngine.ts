import { useEffect, useRef, useState } from "react";
import { PixelEngine, PixelEngineOptions } from "@pixel-engine/core";
import { UsePixelEngineOptions, UsePixelEngineResult } from "./types";

function getClientSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(canvas.clientWidth)),
    height: Math.max(1, Math.round(canvas.clientHeight))
  };
}

/**
 * Owns a `PixelEngine` instance's lifecycle (construction, start, resize, teardown) bound to
 * a `<canvas>` via the returned `canvasRef`. SSR-safe: the engine is only constructed once
 * mounted in a browser (`typeof window !== "undefined"`).
 */
export function usePixelEngine(options: UsePixelEngineOptions): UsePixelEngineResult {
  const {
    width,
    height,
    autoStart = true,
    quality,
    loop,
    clearColor,
    devicePixelRatio,
    resizeMode = "observer",
    fitMode = "none",
    onReady,
    onDestroy,
    onHoverStart,
    onHoverEnd,
    onEngineError,
    createEngine
  } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const onReadyRef = useRef(onReady);
  const onDestroyRef = useRef(onDestroy);
  const onHoverStartRef = useRef(onHoverStart);
  const onHoverEndRef = useRef(onHoverEnd);
  const onEngineErrorRef = useRef(onEngineError);
  const createEngineRef = useRef(createEngine);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
    onDestroyRef.current = onDestroy;
    onHoverStartRef.current = onHoverStart;
    onHoverEndRef.current = onHoverEnd;
    onEngineErrorRef.current = onEngineError;
    createEngineRef.current = createEngine;
  }, [createEngine, onDestroy, onEngineError, onHoverEnd, onHoverStart, onReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resolvedSize =
      fitMode === "client"
        ? getClientSize(canvas)
        : { width: Math.max(1, width), height: Math.max(1, height) };

    const engineOptions: PixelEngineOptions = {
      canvas,
      width: resolvedSize.width,
      height: resolvedSize.height,
      quality,
      loop,
      clearColor,
      devicePixelRatio
    };

    let engine: PixelEngine;
    try {
      engine = createEngineRef.current
        ? createEngineRef.current(engineOptions)
        : new PixelEngine(engineOptions);
    } catch (error) {
      onEngineErrorRef.current?.(error);
      return () => {};
    }
    engineRef.current = engine;

    if (autoStart) engine.start();
    onReadyRef.current?.(engine);
    setIsReady(true);

    const toLocalPayload = (event: MouseEvent | PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        nativeEvent: event
      };
    };

    const handlePointerEnter = (event: PointerEvent) => {
      onHoverStartRef.current?.(toLocalPayload(event));
    };
    const handlePointerLeave = (event: PointerEvent) => {
      onHoverEndRef.current?.(toLocalPayload(event));
    };
    canvas.addEventListener("pointerenter", handlePointerEnter, { passive: true });
    canvas.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    let cleanupResize: (() => void) | null = null;
    if (fitMode === "client") {
      const applyResize = () => {
        const currentCanvas = canvasRef.current;
        const currentEngine = engineRef.current;
        if (!currentCanvas || !currentEngine) return;
        const next = getClientSize(currentCanvas);
        currentEngine.resize(next.width, next.height);
      };

      if (resizeMode === "observer" && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => applyResize());
        ro.observe(canvas);
        cleanupResize = () => ro.disconnect();
      } else if (resizeMode === "window") {
        window.addEventListener("resize", applyResize, { passive: true });
        cleanupResize = () => window.removeEventListener("resize", applyResize);
      }
    }

    return () => {
      canvas.removeEventListener("pointerenter", handlePointerEnter);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      cleanupResize?.();
      const current = engineRef.current;
      if (current) {
        onDestroyRef.current?.(current);
        current.destroy();
      }
      engineRef.current = null;
      setIsReady(false);
    };
  }, [
    autoStart,
    clearColor,
    devicePixelRatio,
    fitMode,
    height,
    loop,
    quality,
    resizeMode,
    width
  ]);

  return {
    canvasRef,
    engine: engineRef.current,
    isReady
  };
}
