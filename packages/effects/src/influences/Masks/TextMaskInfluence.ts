import { MaskInfluence } from "./MaskInfluence";

export type TextRevealMode = "instant" | "typewriter";

export interface TextMaskRevealOptions {
  mode?: TextRevealMode;
  charsPerSecond?: number;
  loop?: boolean;
  startDelayMs?: number;
}

export interface TextMaskOptions {
  font: string;
  strength?: number;
  blurRadius?: number;
  reveal?: TextMaskRevealOptions;
}

export class TextMaskInfluence extends MaskInfluence {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private text: string;
  private font: string;
  private blurRadius: number;
  private revealMode: TextRevealMode;
  private charsPerSecond: number;
  private revealLoop: boolean;
  private startDelayMs: number;
  private elapsed = 0;
  private revealedChars: number;

  constructor(
    text: string,
    centerX: number,
    centerY: number,
    options: TextMaskOptions
  ) {
    super(centerX, centerY, options.strength ?? 1);

    this.text = text;
    this.font = options.font;
    this.blurRadius = options.blurRadius ?? 0;
    this.revealMode = options.reveal?.mode ?? "instant";
    this.charsPerSecond = Math.max(0.1, options.reveal?.charsPerSecond ?? 12);
    this.revealLoop = options.reveal?.loop ?? false;
    this.startDelayMs = Math.max(0, options.reveal?.startDelayMs ?? 0);
    this.revealedChars = this.revealMode === "typewriter" ? 0 : text.length;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    this.generateMask();
  }

  update(delta: number): void {
    if (this.revealMode !== "typewriter") return;

    this.elapsed += delta;
    const effectiveElapsed = Math.max(0, this.elapsed - this.startDelayMs);
    const totalChars = this.text.length;
    let charsRevealed = Math.floor(effectiveElapsed * 0.001 * this.charsPerSecond);

    if (this.revealLoop && totalChars > 0) {
      const revealDurationMs = (totalChars / this.charsPerSecond) * 1000;
      const holdMs = revealDurationMs * 0.3; // brief pause fully revealed before restarting
      const cycleMs = revealDurationMs + holdMs;
      const cyclePos = effectiveElapsed % cycleMs;
      charsRevealed =
        cyclePos >= revealDurationMs
          ? totalChars
          : Math.floor(cyclePos * 0.001 * this.charsPerSecond);
    }

    charsRevealed = Math.max(0, Math.min(totalChars, charsRevealed));
    if (charsRevealed !== this.revealedChars) {
      this.revealedChars = charsRevealed;
      this.generateMask();
    }
  }

  resetReveal(): void {
    if (this.revealMode !== "typewriter") return;
    this.elapsed = 0;
    this.revealedChars = 0;
    this.generateMask();
  }

  protected onUpdate(_: number): void {}

  generateMask(): void {
    this.ctx.font = this.font;

    const metrics = this.ctx.measureText(this.text);

    this.width = Math.max(1, Math.ceil(metrics.width));
    this.height = Math.max(1, Math.ceil(
      metrics.actualBoundingBoxAscent +
      metrics.actualBoundingBoxDescent
    ));

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.buffer = new Float32Array(
      this.width * this.height
    );

    if (!this.text.trim()) {
      return;
    }

    const visibleText =
      this.revealMode === "typewriter" ? this.text.slice(0, this.revealedChars) : this.text;

    this.ctx.font = this.font;
    this.ctx.fillStyle = "white";
    if (visibleText.length > 0) {
      this.ctx.fillText(
        visibleText,
        0,
        Math.max(1, metrics.actualBoundingBoxAscent)
      );
    }

    let imageData: ImageData;
    try {
      imageData = this.ctx.getImageData(
        0,
        0,
        this.width,
        this.height
      );
    } catch {
      return;
    }

    const data = imageData.data;

    for (let i = 0; i < this.buffer.length; i++) {
      const alpha = data[i * 4 + 3] / 255;
      this.buffer[i] = alpha;
    }

    if (this.blurRadius > 0) {
      this.applyBlur();
    }
  }

  private applyBlur() {
    const temp = new Float32Array(this.buffer.length);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        let sum = 0;
        let count = 0;

        for (
          let dx = -this.blurRadius;
          dx <= this.blurRadius;
          dx++
        ) {
          for (
            let dy = -this.blurRadius;
            dy <= this.blurRadius;
            dy++
          ) {
            const nx = x + dx;
            const ny = y + dy;

            if (
              nx >= 0 &&
              nx < this.width &&
              ny >= 0 &&
              ny < this.height
            ) {
              sum +=
                this.buffer[
                  ny * this.width + nx
                ];
              count++;
            }
          }
        }

        temp[y * this.width + x] =
          sum / count;
      }
    }

    this.buffer = temp;
  }
}
