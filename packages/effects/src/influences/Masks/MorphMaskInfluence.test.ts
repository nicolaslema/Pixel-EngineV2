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
});
