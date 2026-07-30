import { IRenderer, type EnginePointerSource } from "@pixel-engine/core";
import { createCellBuffer, PixelCellBuffer } from "./cell-buffer";
import {
  PixelGridConfig,
  PixelGridInfluenceOptions,
  PixelGridMaskErrorEvent,
  ResolvedPixelGridConfig
} from "../types";
import {
  createPixelGridRuntimeState
} from "./runtime-state";
import { createMaskStateMachine } from "./mask-state-machine";
import { applyBreathingSystem } from "./breathing-system";
import { PixelRenderViewport, renderPixelCells } from "./render-pass";
import { runPixelGridUpdatePipeline } from "./update-pipeline";
import { setupBaseInfluences } from "./influence-setup";
import { DEFAULT_PIXEL_GRID_RUNTIME_TUNING } from "./runtime-tuning";
import { createMaskWeightCacheCoordinator } from "./mask-weight-cache";
import { resolveGuardedGridDimensions } from "./cell-count-guard";
import { createPixelGridEffectsPipeline } from "./effects/pipeline";
import {
  applyHoverAndBreathingPass,
  applyHoverInteractionsPass,
  applyReactiveRipplePass
} from "./interaction-coordinator";

import { InfluenceManager } from "../../../influences/InfluenceManager";
import { RippleInfluence } from "../../../influences/RippleInfluence";
import { TextMaskInfluence } from "../../../influences/Masks/TextMaskInfluence";
import { ImageMaskInfluence } from "../../../influences/Masks/ImageMaskInfluence";

export interface PixelGridRuntimeController {
  update(delta: number): void;
  render(renderer: IRenderer, alpha: number): void;
  triggerRipple(x: number, y: number): void;
  destroy(): void;
  getCellBufferForDebug(): PixelCellBuffer;
  getDebugSnapshot(): {
    totalCells: number;
    activeCells: number;
    activeRipples: number;
    timeline: { playing: boolean; stepIndex: number };
  };
  playMaskTimeline(): void;
  pauseMaskTimeline(): void;
  resetMaskTimeline(): void;
  getMaskTimelineState(): { playing: boolean; stepIndex: number };
  getWarnings(): string[];
}

interface CreatePixelGridRuntimeControllerParams {
  engine: EnginePointerSource;
  width: number;
  height: number;
  config: PixelGridConfig;
  influenceOptions: PixelGridInfluenceOptions;
  resolvedConfig: ResolvedPixelGridConfig;
  onMaskError?: (event: PixelGridMaskErrorEvent) => void;
}

