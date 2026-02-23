import { Entity } from "../scene/Entity";
import { IRenderer } from "../renderers/IRenderer";
import { EnginePointerSource } from "../core/EnginePointerSource";
import { PixelCell } from "./PixelCell";
import {
  PixelGridConfig,
  PixelGridInfluenceOptions
} from "./pixel-grid/types";
import { resolvePixelGridConfig } from "./pixel-grid/normalizeConfig";
import {
  createPixelGridRuntimeController,
  PixelGridRuntimeController
} from "./pixel-grid/internal/runtime-controller";

export class PixelGridEffect extends Entity {
  private readonly runtime: PixelGridRuntimeController;
  private readonly cells: PixelCell[];

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

    const resolved = resolvePixelGridConfig(config);
    this.emitConfigWarnings(resolved.warnings);
    this.applyCanvasBackgroundFromConfig();

    this.runtime = createPixelGridRuntimeController({
      engine,
      width,
      height,
      config,
      influenceOptions,
      resolvedConfig: resolved
    });
    this.cells = this.runtime.getCellsForDebug();
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
}
