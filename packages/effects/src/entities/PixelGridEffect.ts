import { Entity, IRenderer, type EnginePointerSource } from "@pixel-engine/core";
import { PixelCellBuffer } from "./pixel-grid/internal/cell-buffer";
import {
  PixelGridConfig,
  PixelGridInfluenceOptions,
  ResolvedPixelGridConfig
} from "./pixel-grid/types";
import { resolvePixelGridConfig } from "./pixel-grid/normalizeConfig";
import {
  createPixelGridRuntimeController,
  PixelGridRuntimeController
} from "./pixel-grid/internal/runtime-controller";

export interface PixelGridDebugSnapshot {
  totalCells: number;
  activeCells: number;
  activeRipples: number;
  timeline: { playing: boolean; stepIndex: number };
}

export class PixelGridEffect extends Entity {
  private runtime: PixelGridRuntimeController;
  private cellBuffer: PixelCellBuffer;
  private readonly influenceOptions: PixelGridInfluenceOptions;
  private readonly resolvedConfig: ResolvedPixelGridConfig;
  /**
   * `config` with the required scalars (colors/gap/expandEase/breathSpeed) replaced by
   * their validated `resolvedConfig` values, so the runtime controller never has to
   * re-validate them and can't be constructed from an invalid gap/colors even when
   * this effect is built directly (bypassing @pixel-engine/react's own validation).
   */
  private readonly sanitizedConfig: PixelGridConfig;
  private width: number;
  private height: number;

  constructor(
    private engine: EnginePointerSource,
    width: number,
    height: number,
    private config: PixelGridConfig,
    influenceOptions: PixelGridInfluenceOptions = {
      ripple: true,
      hover: true,
      organic: false
    }
  ) {
    super();

    this.influenceOptions = { ...influenceOptions };
    this.resolvedConfig = resolvePixelGridConfig(config);
    this.emitConfigWarnings(this.resolvedConfig.warnings);
    this.sanitizedConfig = {
      ...this.config,
      colors: this.resolvedConfig.colors,
      gap: this.resolvedConfig.gap,
      expandEase: this.resolvedConfig.expandEase,
      breathSpeed: this.resolvedConfig.breathSpeed
    };
    this.applyCanvasBackgroundFromConfig();
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.runtime = createPixelGridRuntimeController({
      engine: this.engine,
      width: this.width,
      height: this.height,
      config: this.sanitizedConfig,
      influenceOptions: this.influenceOptions,
      resolvedConfig: this.resolvedConfig
    });
    this.emitConfigWarnings(this.runtime.getWarnings());
    this.cellBuffer = this.runtime.getCellBufferForDebug();
  }

  private applyCanvasBackgroundFromConfig(): void {
    if (this.config.canvasBackground === undefined) return;
    this.engine.setClearColor?.(this.config.canvasBackground);
  }

  private emitConfigWarnings(warnings: string[]): void {
    if (warnings.length === 0) return;
    if (typeof console === "undefined" || typeof console.warn !== "function") return;

    for (const warning of warnings) {
      console.warn(`[PixelGridEffect] ${warning}`);
    }
  }

  update(delta: number): void {
    this.runtime.update(delta);
  }

  render(renderer: IRenderer, alpha = 1): void {
    this.runtime.render(renderer, alpha);
  }

  triggerRipple(x: number, y: number): void {
    this.runtime.triggerRipple(x, y);
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.width && nextHeight === this.height) return;

    this.runtime?.destroy();
    this.width = nextWidth;
    this.height = nextHeight;
    this.runtime = createPixelGridRuntimeController({
      engine: this.engine,
      width: this.width,
      height: this.height,
      config: this.sanitizedConfig,
      influenceOptions: this.influenceOptions,
      resolvedConfig: this.resolvedConfig
    });
    this.emitConfigWarnings(this.runtime.getWarnings());
    this.cellBuffer = this.runtime.getCellBufferForDebug();
  }

  onDestroy(): void {
    this.runtime.destroy();
  }

  setCanvasBackground(background: string | null): void {
    this.engine.setClearColor?.(background);
  }

  playMaskTimeline(): void {
    this.runtime.playMaskTimeline();
  }

  pauseMaskTimeline(): void {
    this.runtime.pauseMaskTimeline();
  }

  resetMaskTimeline(): void {
    this.runtime.resetMaskTimeline();
  }

  getMaskTimelineState(): { playing: boolean; stepIndex: number } {
    return this.runtime.getMaskTimelineState();
  }

  getDebugSnapshot(): PixelGridDebugSnapshot {
    return this.runtime.getDebugSnapshot();
  }
}
