export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  inside: boolean;
}

export class InputSystem {
  private static readonly OFFSCREEN_COORD = -9999;
  private mouse: MouseState = {
    x: InputSystem.OFFSCREEN_COORD,
    y: InputSystem.OFFSCREEN_COORD,
    isDown: false,
    inside: false
  };
  private readonly usePointerEvents: boolean;

  constructor(private canvas: HTMLCanvasElement) {
    this.usePointerEvents = typeof PointerEvent !== "undefined";
    this.attach();
  }

  private attach(): void {
    if (this.usePointerEvents) {
      this.canvas.addEventListener("pointermove", this.handlePointerMove);
      this.canvas.addEventListener("pointerenter", this.handlePointerEnter);
      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      this.canvas.addEventListener("pointerup", this.handlePointerUp);
      this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
      this.canvas.addEventListener("pointercancel", this.handlePointerCancel);
      if (typeof window !== "undefined") {
        window.addEventListener("pointerup", this.handlePointerUp);
        window.addEventListener("pointercancel", this.handlePointerCancel);
      }
      return;
    }

    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseenter", this.handleMouseEnter);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
  }

  private setPosition(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = clientX - rect.left;
    this.mouse.y = clientY - rect.top;
  }

  private resetPointerState(): void {
    this.mouse.x = InputSystem.OFFSCREEN_COORD;
    this.mouse.y = InputSystem.OFFSCREEN_COORD;
    this.mouse.isDown = false;
    this.mouse.inside = false;
  }

  private handlePointerMove = (e: PointerEvent): void => {
    this.setPosition(e.clientX, e.clientY);
  };

  private handlePointerEnter = (e: PointerEvent): void => {
    this.mouse.inside = true;
    this.setPosition(e.clientX, e.clientY);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.mouse.inside = true;
    this.mouse.isDown = true;
    this.setPosition(e.clientX, e.clientY);
  };

  private handlePointerUp = (e: PointerEvent): void => {
    this.mouse.isDown = false;
    if (e.target === this.canvas || this.mouse.inside) {
      this.setPosition(e.clientX, e.clientY);
    }
  };

  private handlePointerLeave = (): void => {
    this.resetPointerState();
  };

  private handlePointerCancel = (): void => {
    this.resetPointerState();
  };

  private handleMouseMove = (e: MouseEvent): void => {
    this.setPosition(e.clientX, e.clientY);
  };

  private handleMouseDown = (): void => {
    this.mouse.isDown = true;
  };

  private handleMouseUp = (): void => {
    this.mouse.isDown = false;
  };

  private handleMouseLeave = (): void => {
    this.resetPointerState();
  };

  private handleMouseEnter = (): void => {
    this.mouse.inside = true;
  };

  getMouse(): Readonly<MouseState> {
    return this.mouse;
  }

  destroy(): void {
    if (this.usePointerEvents) {
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerenter", this.handlePointerEnter);
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointerup", this.handlePointerUp);
      this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
      this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
      if (typeof window !== "undefined") {
        window.removeEventListener("pointerup", this.handlePointerUp);
        window.removeEventListener("pointercancel", this.handlePointerCancel);
      }
      return;
    }

    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseenter", this.handleMouseEnter);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
  }
}
