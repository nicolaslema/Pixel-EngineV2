import { beforeEach, describe, expect, it, vi } from "vitest";
import { TextMaskInfluence } from "./TextMaskInfluence";

describe("TextMaskInfluence", () => {
  let fillText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fillText = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        font: "",
        fillStyle: "",
        measureText: () => ({
          width: 100,
          actualBoundingBoxAscent: 20,
          actualBoundingBoxDescent: 5
        }),
        fillText,
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

  it("mode 'instant' (default) draws the full text once at construction", () => {
    new TextMaskInfluence("HELLO", 10, 10, { font: "bold 16px Arial" });

    expect(fillText).toHaveBeenCalledTimes(1);
    expect(fillText.mock.calls[0][0]).toBe("HELLO");
  });

  it("mode 'instant' ignores update() -- byte-identical no-op, same as before reveal existed", () => {
    const influence = new TextMaskInfluence("HELLO", 10, 10, { font: "bold 16px Arial" });
    fillText.mockClear();

    influence.update(10000);

    expect(fillText).not.toHaveBeenCalled();
  });

  it("typewriter mode reveals characters progressively as update() advances", () => {
    const influence = new TextMaskInfluence("HELLO", 10, 10, {
      font: "bold 16px Arial",
      reveal: { mode: "typewriter", charsPerSecond: 10, loop: false }
    });
    fillText.mockClear(); // constructor's initial draw is 0 chars, skipped

    influence.update(100); // floor(100*0.01)=1 char
    expect(fillText).toHaveBeenCalledTimes(1);
    expect(fillText.mock.calls[0][0]).toBe("H");

    influence.update(50); // total 150ms -> still floor(1.5)=1, no change
    expect(fillText).toHaveBeenCalledTimes(1);

    influence.update(50); // total 200ms -> floor(2)=2
    expect(fillText).toHaveBeenCalledTimes(2);
    expect(fillText.mock.calls[1][0]).toBe("HE");
  });

  it("typewriter mode with loop: false stops advancing once fully revealed", () => {
    const influence = new TextMaskInfluence("HI", 10, 10, {
      font: "bold 16px Arial",
      reveal: { mode: "typewriter", charsPerSecond: 10, loop: false }
    });
    fillText.mockClear();

    influence.update(200); // floor(2)=2 -> fully revealed
    expect(fillText.mock.calls.at(-1)?.[0]).toBe("HI");
    const callsAfterFull = fillText.mock.calls.length;

    influence.update(1000); // way past full reveal, clamped
    expect(fillText).toHaveBeenCalledTimes(callsAfterFull);
  });

  it("typewriter mode with loop: true restarts the reveal after a full cycle", () => {
    const influence = new TextMaskInfluence("HI", 10, 10, {
      font: "bold 16px Arial",
      reveal: { mode: "typewriter", charsPerSecond: 10, loop: true }
    });
    fillText.mockClear();

    // revealDurationMs = (2/10)*1000 = 200ms; holdMs = 200*0.3 = 60ms; cycleMs = 260ms.
    influence.update(200); // cyclePos=200 -> fully revealed, entering the hold band
    expect(fillText.mock.calls.at(-1)?.[0]).toBe("HI");

    influence.update(160); // elapsed=360 -> cyclePos=360%260=100 -> floor(1)=1 char
    expect(fillText.mock.calls.at(-1)?.[0]).toBe("H");
  });

  it("resetReveal() restarts the typewriter animation from the beginning", () => {
    const influence = new TextMaskInfluence("HELLO", 10, 10, {
      font: "bold 16px Arial",
      reveal: { mode: "typewriter", charsPerSecond: 10, loop: false }
    });
    fillText.mockClear();

    influence.update(300); // floor(3)=3 chars
    expect(fillText.mock.calls.at(-1)?.[0]).toBe("HEL");

    influence.resetReveal();
    fillText.mockClear();

    influence.update(100); // fresh start -> 1 char again, not resuming from 3
    expect(fillText).toHaveBeenCalledTimes(1);
    expect(fillText.mock.calls[0][0]).toBe("H");
  });

  it("resetReveal() is a no-op in 'instant' mode", () => {
    const influence = new TextMaskInfluence("HELLO", 10, 10, { font: "bold 16px Arial" });
    fillText.mockClear();

    influence.resetReveal();

    expect(fillText).not.toHaveBeenCalled();
  });
});
