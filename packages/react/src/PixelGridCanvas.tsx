import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { PixelGridEffect } from "@pixel-engine/effects";
import { usePixelGridEffect } from "./usePixelGridEffect";
import { PixelGridCanvasProps } from "./types";
import { useScrollReactiveGrid } from "./useScrollReactiveGrid";
import { useSectionTransitionPreset } from "./useSectionTransitionPreset";
import { useDebugHudOverlay } from "./useDebugHudOverlay";
import { resolveSsrPlaceholderCanvasStyle } from "./ssr-placeholder";
import {
  mergeGridConfigPartials,
  resolveStatePresetGridOverride,
  resolveThemeSyncGridOverride,
  useResolvedThemeMode
} from "./theme-state-presets";

const baseStyle: CSSProperties = {
  display: "block"
};

export function PixelGridCanvas(props: PixelGridCanvasProps) {
  const {
    className,
    style,
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
        gridConfig,
        resolveThemeSyncGridOverride(themeSync, resolvedThemeMode),
        resolveStatePresetGridOverride(statePreset)
      ),
    [gridConfig, resolvedThemeMode, statePreset, themeSync]
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

  useScrollReactiveGrid({
    canvasRef,
    gridRef,
    options: scrollReactive
  });
  const sectionTransitionStyle = useSectionTransitionPreset({
    canvasRef,
    gridRef,
    options: sectionTransition
  });
  useDebugHudOverlay({
    canvasRef,
    gridRef,
    engine,
    options: debugHud
  });
  const placeholderStyle = useMemo(
    () => resolveSsrPlaceholderCanvasStyle(ssrPlaceholder, isReady),
    [isReady, ssrPlaceholder]
  );

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ ...baseStyle, ...placeholderStyle, ...sectionTransitionStyle, ...style }}
    />
  );
}
