import { Entity } from "../scene/Entity";
import { IRenderer } from "../renderers/IRenderer";
import { PixelCell } from "./PixelCell";
import { EnginePointerSource } from "../core/EnginePointerSource";
import {
  PixelGridConfig,
  PixelGridInfluenceOptions,
  ResolvedPixelGridConfig
} from "./pixel-grid/types";
import { resolvePixelGridConfig } from "./pixel-grid/normalizeConfig";
import {
  createPixelGridRuntimeState,
  PixelGridRuntimeState
} from "./pixel-grid/internal/runtime-state";
import { createMaskStateMachine } from "./pixel-grid/internal/mask-state-machine";
import { applyBreathingSystem } from "./pixel-grid/internal/breathing-system";
import { PixelRenderViewport, renderPixelCells } from "./pixel-grid/internal/render-pass";
import { runPixelGridUpdatePipeline } from "./pixel-grid/internal/update-pipeline";
import { setupBaseInfluences } from "./pixel-grid/internal/influence-setup";
import { DEFAULT_PIXEL_GRID_RUNTIME_TUNING } from "./pixel-grid/internal/runtime-tuning";
import {
  createMaskWeightCacheCoordinator,
  MaskWeightCacheCoordinator
} from "./pixel-grid/internal/mask-weight-cache";
import {
  applyReactiveHoverPass,
  applyReactiveRipplePass
} from "./pixel-grid/internal/interaction-coordinator";

import { InfluenceManager } from "../influences/InfluenceManager";
import { RippleInfluence } from "../influences/RippleInfluence";
import { TextMaskInfluence } from "../influences/Masks/TextMaskInfluence";
import { ImageMaskInfluence } from "../influences/Masks/ImageMaskInfluence";
import { MaskStateMachine } from "./pixel-grid/internal/mask-state-machine";

export class PixelGridEffect extends Entity {
  private cells: PixelCell[] = [];
  private readonly runtime: PixelGridRuntimeState;

  private columns: number;
  private rows: number;

  private influenceManager: InfluenceManager;
  private readonly inverseGap: number;
  private maxRipples: number;
  private rippleSpeed: number;
  private rippleThickness: number;
  private rippleStrength: number;
  private readonly getCellIndexRef = (x: number, y: number): number => x * this.rows + y;

