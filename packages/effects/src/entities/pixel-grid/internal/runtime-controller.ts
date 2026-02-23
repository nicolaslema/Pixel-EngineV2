import { IRenderer, type EnginePointerSource } from "@pixel-engine/core";
import { PixelCell } from "../../PixelCell";
import {
  PixelGridConfig,
  PixelGridInfluenceOptions,
  ResolvedPixelGridConfig
} from "../types";
import {
  createPixelGridRuntimeState
} from "./runtime-state";
import { createMaskStateMachine } from "./mask-state-machine";
import {
  applyReactiveEffectsToCell,
  applyReactiveRipple,
  getHoverWeight,
  shouldAffectCell
} from "./reactive-effects";
import { applyBreathingSystem } from "./breathing-system";
import { PixelRenderViewport, renderPixelCells } from "./render-pass";
import { runPixelGridUpdatePipeline } from "./update-pipeline";
import { setupBaseInfluences } from "./influence-setup";
import { DEFAULT_PIXEL_GRID_RUNTIME_TUNING } from "./runtime-tuning";

import { InfluenceManager } from "../../../influences/InfluenceManager";
import { RippleInfluence } from "../../../influences/RippleInfluence";
import { TextMaskInfluence } from "../../../influences/Masks/TextMaskInfluence";
import { ImageMaskInfluence } from "../../../influences/Masks/ImageMaskInfluence";

export interface PixelGridRuntimeController {
  update(delta: number): void;
  render(renderer: IRenderer, alpha: number): void;
  triggerRipple(x: number, y: number): void;
  getCellsForDebug(): PixelCell[];
  playMaskTimeline(): void;
  pauseMaskTimeline(): void;
  resetMaskTimeline(): void;
  getMaskTimelineState(): { playing: boolean; stepIndex: number };
}

interface CreatePixelGridRuntimeControllerParams {
  engine: EnginePointerSource;
  width: number;
  height: number;
  config: PixelGridConfig;
  influenceOptions: PixelGridInfluenceOptions;
  resolvedConfig: ResolvedPixelGridConfig;
}

