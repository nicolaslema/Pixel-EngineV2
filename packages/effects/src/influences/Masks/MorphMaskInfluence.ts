import { MaskInfluence } from "./MaskInfluence";

export class MorphMaskInfluence extends MaskInfluence {
  protected onUpdate(delta: number): void {
    void delta;
  }

  private maskA: MaskInfluence;
  private maskB: MaskInfluence;

  private durationMs: number;
  private time = 0;
  private t = 0;
  private finished = false;

  constructor(
    maskA: MaskInfluence,
    maskB: MaskInfluence,
    durationMs: number = 1000
  ) {
    super(maskA["centerX"], maskA["centerY"], 1);

    this.maskA = maskA;
    this.maskB = maskB;
    this.durationMs = durationMs;

    this.width = Math.max(
      maskA.getWidth(),
      maskB.getWidth()
    );

    this.height = Math.max(
      maskA.getHeight(),
      maskB.getHeight()
    );

    this.buffer = new Float32Array(this.width * this.height);
  }

  update(delta: number): void {

    if (this.finished) return;

    this.time += delta;
    this.t = Math.min(1, this.time / this.durationMs);

    const bufferA = this.maskA.getBuffer();
    const bufferB = this.maskB.getBuffer();

    // Buffer resolution, not footprint size -- these can differ for a gap-aware
    // ImageMaskInfluence (see MaskInfluence.getBufferWidth/Height), and buffer
    // indexing below must match the buffer's actual pixel dimensions.
    const wA = this.maskA.getBufferWidth();
    const hA = this.maskA.getBufferHeight();
    const wB = this.maskB.getBufferWidth();
    const hB = this.maskB.getBufferHeight();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {

        const a = this.sampleBuffer(bufferA, wA, hA, x, y);
        const b = this.sampleBuffer(bufferB, wB, hB, x, y);

        const index = y * this.width + x;

        this.buffer[index] =
          a * (1 - this.t) + b * this.t;
      }
    }

    if (this.t >= 1) {
      this.finished = true;
    }
  }

  generateMask(): void {}

  isAlive(): boolean {
    return !this.finished;
  }

  private sampleBuffer(
    buffer: Float32Array,
    w: number,
    h: number,
    x: number,
    y: number
  ): number {

    if (!buffer) return 0;

    const sx = Math.floor(x * (w / this.width));
    const sy = Math.floor(y * (h / this.height));

    if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
      return 0;
    }

    return buffer[sy * w + sx];
  }
}
