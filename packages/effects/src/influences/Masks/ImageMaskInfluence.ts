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
  /**
   * Grid cell spacing (world units). When provided, the mask buffer is generated
   * at (up to) the source image's native resolution instead of tied 1:1 to the
   * on-grid footprint (`scale`), and getInfluence() box-averages a gap-sized
   * block per query instead of reading one pixel -- fixes fine detail being lost
   * to nearest-neighbor decimation when a high-resolution image is displayed on
   * a coarser grid. Omit to keep the previous (footprint == buffer resolution,
   * single-pixel sampling) behavior unchanged.
   */
  gap?: number;
  /**
   * Fired when the mask image fails to load (network/404/CORS) or when generating the
   * sampling buffer fails (drawImage/getImageData). `failed` is set regardless of whether
   * this is provided -- this is purely an additional notification, not the failure signal
   * itself.
   */
  onError?: (reason: string) => void;
}

/** Longest side a mask's sampling buffer is allowed to reach, regardless of source
 * image resolution -- bounds memory (Float32Array) and per-query box-average cost. */
const MAX_MASK_BUFFER_DIMENSION = 1024;

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
  private gap?: number;
  private onError?: (reason: string) => void;

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
    this.gap = options.gap;
    this.onError = options.onError;

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
      this.onError?.("image failed to load");
    };
  }

  update(_: number): void {
    // máscara estática
  }

  isAlive(): boolean {
    // Keep alive while loading so async images are not removed by manager.
    return !this.failed;
  }

  private resolveBufferResolution(): { width: number; height: number } {
    if (!this.gap) {
      return { width: this.width, height: this.height };
    }

    const nativeWidth = this.image.width;
    const nativeHeight = this.image.height;
    const longest = Math.max(nativeWidth, nativeHeight);
    const ratio = longest > MAX_MASK_BUFFER_DIMENSION ? MAX_MASK_BUFFER_DIMENSION / longest : 1;

    return {
      width: Math.max(1, Math.round(nativeWidth * ratio)),
      height: Math.max(1, Math.round(nativeHeight * ratio))
    };
  }

  generateMask(): void {
    if (!this.image.width || !this.image.height) return;

    this.width = Math.max(1, Math.floor(this.image.width * this.scale));
    this.height = Math.max(1, Math.floor(this.image.height * this.scale));

    if (this.width <= 0 || this.height <= 0) return;

    const { width: bufferWidth, height: bufferHeight } = this.resolveBufferResolution();

    this.canvas.width = bufferWidth;
    this.canvas.height = bufferHeight;

    this.ctx.clearRect(0, 0, bufferWidth, bufferHeight);
    try {
      this.ctx.drawImage(
        this.image,
        0,
        0,
        bufferWidth,
        bufferHeight
      );
    } catch {
      this.failed = true;
      this.onError?.("drawImage failed");
      return;
    }

    let imageData: ImageData;
    try {
      imageData = this.ctx.getImageData(
        0,
        0,
        bufferWidth,
        bufferHeight
      );
    } catch {
      this.failed = true;
      this.onError?.("getImageData failed");
      return;
    }

    const data = imageData.data;
    this.buffer = new Float32Array(bufferWidth * bufferHeight);

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

    this.bufferWidth = bufferWidth;
    this.bufferHeight = bufferHeight;

    if (this.gap) {
      this.sampleBlockX = Math.min(8, Math.max(1, Math.round(this.gap * bufferWidth / this.width)));
      this.sampleBlockY = Math.min(8, Math.max(1, Math.round(this.gap * bufferHeight / this.height)));
    }

    if (this.blurRadius > 0) {
      this.applyBlur();
    }
  }

  private applyBlur() {
    const width = this.bufferWidth;
    const height = this.bufferHeight;
    const temp = new Float32Array(this.buffer.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {

        let sum = 0;
        let count = 0;

        for (let dy = -this.blurRadius; dy <= this.blurRadius; dy++) {
          for (let dx = -this.blurRadius; dx <= this.blurRadius; dx++) {

            const nx = x + dx;
            const ny = y + dy;

            if (
              nx >= 0 && nx < width &&
              ny >= 0 && ny < height
            ) {
              sum += this.buffer[ny * width + nx];
              count++;
            }
          }
        }

        temp[y * width + x] = sum / count;
      }
    }

    this.buffer = temp;
  }
}
