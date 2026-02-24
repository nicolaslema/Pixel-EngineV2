import { GameLoop } from "./GameLoop";
import { PixelEngineLoopOptions, PixelEngineOptions, QualityLevel } from "./types";
import { Renderer } from "../renderers/Renderer";
import { Scene } from "../scene/Scene";
import { Entity } from "../scene/Entity";
import { InputSystem } from "../input/InputSystem";
import { Time } from "./Time";
import { Scheduler } from "./Scheduler";
import { Camera2D } from "../renderers/Camera2D";
import { IRenderer } from "../renderers/IRenderer";

export class PixelEngine {
  private renderer: IRenderer;
  private loop: GameLoop;
  private scene: Scene;
  private input: InputSystem;
  private time: Time;
  private scheduler: Scheduler;
  private camera: Camera2D;
  private clearColor: string | null;
  private readonly quality: QualityLevel;
  private readonly loopTuning: Required<PixelEngineLoopOptions>;
  private dpr: number;
  private width: number;
  private height: number;

  // ==============================
  // Mouse State (expuesto para influences)
  // ==============================

  public mouse = {
    x: 0,
    y: 0,
    inside: false,
    down: false
  };

  constructor(private options: PixelEngineOptions) {
    const { canvas, width, height, rendererFactory, loop } = options;

    this.width = width;
    this.height = height;
    this.clearColor = options.clearColor ?? "black";
    this.quality = options.quality ?? "medium";
    this.loopTuning = resolveLoopTuning(this.quality, loop);
    this.dpr = Math.max(1, options.devicePixelRatio ?? window.devicePixelRatio ?? 1);

    this.renderer = rendererFactory
      ? rendererFactory(canvas)
      : new Renderer(canvas);
    this.scene = new Scene();
    this.input = new InputSystem(canvas);
    this.time = new Time();
    this.scheduler = new Scheduler();
    this.camera = new Camera2D();
    this.renderer.resize(width, height, this.dpr);

    this.loop = new GameLoop((deltaTime: number) => {
      this.update(deltaTime);
    }, {
      fixedTimeStep: this.loopTuning.fixedTimeStep,
      maxDelta: this.loopTuning.maxDelta,
      maxUpdatesPerFrame: this.loopTuning.maxUpdatesPerFrame,
      onRender: (alpha: number, renderDelta: number) => {
        this.render(alpha, renderDelta);
      },
      getTimeScale: () => this.time.timeScale
    });
  }

  // ==============================
  // Internal lifecycle
  // ==============================

  private update(simulationDelta: number): void {
    const fixedSimulationDelta = this.time.updateSimulation(simulationDelta);
    const mouse = this.input.getMouse();

    this.mouse.x = mouse.x;
    this.mouse.y = mouse.y;
    this.mouse.inside = mouse.inside;
    this.mouse.down = mouse.isDown;

    this.scheduler.runPhase("preUpdate", fixedSimulationDelta, 1);
    this.scheduler.runPhase("update", fixedSimulationDelta, 1);
    this.scene.update(fixedSimulationDelta);
    this.scheduler.runPhase("postUpdate", fixedSimulationDelta, 1);
  }

  private render(alpha = 1, renderDelta = 0): void {
    this.time.updateRender(renderDelta);
    const ctx = this.renderer.getContext();

    ctx.save();

    this.renderer.clear(this.clearColor);
    this.scheduler.runPhase("preRender", this.time.renderDelta, alpha);

    this.camera.apply(ctx);

    this.scheduler.runPhase("render", this.time.renderDelta, alpha);
    this.scene.render(this.renderer, alpha);
    this.scheduler.runPhase("postRender", this.time.renderDelta, alpha);

    ctx.restore();
  }

  // ==============================
  // Public API
  // ==============================

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  destroy(): void {
    this.stop();
    this.scene.destroy();
    this.input.destroy();
    this.renderer.destroy?.();
  }

  // ==============================
  // Scene Management
  // ==============================

  addEntity(entity: Entity): void {
    this.scene.add(entity);
  }

  removeEntity(entity: Entity): void {
    this.scene.remove(entity);
  }

  getScene(): Scene {
    return this.scene;
  }

  // ==============================
  // Systems Access
  // ==============================

  getRenderer(): IRenderer {
    return this.renderer;
  }

  getInput(): InputSystem {
    return this.input;
  }

  getCamera(): Camera2D {
    return this.camera;
  }

  getTime(): Time {
    return this.time;
  }

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  getFPS(): number {
    return this.loop.getFPS();
  }

  isRunning(): boolean {
    return this.loop.isRunning();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.resize(width, height, this.dpr);
  }

  getSize(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height
    };
  }

  setClearColor(color: string | null): void {
    this.clearColor = color;
  }

  getClearColor(): string | null {
    return this.clearColor;
  }

  getQuality(): QualityLevel {
    return this.quality;
  }

  getLoopTuning(): Readonly<Required<PixelEngineLoopOptions>> {
    return this.loopTuning;
  }
}

function resolveLoopTuning(
  quality: QualityLevel,
  loop?: PixelEngineLoopOptions
): Required<PixelEngineLoopOptions> {
  const defaults = getQualityLoopDefaults(quality);
  return {
    fixedTimeStep: resolvePositiveNumber(loop?.fixedTimeStep, defaults.fixedTimeStep),
    maxDelta: resolvePositiveNumber(loop?.maxDelta, defaults.maxDelta),
    maxUpdatesPerFrame: resolvePositiveInteger(
      loop?.maxUpdatesPerFrame,
      defaults.maxUpdatesPerFrame
    )
  };
}

function getQualityLoopDefaults(quality: QualityLevel): Required<PixelEngineLoopOptions> {
  if (quality === "low") {
    return {
      fixedTimeStep: 1000 / 45,
      maxDelta: 200,
      maxUpdatesPerFrame: 120
    };
  }
  if (quality === "high") {
    return {
      fixedTimeStep: 1000 / 75,
      maxDelta: 250,
      maxUpdatesPerFrame: 360
    };
  }
  return {
    fixedTimeStep: 1000 / 60,
    maxDelta: 250,
    maxUpdatesPerFrame: 240
  };
}

function resolvePositiveNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value)) return fallback;
  if (value <= 0) return fallback;
  return value;
}

function resolvePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  if (rounded <= 0) return fallback;
  return rounded;
}
