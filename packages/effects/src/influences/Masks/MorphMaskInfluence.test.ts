import { describe, it, expect } from "vitest";
import { MaskInfluence } from "./MaskInfluence";
import { MorphMaskInfluence } from "./MorphMaskInfluence";

class StaticMask extends MaskInfluence {
  constructor(
    centerX: number,
    centerY: number,
    private maskWidth: number,
    private maskHeight: number,
    private value: number
  ) {
    super(centerX, centerY, 1);
    this.width = maskWidth;
    this.height = maskHeight;
    this.buffer = new Float32Array(this.width * this.height).fill(this.value);
  }

  protected onUpdate(_delta: number): void {}
  protected generateMask(): void {}
}

class StaticDecoupledBufferMask extends MaskInfluence {
  constructor(
    centerX: number,
    centerY: number,
    footprintSize: number,
    bufferSize: number,
    values: number[]
  ) {
    super(centerX, centerY, 1);
    this.width = footprintSize;
    this.height = footprintSize;
    this.bufferWidth = bufferSize;
    this.bufferHeight = bufferSize;
    this.buffer = Float32Array.from(values);
  }

  protected onUpdate(_delta: number): void {}
  protected generateMask(): void {}
}

describe("MorphMaskInfluence", () => {
  it("uses milliseconds for morph duration", () => {
    const maskA = new StaticMask(0, 0, 4, 4, 1);
    const maskB = new StaticMask(0, 0, 4, 4, 0);
    const morph = new MorphMaskInfluence(maskA, maskB, 1000);

    morph.update(500);
    expect(morph.isAlive()).toBe(true);

    morph.update(500);
    expect(morph.isAlive()).toBe(false);
  });

  it("samples each source mask using its buffer resolution, not its footprint size", () => {
    // Footprint 4x4 but the actual buffer is stored at 2x2 (e.g. a gap-aware
    // ImageMaskInfluence) -- sampleBuffer must index using getBufferWidth/Height
    // (2x2, buffer.length=4), not getWidth/Height (4x4, would index out of bounds
    // into a length-4 array and silently read `undefined` -> NaN).
    const maskA = new StaticDecoupledBufferMask(0, 0, 4, 2, [10, 20, 30, 40]);
    const maskB = new StaticDecoupledBufferMask(0, 0, 4, 2, [1, 1, 1, 1]);
    const morph = new MorphMaskInfluence(maskA, maskB, 1000);

    morph.update(500); // t = 0.5

    const buffer = morph.getBuffer();
    for (const value of buffer) {
      expect(Number.isNaN(value)).toBe(false);
    }
    // At t=0.5, every sampled cell should be the midpoint between maskA's (10-40
    // range) and maskB's constant 1 -- i.e. strictly greater than 1 (not 1, which
    // is what an all-out-of-bounds/undefined read would collapse to via NaN
    // propagation never actually reaching a defined comparison).
    expect(buffer.every((value) => value > 1)).toBe(true);
  });
});
