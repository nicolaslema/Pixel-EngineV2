import { MaskInfluence } from "./MaskInfluence";

export type SampleMode =
  | "alpha"
  | "luminance"
  | "threshold"
  | "invert";

export interface ImageMaskOptions {
  scale?: number;
  strength?: number;
  sampleMode?: SampleMode;
  threshold?: number;
  blurRadius?: number;
  dithering?: boolean;
}

export class ImageMaskInfluence extends MaskInfluence {
  protected onUpdate(delta: number): void {
    void delta;
  }

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement;

  private loaded = false;
  private failed = false;

  private scale: number;
  private sampleMode: SampleMode;
  private threshold: number;
  private blurRadius: number;
  private dithering: boolean;

  constructor(
    imageSrc: string,
    centerX: number,
    centerY: number,
    options: ImageMaskOptions = {}
  ) {
    super(centerX, centerY, options.strength ?? 1);

    this.scale = options.scale ?? 1;
    this.sampleMode = options.sampleMode ?? "luminance";
    this.threshold = options.threshold ?? 0.5;
    this.blurRadius = options.blurRadius ?? 0;
    this.dithering = options.dithering ?? false;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    this.image = new Image();
    this.image.src = imageSrc;

    this.image.onload = () => {
      this.generateMask();
      this.loaded = true;
    };

    this.image.onerror = () => {
      this.failed = true;
      this.loaded = false;
    };
  }

  update(_: number): void {
    // máscara estática
  }

  isAlive(): boolean {
    // Keep alive while loading so async images are not removed by manager.
    return !this.failed;
  }

  generateMask(): void {
    if (!this.image.width || !this.image.height) return;

    this.width = Math.max(1, Math.floor(this.image.width * this.scale));
    this.height = Math.max(1, Math.floor(this.image.height * this.scale));

    if (this.width <= 0 || this.height <= 0) return;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.clearRect(0, 0, this.width, this.height);
    try {
      this.ctx.drawImage(
        this.image,
        0,
        0,
        this.width,
        this.height
      );
    } catch {
      this.failed = true;
      return;
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
      this.failed = true;
      return;
    }

    const data = imageData.data;
    this.buffer = new Float32Array(this.width * this.height);

    for (let i = 0; i < this.buffer.length; i++) {
      const index = i * 4;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3] / 255;

      let value = 0;

      switch (this.sampleMode) {
        case "alpha":
          value = a;
          break;

        case "luminance":
          value = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          break;

        case "threshold": {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          value = lum > this.threshold ? 1 : 0;
          break;
        }

        case "invert":
          value = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          break;
      }

      if (this.dithering) {
        value += (Math.random() - 0.5) * 0.05;
      }

      this.buffer[i] = Math.max(0, Math.min(1, value));
    }

    if (this.blurRadius > 0) {
      this.applyBlur();
    }
  }

  private applyBlur() {
    const temp = new Float32Array(this.buffer.length);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {

        let sum = 0;
        let count = 0;

        for (let dy = -this.blurRadius; dy <= this.blurRadius; dy++) {
          for (let dx = -this.blurRadius; dx <= this.blurRadius; dx++) {

            const nx = x + dx;
            const ny = y + dy;

            if (
              nx >= 0 && nx < this.width &&
              ny >= 0 && ny < this.height
            ) {
              sum += this.buffer[ny * this.width + nx];
              count++;
            }
          }
        }

        temp[y * this.width + x] = sum / count;
      }
    }

    this.buffer = temp;
  }
}
