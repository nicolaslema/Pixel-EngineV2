import { useEffect, useMemo, useRef } from "react";
import { PixelGridEffect } from "@pixel-engine/effects";
import { usePixelEngine } from "./usePixelEngine";
import { UsePixelGridEffectOptions, UsePixelGridEffectResult } from "./types";
import { resolveGridConfigInputWithWarnings } from "./grid-config";
import { isPlainObject } from "./internal/deep-merge-config";

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

// Recursively sorts object keys so `stableSerialize` is independent of insertion order --
// two semantically-identical configs with keys inserted in a different order (e.g. from a
// CMS, or from spreads composed in a different order) must produce the same signature, or
// the effect below recreates the whole PixelGridEffect for no real reason (reloading image
// masks, resetting ripple pools, a visible jump in breathing phase).
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(sortKeysDeep(value));
  } catch {
    return String(value);
  }
}

/**
 * Owns a `PixelGridEffect` attached to a canvas managed by `usePixelEngine`.
 *
 * Recreates the underlying `PixelGridEffect` whenever the *resolved* `gridConfig`/
 * `influenceOptions` change in content (not identity) or `effectKey` changes — see
 * `MIGRATION.md` v1.0.21. Use `effectKey` to force an explicit remount independent of config.
 */
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
    onMaskError,
    onConfigWarning,
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
  const resolvedGridConfigResult = useMemo(
    () =>
      resolveGridConfigInputWithWarnings({
        preset,
        gridConfig,
        mask
      }),
    [gridConfig, mask, preset]
  );
  const resolvedGridConfig = resolvedGridConfigResult.config;
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
  const onMaskErrorRef = useRef(onMaskError);
  const onConfigWarningRef = useRef(onConfigWarning);
  const resolvedGridConfigResultRef = useRef(resolvedGridConfigResult);
  const createGridEffectRef = useRef(createGridEffect);
  const gridConfigRef = useRef(resolvedGridConfig);
  const influenceOptionsRef = useRef(influenceOptions);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const gridWidthRef = useRef(gridWidth);
  const gridHeightRef = useRef(gridHeight);
  const fitModeRef = useRef(fitMode);

  useEffect(() => {
    onGridReadyRef.current = onGridReady;
    onRippleRef.current = onRipple;
    onMaskErrorRef.current = onMaskError;
    onConfigWarningRef.current = onConfigWarning;
    resolvedGridConfigResultRef.current = resolvedGridConfigResult;
    createGridEffectRef.current = createGridEffect;
    gridConfigRef.current = resolvedGridConfig;
    influenceOptionsRef.current = influenceOptions;
    widthRef.current = width;
    heightRef.current = height;
    gridWidthRef.current = gridWidth;
    gridHeightRef.current = gridHeight;
    fitModeRef.current = fitMode;
  }, [
    createGridEffect,
    influenceOptions,
    onGridReady,
    onMaskError,
    onConfigWarning,
    onRipple,
    resolvedGridConfig,
    resolvedGridConfigResult,
    width,
    height,
    gridWidth,
    gridHeight,
    fitMode
  ]);

  // Gated on the stable signature (not resolvedGridConfigResult's own identity) for the same
  // reason the grid-creation effect below uses resolvedGridConfigSignature: gridConfig is
  // typically an inline object literal, so its identity -- and resolvedGridConfigResult's --
  // changes on every render even when content doesn't, which would fire onConfigWarning
  // repeatedly for the same warnings. The ref is always fresh by the time this effect runs,
  // since the ref-sync effect above (same commit, declared first) already updated it.
  useEffect(() => {
    const warnings = resolvedGridConfigResultRef.current.warnings;
    if (warnings.length === 0) return;
    onConfigWarningRef.current?.(warnings);
  }, [resolvedGridConfigSignature]);

  // width/height/gridWidth/gridHeight/fitMode are intentionally read via the refs above,
  // not declared as dependencies below: this effect only computes the *initial* size at
  // creation time, and resize is handled by the two separate effects further down. Reading
  // them via ref (rather than the plain closure values) resolves the exhaustive-deps warning
  // the correct way -- without an eslint-disable that could silently mask a real staleness
  // bug if this effect ever grows genuinely reactive logic later.
  useEffect(() => {
    if (!engine) return;
    const canvas = canvasRef.current;
    const size = resolveEffectSize(
      canvas,
      widthRef.current,
      heightRef.current,
      gridWidthRef.current,
      gridHeightRef.current,
      fitModeRef.current
    );
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
        influenceOptionsRef.current,
        { onMaskError: (event) => onMaskErrorRef.current?.(event) }
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
  }, [autoAttach, canvasRef, effectKey, engine, influenceOptionsSignature, resolvedGridConfigSignature]);

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
