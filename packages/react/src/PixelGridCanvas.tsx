import { CSSProperties, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { PixelGridEffect } from "@pixel-engine/effects";
import { usePixelGridEffect } from "./usePixelGridEffect";
import { PixelGridCanvasHandle, PixelGridCanvasProps } from "./types";
import { useScrollReactiveGrid } from "./useScrollReactiveGrid";
import { useSectionTransitionPreset } from "./useSectionTransitionPreset";
import { useDebugHudOverlay } from "./useDebugHudOverlay";
import { resolveSsrPlaceholderCanvasStyle } from "./ssr-placeholder";
import { warnIfResponsiveCanvasStyleMismatch } from "./canvas-responsive-warning";
import {
  mergeGridConfigPartials,
  resolveStatePresetGridOverride,
  resolveThemeSyncGridOverride,
  useResolvedThemeMode
} from "./theme-state-presets";

const baseStyle: CSSProperties = {
  display: "block"
};

/**
 * Declarative wrapper around `usePixelGridEffect`: renders the `<canvas>` and layers in
 * preset/mask resolution, theme/state sync, scroll-reactive and section-transition behavior,
 * a debug HUD, and an SSR placeholder. `ref` exposes a `PixelGridCanvasHandle`
 * (`getEngine()`, `getGrid()`, `triggerRipple()`, mask-timeline playback controls).
 */
export const PixelGridCanvas = forwardRef<PixelGridCanvasHandle, PixelGridCanvasProps>(
  function PixelGridCanvas(props, ref) {
  const {
    className,
    style,
    decorative = true,
    role,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    respectReducedMotion,
    scrollReactive,
    sectionTransition,
    themeSync,
    statePreset,
    debugHud,
    ssrPlaceholder,
    gridConfig,
    onGridReady,
    ...gridOptions
  } = props;
  const gridRef = useRef<PixelGridEffect | null>(null);
  const resolvedThemeMode = useResolvedThemeMode(themeSync);
  const derivedGridConfig = useMemo(
    () =>
      mergeGridConfigPartials(
        respectReducedMotion === undefined ? undefined : { respectReducedMotion },
        gridConfig,
        resolveThemeSyncGridOverride(themeSync, resolvedThemeMode),
        resolveStatePresetGridOverride(statePreset)
      ),
    [gridConfig, respectReducedMotion, resolvedThemeMode, statePreset, themeSync]
  );

  const { canvasRef, engine, isReady } = usePixelGridEffect({
    ...gridOptions,
    gridConfig: derivedGridConfig,
    onGridReady: (effect, engine) => {
      gridRef.current = effect;
      onGridReady?.(effect, engine);
    }
  });

  useEffect(
    () => () => {
      gridRef.current = null;
    },
    []
  );

  useEffect(() => {
    warnIfResponsiveCanvasStyleMismatch(style, gridOptions.fitMode);
    // Deliberately depends on style.width/height (not the `style` object) so this doesn't
    // re-fire -- and re-console.warn -- on every render when a consumer passes an inline
    // style={{...}} literal (a fresh object identity each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style?.width, style?.height, gridOptions.fitMode]);

  useScrollReactiveGrid({
    canvasRef,
    gridRef,
    options: { respectReducedMotion, ...scrollReactive }
  });
  const sectionTransitionStyle = useSectionTransitionPreset({
    canvasRef,
    gridRef,
    options: { respectReducedMotion, ...sectionTransition }
  });
  const debugHudNode = useDebugHudOverlay({
    canvasRef,
    gridRef,
    engine,
    options: debugHud
  });
  const placeholderStyle = useMemo(
    () => resolveSsrPlaceholderCanvasStyle(ssrPlaceholder, isReady),
    [isReady, ssrPlaceholder]
  );

  useImperativeHandle(
    ref,
    () => ({
      getEngine: () => engine,
      getGrid: () => gridRef.current,
      triggerRipple: (x, y) => gridRef.current?.triggerRipple(x, y),
      playMaskTimeline: () => gridRef.current?.playMaskTimeline?.(),
      pauseMaskTimeline: () => gridRef.current?.pauseMaskTimeline?.(),
      resetMaskTimeline: () => gridRef.current?.resetMaskTimeline?.()
    }),
    [engine]
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        style={{ ...baseStyle, ...placeholderStyle, ...sectionTransitionStyle, ...style }}
        aria-hidden={decorative ? "true" : undefined}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      />
      {debugHudNode}
    </>
  );
  }
);
