import { describe, expect, it } from "vitest";
import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import { createMaskRegistry } from "./mask-registry";

class StaticMask extends MaskInfluence {
  constructor() {
    super(0, 0, 1);
    this.width = 1;
    this.height = 1;
    this.buffer = new Float32Array([1]);
  }
  protected onUpdate(): void {}
  protected generateMask(): void {}
}

describe("mask-registry", () => {
  it("resolves by id and fallback type safely", () => {
    const image = new StaticMask();
    const text = new StaticMask();

    const registry = createMaskRegistry({
      imageMasks: [
        {
          id: "img-1",
          type: "image",
          influence: image
        }
      ],
      textMasks: [
        {
          id: "txt-1",
          type: "text",
          influence: text
        }
      ]
    });

    expect(registry.getById("img-1")?.influence).toBe(image);
    expect(
      registry.resolve(
        {
          id: "txt-1",
          type: "text"
        },
        "image"
      )?.influence
    ).toBe(text);
    expect(
      registry.resolve(
        {
          id: "missing",
          type: "image"
        },
        "text"
      )?.influence
    ).toBe(text);
    expect(registry.hasAny()).toBe(true);
  });
});