export function createPixelGridRuntimeController(
  params: CreatePixelGridRuntimeControllerParams
): PixelGridRuntimeController {
  const centerX = params.width * 0.5;
  const centerY = params.height * 0.5;

  const columns = Math.ceil(params.width / params.config.gap);
  const rows = Math.ceil(params.height / params.config.gap);
  const inverseGap = 1 / params.config.gap;
  const cacheSize = columns * rows;
  const runtime = createPixelGridRuntimeState(cacheSize);
  const cells: PixelCell[] = [];
  const getCellIndex = (x: number, y: number): number => x * rows + y;
  let maskCacheIsZeroed = true;

  createGrid(cells, columns, rows, params.config);

  const influenceManager = new InfluenceManager(
    params.config.gap,
    columns,
    rows,
    DEFAULT_PIXEL_GRID_RUNTIME_TUNING
  );

  const imageMasks = params.resolvedConfig.imageMasks.map((mask) => ({
    id: mask.id,
    type: "image" as const,
    influence: new ImageMaskInfluence(
      mask.src,
      mask.centerX ?? centerX,
      mask.centerY ?? centerY,
      {
        scale: mask.scale ?? 3,
        sampleMode: mask.sampleMode ?? "invert",
        strength: mask.strength ?? 1.5,
        threshold: mask.threshold,
        blurRadius: mask.blurRadius,
        dithering: mask.dithering
      }
    )
  }));

  const textMasks = params.resolvedConfig.textMasks.map((mask) => ({
    id: mask.id,
    type: "text" as const,
    influence: new TextMaskInfluence(
      mask.text,
      mask.centerX ?? centerX,
      mask.centerY ?? centerY,
      {
        font: mask.font ?? "bold 160px Arial",
        strength: mask.strength ?? 0.9,
        blurRadius: mask.blurRadius ?? 2
      }
    )
  }));

  const maskState = createMaskStateMachine({
    influenceManager,
    maskTimeline: params.resolvedConfig.maskTimeline,
    initialMask: params.resolvedConfig.initialMask,
    imageMasks,
    textMasks
  });
  const renderViewport: PixelRenderViewport = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0
  };

  setupBaseInfluences({
    engine: params.engine,
    width: params.width,
    height: params.height,
    config: params.config,
    options: params.influenceOptions,
    hoverEffects: params.resolvedConfig.hoverEffects,
    influenceManager
  });

  const maxRipples = Math.min(
    params.resolvedConfig.rippleEffects.maxRipples,
    params.resolvedConfig.performance.maxRipplesCap
  );
  const acquireRipple = (
    x: number,
    y: number,
    speed: number,
    thickness: number,
    strength: number,
    maxRadius: number
  ): RippleInfluence => {
    const recycled = runtime.recycledRipples.pop();
    if (recycled) {
      recycled.reset(
        x,
        y,
        speed,
        thickness,
        strength,
        maxRadius
      );
      return recycled;
    }
    return new RippleInfluence(
      x,
      y,
      speed,
      thickness,
      strength,
      maxRadius
    );
  };
  const recycleRipple = (ripple: RippleInfluence): void => {
    runtime.recycledRipples.push(ripple);
  };

  const zeroMaskWeightCaches = () => {
    if (maskCacheIsZeroed) return;
    runtime.activeMaskWeightCache.fill(0);
    runtime.imageMaskWeightCache.fill(0);
    runtime.textMaskWeightCache.fill(0);
    maskCacheIsZeroed = true;
  };

  const hasAnyMaskSources = () => {
    return (
      maskState.imageMask !== null ||
      maskState.textMask !== null ||
      maskState.morphMask !== null
    );
  };

  const shouldRecomputeMaskWeightCache = () => {
    const needsMaskScope =
      params.resolvedConfig.hoverEffects.interactionScope === "imageMask" &&
      ((params.influenceOptions.hover && params.resolvedConfig.hoverEffects.mode === "reactive") ||
        (params.influenceOptions.ripple &&
          params.resolvedConfig.rippleEffects.enabled &&
          runtime.activeRipples.length > 0));

    const needsBreathingMasks =
      params.resolvedConfig.breathing.enabled &&
      (params.resolvedConfig.breathing.affectImage || params.resolvedConfig.breathing.affectText);

    const needsMaskWeights = needsMaskScope || needsBreathingMasks;
    if (!needsMaskWeights) return false;

    if (!hasAnyMaskSources()) {
      zeroMaskWeightCaches();
      return false;
    }

    return true;
  };

  const updateMaskWeightCache = () => {
    const imageMask = maskState.imageMask;
    const textMask = maskState.textMask;
    const morphMask = maskState.morphMask;
    const hasImage = imageMask !== null;
    const hasText = textMask !== null;
    const hasMorph = morphMask !== null;

    if (!hasImage && !hasText && !hasMorph) {
      zeroMaskWeightCaches();
      return;
    }

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const image = hasImage
        ? imageMask!.getInfluence(cell.x, cell.y, 1)
        : 0;
      const text = hasText
        ? textMask!.getInfluence(cell.x, cell.y, 1)
        : 0;
      const morph = hasMorph
        ? morphMask!.getInfluence(cell.x, cell.y, 1)
        : 0;

      const textOrMorph = Math.max(text, morph);

      runtime.imageMaskWeightCache[i] = image;
      runtime.textMaskWeightCache[i] = textOrMorph;
      runtime.activeMaskWeightCache[i] = Math.max(image, textOrMorph);
    }
    maskCacheIsZeroed = false;
  };

  const applyReactiveHover = () => {
    const hoverMode = params.resolvedConfig.hoverEffects.mode;
    if (!params.influenceOptions.hover || hoverMode !== "reactive") return;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (
        !shouldAffectCell(
          params.resolvedConfig.hoverEffects.interactionScope,
          cell.targetSize,
          runtime.activeMaskWeightCache[i]
        )
      ) {
        continue;
      }

      const falloff = getHoverWeight(cell, params.engine.mouse, params.resolvedConfig.hoverEffects);
      if (falloff <= 0) continue;

      const interaction = falloff * params.resolvedConfig.hoverEffects.strength;

      applyReactiveEffectsToCell({
        cell,
        cellIndex: i,
        interaction,
        originX: params.engine.mouse.x,
        originY: params.engine.mouse.y,
        reactiveTime: runtime.reactiveTime,
        hoverEffects: params.resolvedConfig.hoverEffects,
        tintPalette: params.resolvedConfig.hoverEffects.tintPalette
      });
    }
  };

  const applyReactiveRippleEffects = () => {
    if (!params.influenceOptions.ripple) return;
    applyReactiveRipple({
      cells,
      activeRipples: runtime.activeRipples,
      inverseGap,
      columns,
      rows,
      hoverEffects: params.resolvedConfig.hoverEffects,
      rippleEffects: params.resolvedConfig.rippleEffects,
      activeMaskWeightCache: runtime.activeMaskWeightCache,
      reactiveTime: runtime.reactiveTime,
      getCellIndex
    });
  };

  const applyBreathing = () => {
    applyBreathingSystem({
      cells,
      breathing: params.resolvedConfig.breathing,
      mouse: params.engine.mouse,
      imageMaskWeightCache: runtime.imageMaskWeightCache,
      textMaskWeightCache: runtime.textMaskWeightCache,
      reactiveTime: runtime.reactiveTime
    });
  };

  return {
    update(delta: number): void {
      runPixelGridUpdatePipeline({
        delta,
        cells,
        expandEase: params.config.expandEase,
        runtime,
        influenceManager,
        maskState,
        getCellIndex,
        shouldRecomputeMaskWeightCache: () => shouldRecomputeMaskWeightCache(),
        updateMaskWeightCache: () => updateMaskWeightCache(),
        applyReactiveHover: () => applyReactiveHover(),
        applyReactiveRippleEffects: () => applyReactiveRippleEffects(),
        applyBreathing: () => applyBreathing()
      });
    },

    render(renderer: IRenderer, alpha: number): void {
      if (params.resolvedConfig.performance.viewportCulling) {
        const size = params.engine.getSize?.();
        if (size) {
          const padding = params.resolvedConfig.performance.cullingPadding;
          renderViewport.minX = -padding;
          renderViewport.minY = -padding;
          renderViewport.maxX = size.width + padding;
          renderViewport.maxY = size.height + padding;

          renderPixelCells(
            renderer,
            cells,
            params.resolvedConfig.performance.minRenderableSize,
            renderViewport,
            alpha
          );
          return;
        }
      }

      renderPixelCells(
        renderer,
        cells,
        params.resolvedConfig.performance.minRenderableSize,
        undefined,
        alpha
      );
    },

    triggerRipple(x: number, y: number): void {
      if (!params.influenceOptions.ripple) return;

      const maxRadius =
        Math.max(params.width, params.height) * 1.2;

      if (runtime.activeRipples.length >= maxRipples) {
        const oldest = runtime.activeRipples[0];
        if (oldest) {
          const lastIndex = runtime.activeRipples.length - 1;
          runtime.activeRipples[0] = runtime.activeRipples[lastIndex];
          runtime.activeRipples.length = lastIndex;
          influenceManager.remove(oldest);
          recycleRipple(oldest);
        }
      }

      const ripple = acquireRipple(
        x,
        y,
        params.resolvedConfig.rippleEffects.speed,
        params.resolvedConfig.rippleEffects.thickness,
        params.resolvedConfig.rippleEffects.strength,
        maxRadius
      );

      runtime.activeRipples.push(ripple);
      influenceManager.add(ripple);
    },

    getCellsForDebug(): PixelCell[] {
      return cells;
    },

    playMaskTimeline(): void {
      maskState.play();
    },

    pauseMaskTimeline(): void {
      maskState.pause();
    },

    resetMaskTimeline(): void {
      maskState.reset();
    },

    getMaskTimelineState(): { playing: boolean; stepIndex: number } {
      return {
        playing: maskState.isPlaying(),
        stepIndex: maskState.getCurrentStepIndex()
      };
    }
  };
}

function createGrid(
  cells: PixelCell[],
  columns: number,
  rows: number,
  config: PixelGridConfig
): void {
  const { colors, gap } = config;

  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      const px = x * gap;
      const py = y * gap;
      const color =
        colors[Math.floor(Math.random() * colors.length)];

      cells.push(
        new PixelCell(px, py, color, gap, 1)
      );
    }
  }
}
