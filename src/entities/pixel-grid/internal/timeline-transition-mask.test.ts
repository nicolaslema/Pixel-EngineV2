import { describe, expect, it } from "vitest";
import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import { TimelineTransitionMaskInfluence } from "./timeline-transition-mask";

class StaticRectMask extends MaskInfluence {
  constructor(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    value: number
  ) {
    super(centerX, centerY, 1);
    this.width = width;
    this.height = height;
    this.buffer = new Float32Array(width * height);
    this.buffer.fill(value);
  }

  protected onUpdate(): void {}
  protected generateMask(): void {}
}

describe("timeline-transition-mask", () => {
  it("does not stretch a smaller target mask across the whole transition area", () => {
    const fromMask = new StaticRectMask(50, 50, 10, 10, 0);
    const toMask = new StaticRectMask(50, 50, 2, 2, 1);
    const transition = new TimelineTransitionMaskInfluence(
      fromMask,
      toMask,
      100,
      "fade",
      11
    );

    transition.update(50);

    let activeSamples = 0;
    const buffer = transition.getBuffer();
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] > 0.001) activeSamples++;
    }

    expect(activeSamples).toBeLessThan(24);
    expect(transition.getInfluence(50, 50, 1)).toBeGreaterThan(0.45);
    expect(transition.getInfluence(46, 46, 1)).toBe(0);
  });

  it("uses union bounds so distant masks can transition without clipping", () => {
    const fromMask = new StaticRectMask(20, 40, 10, 10, 0);
    const toMask = new StaticRectMask(80, 40, 10, 10, 1);
    const transition = new TimelineTransitionMaskInfluence(
      fromMask,
      toMask,
      100,
      "fade",
      22
    );

    transition.update(50);

    expect(transition.getWidth()).toBeGreaterThanOrEqual(70);
    expect(transition.getInfluence(80, 40, 1)).toBeGreaterThan(0.45);
    expect(transition.getInfluence(20, 40, 1)).toBe(0);
  });
});