  private readonly hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  private readonly rippleEffects: ResolvedPixelGridConfig["rippleEffects"];
  private readonly breathing: ResolvedPixelGridConfig["breathing"];
  private readonly autoMorph: ResolvedPixelGridConfig["autoMorph"];
  private readonly performance: ResolvedPixelGridConfig["performance"];
  private readonly renderViewport: PixelRenderViewport = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0
  };

  private readonly maskState: MaskStateMachine;
  private readonly maskWeightCache: MaskWeightCacheCoordinator;
  private readonly shouldRecomputeMaskWeightCacheRef = () => this.maskWeightCache.shouldRecompute();
  private readonly updateMaskWeightCacheRef = () => this.maskWeightCache.recompute();
  private readonly applyReactiveHoverRef = () => {
    applyReactiveHoverPass({
      cells: this.cells,
      runtime: this.runtime,
      hoverEffects: this.hoverEffects,
      hoverEnabled: !!this.influenceOptions.hover,
      mouse: this.engine.mouse
    });
  };
  private readonly applyReactiveRippleEffectsRef = () => {
    applyReactiveRipplePass({
      cells: this.cells,
      runtime: this.runtime,
      rippleEnabled: !!this.influenceOptions.ripple,
      inverseGap: this.inverseGap,
      columns: this.columns,
      rows: this.rows,
      hoverEffects: this.hoverEffects,
      rippleEffects: this.rippleEffects,
      getCellIndex: this.getCellIndexRef
    });
  };
  private readonly applyBreathingRef = () => {
    applyBreathingSystem({
      cells: this.cells,
      breathing: this.breathing,
      mouse: this.engine.mouse,
      imageMaskWeightCache: this.runtime.imageMaskWeightCache,
      textMaskWeightCache: this.runtime.textMaskWeightCache,
      reactiveTime: this.runtime.reactiveTime
    });
  };

  constructor(
    private engine: EnginePointerSource,
    private width: number,
    private height: number,
    private config: PixelGridConfig,
    private influenceOptions: PixelGridInfluenceOptions = {
      ripple: true,
      hover: true,
      organic: false
    }
  ) {
    super();

    const centerX = width * 0.5;
    const centerY = height * 0.5;

    this.columns = Math.ceil(width / config.gap);
    this.rows = Math.ceil(height / config.gap);
    this.inverseGap = 1 / config.gap;
    const cacheSize = this.columns * this.rows;
    this.runtime = createPixelGridRuntimeState(cacheSize);
    const resolved = resolvePixelGridConfig(config);
    this.hoverEffects = resolved.hoverEffects;
    this.rippleEffects = resolved.rippleEffects;
    this.breathing = resolved.breathing;
    this.autoMorph = resolved.autoMorph;
    this.performance = resolved.performance;
    this.applyCanvasBackgroundFromConfig();

    this.rippleSpeed = this.rippleEffects.speed;
    this.rippleThickness = this.rippleEffects.thickness;
    this.rippleStrength = this.rippleEffects.strength;
    this.maxRipples = Math.min(this.rippleEffects.maxRipples, this.performance.maxRipplesCap);

    this.createGrid();

    this.influenceManager = new InfluenceManager(
      this.config.gap,
      this.columns,
      this.rows,
      DEFAULT_PIXEL_GRID_RUNTIME_TUNING
    );

    const imageMask = config.imageMask?.src
      ? new ImageMaskInfluence(
        config.imageMask.src,
        config.imageMask.centerX ?? centerX,
        config.imageMask.centerY ?? centerY,
        {
          scale: config.imageMask.scale ?? 3,
          sampleMode: config.imageMask.sampleMode ?? "invert",
          strength: config.imageMask.strength ?? 1.5,
          threshold: config.imageMask.threshold,
          blurRadius: config.imageMask.blurRadius,
          dithering: config.imageMask.dithering
        }
      )
      : null;

    const textMask = config.textMask?.text
      ? new TextMaskInfluence(
        config.textMask.text,
        config.textMask.centerX ?? centerX,
        config.textMask.centerY ?? centerY,
        {
          font: config.textMask.font ?? "bold 160px Arial",
          strength: config.textMask.strength ?? 0.9,
          blurRadius: config.textMask.blurRadius ?? 2
        }
      )
      : null;

    this.maskState = createMaskStateMachine({
      influenceManager: this.influenceManager,
      autoMorph: this.autoMorph,
      initialMask: resolved.initialMask,
      imageMask,
      textMask
    });
    this.maskWeightCache = createMaskWeightCacheCoordinator({
      cells: this.cells,
      runtime: this.runtime,
      maskState: this.maskState,
      hoverEffects: this.hoverEffects,
      rippleEffects: this.rippleEffects,
      breathing: this.breathing,
      influenceOptions: this.influenceOptions
    });

    this.setupInfluences();
  }

  private applyCanvasBackgroundFromConfig(): void {
    if (this.config.canvasBackground === undefined) return;
    this.engine.setClearColor?.(this.config.canvasBackground);
  }

  private createGrid(): void {
    const { colors, gap } = this.config;

    for (let x = 0; x < this.columns; x++) {
      for (let y = 0; y < this.rows; y++) {
        const px = x * gap;
        const py = y * gap;
        const color =
          colors[Math.floor(Math.random() * colors.length)];

        this.cells.push(
          new PixelCell(px, py, color, gap, 1)
        );
      }
    }
  }

  private setupInfluences(): void {
    setupBaseInfluences({
      engine: this.engine,
      width: this.width,
      height: this.height,
      config: this.config,
      options: this.influenceOptions,
      hoverEffects: this.hoverEffects,
      influenceManager: this.influenceManager
    });
  }

  update(delta: number): void {
    runPixelGridUpdatePipeline({
      delta,
      cells: this.cells,
      expandEase: this.config.expandEase,
      runtime: this.runtime,
      influenceManager: this.influenceManager,
      maskState: this.maskState,
      getCellIndex: this.getCellIndexRef,
      shouldRecomputeMaskWeightCache: this.shouldRecomputeMaskWeightCacheRef,
      updateMaskWeightCache: this.updateMaskWeightCacheRef,
      applyReactiveHover: this.applyReactiveHoverRef,
      applyReactiveRippleEffects: this.applyReactiveRippleEffectsRef,
      applyBreathing: this.applyBreathingRef
    });
  }

  render(renderer: IRenderer): void {
    if (this.performance.viewportCulling) {
      const size = this.engine.getSize?.();
      if (size) {
        const padding = this.performance.cullingPadding;
        this.renderViewport.minX = -padding;
        this.renderViewport.minY = -padding;
        this.renderViewport.maxX = size.width + padding;
        this.renderViewport.maxY = size.height + padding;

        renderPixelCells(
          renderer,
          this.cells,
          this.performance.minRenderableSize,
          this.renderViewport
        );
        return;
      }
    }

    renderPixelCells(renderer, this.cells, this.performance.minRenderableSize);
  }

  triggerRipple(x: number, y: number): void {
    if (!this.influenceOptions.ripple) return;

    const maxRadius =
      Math.max(this.width, this.height) * 1.2;

    if (this.runtime.activeRipples.length >= this.maxRipples) {
      const oldest = this.runtime.activeRipples.shift();
      if (oldest) this.influenceManager.remove(oldest);
    }

    const ripple = new RippleInfluence(
      x,
      y,
      this.rippleSpeed,
      this.rippleThickness,
      this.rippleStrength,
      maxRadius
    );

    this.runtime.activeRipples.push(ripple);
    this.influenceManager.add(ripple);
  }

  setCanvasBackground(background: string | null): void {
    this.engine.setClearColor?.(background);
  }
}
