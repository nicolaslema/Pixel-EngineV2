import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameLoop, FrameCallback } from "./GameLoop";

describe("GameLoop", () => {
  let frame: FrameCallback;
  let rafCallback: FrameRequestCallback | null = null;
  let now = 0;

  beforeEach(() => {
    frame = vi.fn() as FrameCallback;
    rafCallback = null;
    now = 0;

    vi.spyOn(performance, "now").mockImplementation(() => now);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback): number => {
        rafCallback = cb;
        return 1;
      }
    );

    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  it("should call frame callback", () => {
    const loop = new GameLoop(frame);

    loop.start();

    now = 17;
    rafCallback?.(17);

    expect(frame).toHaveBeenCalled();
  });
  it("should clamp large delta values", () => {
    const loop = new GameLoop(frame, { fixedTimeStep: 16 });

    loop.start();

    now = 1000;   // simulamos salto enorme
    rafCallback?.(1000);

    expect(frame).toHaveBeenCalled();
  });

  it("should call onRender with interpolation alpha between 0 and 1", () => {
    const onRender = vi.fn();
    const loop = new GameLoop(frame, {
      fixedTimeStep: 16,
      onRender
    });

    loop.start();

    now = 20;
    rafCallback?.(20);

    expect(onRender).toHaveBeenCalled();
    const alpha = onRender.mock.calls.at(-1)?.[0] as number;
    const renderDelta = onRender.mock.calls.at(-1)?.[1] as number;
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThanOrEqual(1);
    expect(renderDelta).toBe(20);
  });

  it("should apply timeScale at accumulator level while keeping fixed simulation step", () => {
    let timeScale = 1;
    const loop = new GameLoop(frame, {
      fixedTimeStep: 16,
      getTimeScale: () => timeScale
    });

    loop.start();

    now = 16;
    rafCallback?.(16);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(frame).toHaveBeenLastCalledWith(16);

    timeScale = 0;
    now = 32;
    rafCallback?.(32);
    expect(frame).toHaveBeenCalledTimes(1);

    timeScale = 2;
    now = 48;
    rafCallback?.(48);
    expect(frame).toHaveBeenCalledTimes(3);
    expect(frame).toHaveBeenLastCalledWith(16);
  });
});
