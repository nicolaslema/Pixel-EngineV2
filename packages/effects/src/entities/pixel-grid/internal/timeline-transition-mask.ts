import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import { MaskTimelineTransitionMode } from "../types";

export class TimelineTransitionMaskInfluence extends MaskInfluence {
  private time = 0;
  private t = 0;
  private finished = false;
  private readonly durationMsSafe: number;
  private readonly sourceA: Float32Array;
  private readonly sourceB: Float32Array;
  private readonly dissolveThresholds: Float32Array | null;
  private readonly sampleOriginX: number;
  private readonly sampleOriginY: number;

  constructor(
    private readonly maskA: MaskInfluence,
    private readonly maskB: MaskInfluence,
    private readonly durationMs: number,
    private readonly mode: MaskTimelineTransitionMode,
    private readonly seed: number
  ) {
    const boundsA = maskA.getBounds();
    const boundsB = maskB.getBounds();
    const minX = Math.min(boundsA.minX, boundsB.minX);
    const maxX = Math.max(boundsA.maxX, boundsB.maxX);
    const minY = Math.min(boundsA.minY, boundsB.minY);
    const maxY = Math.max(boundsA.maxY, boundsB.maxY);
    const width = Math.max(1, Math.ceil(maxX - minX));
    const height = Math.max(1, Math.ceil(maxY - minY));

    super(minX + width * 0.5, minY + height * 0.5, 1);

    this.width = width;
    this.height = height;
    this.sampleOriginX = minX;
    this.sampleOriginY = minY;
    this.buffer = new Float32Array(this.width * this.height);
    this.durationMsSafe = Math.max(1, durationMs);
    this.sourceA = new Float32Array(this.buffer.length);
    this.sourceB = new Float32Array(this.buffer.length);
    this.sampleMaskInWorldSpace(this.maskA, this.sourceA);
    this.sampleMaskInWorldSpace(this.maskB, this.sourceB);
    this.dissolveThresholds = this.mode === "dissolve"
      ? buildThresholds(this.buffer.length, this.seed)
      : null;
  }

  update(delta: number): void {
    if (this.finished) return;

    this.time += delta;
    this.t = Math.min(1, this.time / this.durationMsSafe);

    const buffer = this.buffer;
    const sourceA = this.sourceA;
    const sourceB = this.sourceB;

    if (this.mode === "dissolve" && this.dissolveThresholds) {
      const thresholds = this.dissolveThresholds;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = thresholds[i] <= this.t ? sourceB[i] : sourceA[i];
      }
    } else {
      const blend = this.mode === "morph"
        ? this.t * this.t * (3 - 2 * this.t)
        : this.t;
      const invBlend = 1 - blend;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = sourceA[i] * invBlend + sourceB[i] * blend;
      }
    }

    if (this.t >= 1) {
      this.finished = true;
    }
  }

  protected onUpdate(delta: number): void {
    void delta;
  }

  protected generateMask(): void {}

  isAlive(): boolean {
    return !this.finished;
  }

  private sampleMaskInWorldSpace(mask: MaskInfluence, target: Float32Array): void {
    const source = mask.getBuffer();
    const sourceWidth = mask.getWidth();
    const sourceHeight = mask.getHeight();

    if (sourceWidth <= 0 || sourceHeight <= 0 || source.length === 0) {
      target.fill(0);
      return;
    }

    let write = 0;
    for (let y = 0; y < this.height; y++) {
      const worldY = this.sampleOriginY + y + 0.5;
      for (let x = 0; x < this.width; x++) {
        const worldX = this.sampleOriginX + x + 0.5;
        target[write++] = mask.getInfluence(worldX, worldY, 1);
      }
    }
  }
}

function buildThresholds(size: number, seed: number): Float32Array {
  const thresholds = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    thresholds[i] = hash01(i, seed);
  }
  return thresholds;
}

function hash01(index: number, seed: number): number {
  let value = index ^ seed;
  value = (value ^ 61) ^ (value >>> 16);
  value = value + (value << 3);
  value = value ^ (value >>> 4);
  value = Math.imul(value, 0x27d4eb2d);
  value = value ^ (value >>> 15);
  return (value >>> 0) / 4294967295;
}
