import { useEffect, useMemo, useRef } from "react";
import { PixelGridEffect } from "@pixel-engine/effects";
import { usePixelEngine } from "./usePixelEngine";
import { UsePixelGridEffectOptions, UsePixelGridEffectResult } from "./types";
import { resolveGridConfigInput } from "./grid-config";

function toLocalCoords(canvas: HTMLCanvasElement, event: MouseEvent | PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    nativeEvent: event
  };
}

function getCanvasClientSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(canvas.clientWidth)),
    height: Math.max(1, Math.round(canvas.clientHeight))
  };
}

function resolveEffectSize(
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number,
  gridWidth: number | undefined,
  gridHeight: number | undefined,
  fitMode: "none" | "client"
): { width: number; height: number } {
  const clientSize = fitMode === "client" && canvas ? getCanvasClientSize(canvas) : null;
  return {
    width: Math.max(1, Math.round(gridWidth ?? clientSize?.width ?? width)),
    height: Math.max(1, Math.round(gridHeight ?? clientSize?.height ?? height))
  };
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function usePixelGridEffect(options: UsePixelGridEffectOptions): UsePixelGridEffectResult {
  const {
    width,
    height,
    gridWidth,
    gridHeight,
    preset,
    mask,
    gridConfig,
    influenceOptions,
    effectKey = "default",
    autoAttach = true,
    rippleTrigger = "click",
    fitMode = "none",
    resizeMode = "observer",
    onGridReady,
    onRipple,
    createGridEffect,
    ...engineOptions
  } = options;

  const { canvasRef, engine, isReady } = usePixelEngine({
    width,
    height,
    fitMode,
    resizeMode,
    ...engineOptions
  });
  const resolvedGridConfig = useMemo(
    () =>
      resolveGridConfigInput({
        preset,
        gridConfig,
        mask
      }),
    [gridConfig, mask, preset]
  );
  const resolvedGridConfigSignature = useMemo(
    () => stableSerialize(resolvedGridConfig),
    [resolvedGridConfig]
  );
  const influenceOptionsSignature = useMemo(
    () => stableSerialize(influenceOptions),
    [influenceOptions]
  );
  const gridRef = useRef<PixelGridEffect | null>(null);
  const onGridReadyRef = useRef(onGridReady);
  const onRippleRef = useRef(onRipple);
  const createGridEffectRef = useRef(createGridEffect);
  const gridConfigRef = useRef(resolvedGridConfig);
  const influenceOptionsRef = useRef(influenceOptions);

  useEffect(() => {
    onGridReadyRef.current = onGridReady;
    onRippleRef.current = onRipple;
    createGridEffectRef.current = createGridEffect;
    gridConfigRef.current = resolvedGridConfig;
    influenceOptionsRef.current = influenceOptions;
  }, [createGridEffect, influenceOptions, onGridReady, onRipple, resolvedGridConfig]);

  useEffect(() => {
    if (!engine) return;
    const canvas = canvasRef.current;
    const size = resolveEffectSize(canvas, width, height, gridWidth, gridHeight, fitMode);
    const effect = createGridEffectRef.current
      ? createGridEffectRef.current(
        engine,
        size.width,
        size.height,
        gridConfigRef.current,
        influenceOptionsRef.current
      )
      : new PixelGridEffect(
        engine,
        size.width,
        size.height,
        gridConfigRef.current,
        influenceOptionsRef.current
      );

    gridRef.current = effect;
    if (autoAttach) {
      engine.addEntity(effect);
    }
    onGridReadyRef.current?.(effect, engine);

    return () => {
      if (autoAttach) {
        engine.removeEntity(effect);
      }
      if (gridRef.current === effect) {
        gridRef.current = null;
      }
    };
  }, [autoAttach, effectKey, engine, influenceOptionsSignature, resolvedGridConfigSignature]);

  useEffect(() => {
    const effect = gridRef.current;
    if (!effect) return;
    const size = resolveEffectSize(
      canvasRef.current,
      width,
      height,
      gridWidth,
      gridHeight,
      fitMode
    );
    effect.resize?.(size.width, size.height);
  }, [canvasRef, effectKey, fitMode, gridHeight, gridWidth, height, width]);

  useEffect(() => {
    if (fitMode !== "client") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const applyResize = () => {
      const effect = gridRef.current;
      if (!effect) return;
      const size = resolveEffectSize(
        canvas,
        width,
        height,
        gridWidth,
        gridHeight,
        fitMode
      );
      effect.resize?.(size.width, size.height);
    };

    if (resizeMode === "observer" && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => applyResize());
      ro.observe(canvas);
      return () => ro.disconnect();
    }
    if (resizeMode === "window") {
      window.addEventListener("resize", applyResize, { passive: true });
      return () => window.removeEventListener("resize", applyResize);
    }
  }, [canvasRef, effectKey, fitMode, gridHeight, gridWidth, height, resizeMode, width]);

  useEffect(() => {
    if (rippleTrigger === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleRipple = (event: MouseEvent | PointerEvent) => {
      const effect = gridRef.current;
      if (!effect) return;
      const payload = toLocalCoords(canvas, event);
      effect.triggerRipple(payload.x, payload.y);
      onRippleRef.current?.(payload);
    };

    if (rippleTrigger === "pointerdown") {
      canvas.addEventListener("pointerdown", handleRipple, { passive: true });
      return () => canvas.removeEventListener("pointerdown", handleRipple);
    }

    canvas.addEventListener("click", handleRipple, { passive: true });
    return () => canvas.removeEventListener("click", handleRipple);
  }, [canvasRef, isReady, rippleTrigger, effectKey]);

  return {
    canvasRef,
    engine,
    isReady,
    grid: gridRef.current
  };
}
