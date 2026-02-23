import { GameLoop } from "./GameLoop";
import { PixelEngineOptions } from "./types";
import { Renderer } from "../renderers/Renderer";
import { Scene } from "../scene/Scene";
import { Entity } from "../scene/Entity";
import { InputSystem } from "../input/InputSystem";
import { Time } from "./Time";
import { Camera2D } from "../renderers/Camera2D";
import { IRenderer } from "../renderers/IRenderer";

export class PixelEngine {
  private renderer: IRenderer;
  private loop: GameLoop;
  private scene: Scene;
  private input: InputSystem;
  private time: Time;
  private camera: Camera2D;
  private clearColor: string | null;
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
    const { canvas, width, height, rendererFactory } = options;

    this.width = width;
    this.height = height;
    this.clearColor = options.clearColor ?? "black";
    this.dpr = Math.max(1, options.devicePixelRatio ?? window.devicePixelRatio ?? 1);

    this.renderer = rendererFactory
      ? rendererFactory(canvas)
      : new Renderer(canvas);
    this.scene = new Scene();
    this.input = new InputSystem(canvas);
    this.time = new Time();
    this.camera = new Camera2D();
    this.renderer.resize(width, height, this.dpr);

    this.loop = new GameLoop((deltaTime: number) => {
      this.update(deltaTime);
    }, {
      onRender: (alpha: number) => {
        this.render(alpha);
      }
    });
  }

  // ==============================
  // Internal lifecycle
  // ==============================

  private update(deltaTime: number): void {
    const scaledDelta = this.time.update(deltaTime);
    const mouse = this.input.getMouse();

    this.mouse.x = mouse.x;
    this.mouse.y = mouse.y;
    this.mouse.inside = mouse.inside;
    this.mouse.down = mouse.isDown;

    this.scene.update(scaledDelta);
  }

  private render(alpha = 1): void {
    const ctx = this.renderer.getContext();

    ctx.save();

    this.renderer.clear(this.clearColor);

    this.camera.apply(ctx);

    this.scene.render(this.renderer, alpha);

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
}
