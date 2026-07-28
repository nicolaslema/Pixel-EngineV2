import { Influence, BlendMode } from "../Influence";

export abstract class MaskInfluence implements Influence {
  priority = 8;
  blendMode: BlendMode = "max";

  protected width = 0;
  protected height = 0;

  // Buffer sampling resolution, decoupled from the world-space footprint (width/height)
  // above. 0 means "unset" -- resolved via getEffectiveBufferWidth/Height rather than
  // used directly, so subclasses that never touch these (every mask except a
  // gap-aware ImageMaskInfluence) transparently fall back to the footprint size,
  // preserving today's 1:1 behavior without needing to opt in.
  protected bufferWidth = 0;
  protected bufferHeight = 0;
  protected sampleBlockX = 1;
  protected sampleBlockY = 1;

  protected buffer!: Float32Array;

  constructor(
    protected centerX: number,
    protected centerY: number,
    protected strength: number = 1
  ) {}

  // 🔥 UPDATE FINAL (no abstract)
  update(delta: number): void {
    this.onUpdate(delta);
    this.generateMask(); // siempre regeneramos
  }

  protected abstract onUpdate(delta: number): void;
  protected abstract generateMask(): void;

  isAlive(): boolean {
    return true;
  }

  getBounds() {
    return {
      minX: this.centerX - this.width * 0.5,
      maxX: this.centerX + this.width * 0.5,
      minY: this.centerY - this.height * 0.5,
      maxY: this.centerY + this.height * 0.5
    };
  }

  getBuffer(): Float32Array {
    return this.buffer;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  protected getEffectiveBufferWidth(): number {
    return this.bufferWidth > 0 ? this.bufferWidth : this.width;
  }

  protected getEffectiveBufferHeight(): number {
    return this.bufferHeight > 0 ? this.bufferHeight : this.height;
  }

  getBufferWidth(): number {
    return this.getEffectiveBufferWidth();
  }

  getBufferHeight(): number {
    return this.getEffectiveBufferHeight();
  }

  getInfluence(
    x: number,
    y: number,
    maxSize: number
  ): number {
    if (!this.buffer) return 0;

    const originX = this.centerX - this.width * 0.5;
    const originY = this.centerY - this.height * 0.5;
    const localX = x - originX;
    const localY = y - originY;

    if (
      localX < 0 ||
      localY < 0 ||
      localX >= this.width ||
      localY >= this.height
    ) {
      return 0;
    }

    const bufferWidth = this.getEffectiveBufferWidth();
    const bufferHeight = this.getEffectiveBufferHeight();
    const bufX = localX * (bufferWidth / this.width);
    const bufY = localY * (bufferHeight / this.height);

    // Block-start (not center-rounded) so sampleBlockX/Y === 1 degenerates to
    // exactly Math.floor(bufX)/Math.floor(bufY) -- byte-identical to the old
    // single-pixel read for every mask that doesn't opt into a decoupled buffer.
    const blockStartX = Math.floor(bufX - (this.sampleBlockX - 1) / 2);
    const blockStartY = Math.floor(bufY - (this.sampleBlockY - 1) / 2);

    let sum = 0;
    let count = 0;
    for (let by = blockStartY; by < blockStartY + this.sampleBlockY; by++) {
      if (by < 0 || by >= bufferHeight) continue;
      for (let bx = blockStartX; bx < blockStartX + this.sampleBlockX; bx++) {
        if (bx < 0 || bx >= bufferWidth) continue;
        sum += this.buffer[by * bufferWidth + bx];
        count++;
      }
    }
    if (count === 0) return 0;

    return (sum / count) * maxSize * this.strength;
  }
}
