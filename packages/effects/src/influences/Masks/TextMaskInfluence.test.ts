import { beforeEach, describe, expect, it, vi } from "vitest";
import { TextMaskInfluence } from "./TextMaskInfluence";

describe("TextMaskInfluence", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        font: "",
        fillStyle: "",
        measureText: () => ({
          width: 0,
          actualBoundingBoxAscent: 0,
          actualBoundingBoxDescent: 0
        }),
        fillText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) })
      } as unknown as CanvasRenderingContext2D);
  });

  it("does not throw with blank text", () => {
    const influence = new TextMaskInfluence(
      " ",
      10,
      10,
      {
        font: "bold 16px Arial"
      }
    );

    expect(influence.getWidth()).toBeGreaterThan(0);
    expect(influence.getHeight()).toBeGreaterThan(0);
    expect(influence.getInfluence(10, 10, 1)).toBeGreaterThanOrEqual(0);
  });
});
