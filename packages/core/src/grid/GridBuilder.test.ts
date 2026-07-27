import { describe, it, expect } from "vitest";
import { GridBuilder } from "./GridBuilder";

describe("GridBuilder", () => {
  it("calculates correct pixel count", () => {
    const buffer = GridBuilder.build({
      width: 100,
      height: 100,
      pixelSize: 10,
      gap: 0
    });

    // 100 / 10 = 10 columnas
    // 100 / 10 = 10 filas
    // total = 100
    expect(buffer.count).toBe(100);
  });

  it("positions array length is correct", () => {
    const buffer = GridBuilder.build({
      width: 100,
      height: 100,
      pixelSize: 10,
      gap: 0
    });

    expect(buffer.positions.length).toBe(buffer.count * 2);
  });

  it("activation buffers are initialized to zero", () => {
    const buffer = GridBuilder.build({
      width: 100,
      height: 100,
      pixelSize: 10,
      gap: 0
    });

    for (let i = 0; i < buffer.count; i++) {
      expect(buffer.activationRead[i]).toBe(0);
      expect(buffer.activationWrite[i]).toBe(0);
    }
  });
});