export function createPixelGridRuntimeController(
  params: CreatePixelGridRuntimeControllerParams
): PixelGridRuntimeController {
  const centerX = params.width * 0.5;
  const centerY = params.height * 0.5;

  const gridDimensions = resolveGuardedGridDimensions(
    params.width,
    params.height,
    params.config.gap,
    params.resolvedConfig.performance.maxCellsCap
  );
  const effectiveGap = gridDimensions.gap;
  const columns = gridDimensions.columns;
  const rows = gridDimensions.rows;
  const inverseGap = 1 / effectiveGap;
  const cacheSize = columns * rows;
  const runtime = createPixelGridRuntimeState(cacheSize);
  const getCellIndex = (x: number, y: number): number => x * rows + y;

  const buffer = createCellBuffer(columns, rows, effectiveGap, params.config.colors);

  const influenceManager = new InfluenceManager(
    effectiveGap,
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
        dithering: mask.dithering,
        gap: mask.gap ?? effectiveGap,
        onError: (reason) =>
          params.onMaskError?.({ maskId: mask.id, src: mask.src, reason })
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
  const maskWeightCache = createMaskWeightCacheCoordinator({
    buffer,
    runtime,
    maskState,
    hoverEffects: params.resolvedConfig.hoverEffects,
    rippleEffects: params.resolvedConfig.rippleEffects,
    breathing: params.resolvedConfig.breathing,
    influenceOptions: params.influenceOptions
  });
  const renderViewport: PixelRenderViewport = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0
  };
  const effectsPipeline = createPixelGridEffectsPipeline({
    buffer,
    pointer: params.engine.mouse,
    effects: params.resolvedConfig.effects
  });

  setupBaseInfluences({
    engine: params.engine,
    width: params.width,
    height: params.height,
    config: params.config,
    options: params.influenceOptions,
    hoverEffects: params.resolvedConfig.hoverEffects,
    organicNoise: params.resolvedConfig.organicNoise,
    organicNoiseLayers: params.resolvedConfig.organicNoiseLayers,
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

  // Pipeline dependency closures + the params object are created once (not per frame):
  // every value they close over (buffer, runtime, params.resolvedConfig/influenceOptions,
  // params.engine.mouse -- a live reference PixelEngine mutates in place, never reassigns --
  // inverseGap/columns/rows, maskWeightCache, effectsPipeline) is stable for the controller's
  // lifetime. Only `delta` genuinely varies per frame, so it's written onto `pipelineParams`
  // right before each call instead of being captured by a freshly allocated closure.
  const prepareMaskWeightRecompute = (): boolean => maskWeightCache.prepareRecompute();
  const writeCellMaskWeights = (targetBuffer: PixelCellBuffer, index: number): void =>
    maskWeightCache.writeCellMaskWeights(targetBuffer, index);
  // Fuses the hover + breathing passes into one full-grid loop whenever it's safe to do so
  // (no active ripples -- see applyHoverAndBreathingPass's doc comment for why ripple
  // activity forces the unfused fallback), keeping the fused-vs-fallback decision in the
  // controller rather than update-pipeline.ts, matching this file's existing convention of
  // owning orchestration decisions.
  const applyHoverBreathingAndRipple = (): void => {
    if (runtime.activeRipples.length === 0) {
      applyHoverAndBreathingPass({
        buffer,
        runtime,
        hoverEffects: params.resolvedConfig.hoverEffects,
        hoverEnabled: !!params.influenceOptions.hover,
        breathing: params.resolvedConfig.breathing,
        mouse: params.engine.mouse
      });
      return;
    }

    applyHoverInteractionsPass({
      buffer,
      runtime,
      hoverEffects: params.resolvedConfig.hoverEffects,
      hoverEnabled: !!params.influenceOptions.hover,
      mouse: params.engine.mouse
    });
    applyReactiveRipplePass({
      buffer,
      runtime,
      rippleEnabled: !!params.influenceOptions.ripple,
      gap: effectiveGap,
      inverseGap,
      columns,
      rows,
      hoverEffects: params.resolvedConfig.hoverEffects,
      rippleEffects: params.resolvedConfig.rippleEffects,
      getCellIndex
    });
    applyBreathingSystem({
      buffer,
      breathing: params.resolvedConfig.breathing,
      mouse: params.engine.mouse,
      imageMaskWeightCache: runtime.imageMaskWeightCache,
      textMaskWeightCache: runtime.textMaskWeightCache,
      reactiveTime: runtime.reactiveTime
    });
  };
  // Reads pipelineParams.delta (set just before this runs each frame) rather than closing
  // over a `delta` parameter -- a closure created once here has no per-call `delta` binding
  // to capture, unlike the old per-frame closure it replaces.
  const applyPostEffects = (): void => {
    effectsPipeline.update(pipelineParams.delta);
    effectsPipeline.apply(buffer);
  };

  const pipelineParams: Parameters<typeof runPixelGridUpdatePipeline>[0] = {
    delta: 0,
    buffer,
    expandEase: params.config.expandEase,
    runtime,
    influenceManager,
    maskState,
    getCellIndex,
    prepareMaskWeightRecompute,
    writeCellMaskWeights,
    applyHoverBreathingAndRipple,
    applyPostEffects
  };

  return {
    update(delta: number): void {
      pipelineParams.delta = delta;
      runPixelGridUpdatePipeline(pipelineParams);
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
            buffer,
            params.resolvedConfig.performance.minRenderableSize,
            renderViewport,
            alpha
          );
          return;
        }
      }

      renderPixelCells(
        renderer,
        buffer,
        params.resolvedConfig.performance.minRenderableSize,
        undefined,
        alpha
      );
    },

    triggerRipple(x: number, y: number): void {
      if (!params.influenceOptions.ripple) return;

      const maxRadius =
        params.resolvedConfig.rippleEffects.maxRadius ??
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

    destroy(): void {
      runtime.activeRipples.length = 0;
      runtime.recycledRipples.length = 0;
      effectsPipeline.dispose();
    },

    getCellBufferForDebug(): PixelCellBuffer {
      return buffer;
    },

    getDebugSnapshot(): {
      totalCells: number;
      activeCells: number;
      activeRipples: number;
      timeline: { playing: boolean; stepIndex: number };
    } {
      let activeCells = 0;
      for (let index = 0; index < buffer.count; index++) {
        if (buffer.targetSize[index] > 0.01) activeCells++;
      }

      return {
        totalCells: buffer.count,
        activeCells,
        activeRipples: runtime.activeRipples.length,
        timeline: {
          playing: maskState.isPlaying(),
          stepIndex: maskState.getCurrentStepIndex()
        }
      };
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
    },

    getWarnings(): string[] {
      return gridDimensions.warnings;
    }
  };
}
