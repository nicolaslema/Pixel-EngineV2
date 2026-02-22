import { Entity, IRenderer, type EnginePointerSource } from "@pixel-engine/core";
import { PixelCell } from "./PixelCell";
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
import {
  applyReactiveEffectsToCell,
  applyReactiveRipple,
  getHoverWeight,
  shouldAffectCell
} from "./pixel-grid/internal/reactive-effects";
import { applyBreathingSystem } from "./pixel-grid/internal/breathing-system";
import { PixelRenderViewport, renderPixelCells } from "./pixel-grid/internal/render-pass";
import { runPixelGridUpdatePipeline } from "./pixel-grid/internal/update-pipeline";
import { setupBaseInfluences } from "./pixel-grid/internal/influence-setup";
import { DEFAULT_PIXEL_GRID_RUNTIME_TUNING } from "./pixel-grid/internal/runtime-tuning";

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
  private maskCacheIsZeroed = true;
  private readonly renderViewport: PixelRenderViewport = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0
  };

  private readonly maskState: MaskStateMachine;

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

  private updateMaskWeightCache(): void {
    const imageMask = this.maskState.imageMask;
    const textMask = this.maskState.textMask;
    const morphMask = this.maskState.morphMask;
    const hasImage = imageMask !== null;
    const hasText = textMask !== null;
    const hasMorph = morphMask !== null;

    if (!hasImage && !hasText && !hasMorph) {
      this.zeroMaskWeightCaches();
      return;
    }

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
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

      this.runtime.imageMaskWeightCache[i] = image;
      this.runtime.textMaskWeightCache[i] = textOrMorph;
      this.runtime.activeMaskWeightCache[i] = Math.max(image, textOrMorph);
    }
    this.maskCacheIsZeroed = false;
  }

  private zeroMaskWeightCaches(): void {
    if (this.maskCacheIsZeroed) return;
    this.runtime.activeMaskWeightCache.fill(0);
    this.runtime.imageMaskWeightCache.fill(0);
    this.runtime.textMaskWeightCache.fill(0);
    this.maskCacheIsZeroed = true;
  }

  private hasAnyMaskSources(): boolean {
    return (
      this.maskState.imageMask !== null ||
      this.maskState.textMask !== null ||
      this.maskState.morphMask !== null
    );
  }

  private shouldRecomputeMaskWeightCache(): boolean {
    const needsMaskScope =
      this.hoverEffects.interactionScope === "imageMask" &&
      ((this.influenceOptions.hover && this.hoverEffects.mode === "reactive") ||
        (this.influenceOptions.ripple &&
          this.rippleEffects.enabled &&
          this.runtime.activeRipples.length > 0));

    const needsBreathingMasks =
      this.breathing.enabled &&
      (this.breathing.affectImage || this.breathing.affectText);

    const needsMaskWeights = needsMaskScope || needsBreathingMasks;
    if (!needsMaskWeights) return false;

    if (!this.hasAnyMaskSources()) {
      this.zeroMaskWeightCaches();
      return false;
    }

    return true;
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

  private shouldAffectWithReactiveHover(index: number, cell: PixelCell): boolean {
    return shouldAffectCell(
      this.hoverEffects.interactionScope,
      cell.targetSize,
      this.runtime.activeMaskWeightCache[index]
    );
  }

  private applyReactiveHover(): void {
    const hoverMode = this.hoverEffects.mode;
    if (!this.influenceOptions.hover || hoverMode !== "reactive") return;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (!this.shouldAffectWithReactiveHover(i, cell)) continue;

      const falloff = getHoverWeight(cell, this.engine.mouse, this.hoverEffects);
      if (falloff <= 0) continue;

      const mouse = this.engine.mouse;
      const interaction = falloff * this.hoverEffects.strength;

      applyReactiveEffectsToCell({
        cell,
        cellIndex: i,
        interaction,
        originX: mouse.x,
        originY: mouse.y,
        reactiveTime: this.runtime.reactiveTime,
        hoverEffects: this.hoverEffects,
        tintPalette: this.hoverEffects.tintPalette
      });
    }
  }

  private applyReactiveRippleEffects(): void {
    if (!this.influenceOptions.ripple) return;
    applyReactiveRipple({
      cells: this.cells,
      activeRipples: this.runtime.activeRipples,
      inverseGap: this.inverseGap,
      columns: this.columns,
      rows: this.rows,
      hoverEffects: this.hoverEffects,
      rippleEffects: this.rippleEffects,
      activeMaskWeightCache: this.runtime.activeMaskWeightCache,
      reactiveTime: this.runtime.reactiveTime,
      getCellIndex: this.getCellIndexRef
    });
  }

  private applyBreathing(): void {
    applyBreathingSystem({
      cells: this.cells,
      breathing: this.breathing,
      mouse: this.engine.mouse,
      imageMaskWeightCache: this.runtime.imageMaskWeightCache,
      textMaskWeightCache: this.runtime.textMaskWeightCache,
      reactiveTime: this.runtime.reactiveTime
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
      shouldRecomputeMaskWeightCache: () => this.shouldRecomputeMaskWeightCache(),
      updateMaskWeightCache: () => this.updateMaskWeightCache(),
      applyReactiveHover: () => this.applyReactiveHover(),
      applyReactiveRippleEffects: () => this.applyReactiveRippleEffects(),
      applyBreathing: () => this.applyBreathing()
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
