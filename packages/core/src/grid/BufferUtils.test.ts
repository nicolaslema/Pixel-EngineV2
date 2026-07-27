import { describe, it, expect } from "vitest";
import { GridBuilder } from "./GridBuilder";
import { swapBuffers, applyBaseActivation } from "./BufferUtils";

describe("Buffer lifecycle", () => {
  it("swapBuffers copies write into read and clears write", () => {
    const buffer = GridBuilder.build({
      width: 20,
      height: 20,
      pixelSize: 10,
      gap: 0
    });

    buffer.activationWrite[0] = 1;

    swapBuffers(buffer);

    expect(buffer.activationRead[0]).toBe(1);
    expect(buffer.activationWrite[0]).toBe(0);
  });

  it("applyBaseActivation enforces minimum activation", () => {
    const buffer = GridBuilder.build({
      width: 20,
      height: 20,
      pixelSize: 10,
      gap: 0
    });

    buffer.activationRead[0] = 0.2;
    buffer.baseActivation[0] = 0.5;

    applyBaseActivation(buffer);

    expect(buffer.activationRead[0]).toBe(0.5);
  });
});
