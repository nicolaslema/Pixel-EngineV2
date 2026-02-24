export type FrameCallback = (simulationDelta: number) => void;
export type RenderCallback = (alpha: number, renderDelta: number) => void;

export interface GameLoopConfig {
  fixedTimeStep?: number;
  maxDelta?: number;
  maxUpdatesPerFrame?: number;
  onRender?: RenderCallback;
  getTimeScale?: () => number;
}

export class GameLoop {
  private running = false;
  private frameId: number | null = null;

  private lastTime = 0;
  private accumulator = 0;

  private readonly fixedTimeStep: number;
  private readonly maxDelta: number;
  private readonly maxUpdatesPerFrame: number;
  private readonly onRender?: RenderCallback;
  private readonly getTimeScale?: () => number;

  private fps = 0;
  private frames = 0;
  private fpsTimer = 0;

  constructor(
    private frame: FrameCallback,
    config?: GameLoopConfig
  ) {
    this.fixedTimeStep = config?.fixedTimeStep ?? 1000 / 60;
    this.maxDelta = config?.maxDelta ?? 250;
    this.maxUpdatesPerFrame = config?.maxUpdatesPerFrame ?? 240;
    this.onRender = config?.onRender;
    this.getTimeScale = config?.getTimeScale;
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTime = performance.now();
    this.fpsTimer = this.lastTime;

    this.frameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;

    let delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Prevent spiral of death
    if (delta > this.maxDelta) {
      delta = this.maxDelta;
    }

    const timeScale = this.resolveTimeScale();
    this.accumulator += delta * timeScale;

    let updateCount = 0;

    while (
      this.accumulator >= this.fixedTimeStep &&
      updateCount < this.maxUpdatesPerFrame
    ) {
      this.frame(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      updateCount++;
    }

    const alpha = this.fixedTimeStep > 0
      ? Math.max(0, Math.min(1, this.accumulator / this.fixedTimeStep))
      : 1;
    this.onRender?.(alpha, delta);

    this.calculateFPS(currentTime);

    this.frameId = requestAnimationFrame(this.loop);
  };

  private calculateFPS(currentTime: number): void {
    this.frames++;

    if (currentTime >= this.fpsTimer + 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.fpsTimer = currentTime;
    }
  }

  private resolveTimeScale(): number {
    const value = this.getTimeScale?.() ?? 1;
    if (!Number.isFinite(value)) return 1;
    if (value < 0) return 0;
    return value;
  }

  getFPS(): number {
    return this.fps;
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): Readonly<Required<Pick<GameLoopConfig, "fixedTimeStep" | "maxDelta" | "maxUpdatesPerFrame">>> {
    return {
      fixedTimeStep: this.fixedTimeStep,
      maxDelta: this.maxDelta,
      maxUpdatesPerFrame: this.maxUpdatesPerFrame
    };
  }
}
