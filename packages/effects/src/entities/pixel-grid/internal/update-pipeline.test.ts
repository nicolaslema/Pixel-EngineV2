import { describe, expect, it, vi } from "vitest";
import { PixelCellBuffer } from "./cell-buffer";
import { runPixelGridUpdatePipeline } from "./update-pipeline";
import { createPixelGridRuntimeState } from "./runtime-state";
import { createTestCellBuffer } from "./test-utils/cell-buffer";
import * as runtimeState from "./runtime-state";

describe("runPixelGridUpdatePipeline", () => {
  it("calls dependencies in the expected order and fuses resetCell + mask-weight writes into one loop (3b.1)", () => {
    const compactSpy = vi.spyOn(runtimeState, "compactAliveRipples");
    const order: string[] = [];
    const buffer = createTestCellBuffer([
      { x: 0, y: 0, color: "#fff", gap: 10 },
      { x: 10, y: 0, color: "#fff", gap: 10 }
    ]);
    const runtime = createPixelGridRuntimeState(buffer.count);

    const influenceManager = {
      update: vi.fn(() => order.push("influenceManager.update")),
      apply: vi.fn(() => order.push("influenceManager.apply"))
    } as any;

    const maskState = {
      update: vi.fn(() => order.push("maskState.update"))
    } as any;

    const writeCellMaskWeights = vi.fn((_buffer: PixelCellBuffer, index: number) =>
      order.push(`writeCellMaskWeights:${index}`)
    );
    const prepareMaskWeightRecompute = vi.fn(() => {
      order.push("prepareMaskWeightRecompute");
      return true;
    });
    const applyHoverBreathingAndRipple = vi.fn(() =>
      order.push("applyHoverBreathingAndRipple")
    );
    const applyPostEffects = vi.fn(() => order.push("applyPostEffects"));

    runPixelGridUpdatePipeline({
      delta: 16,
      buffer,
      expandEase: 0.1,
      runtime,
      influenceManager,
      maskState,
      getCellIndex: (x: number) => x,
      prepareMaskWeightRecompute,
      writeCellMaskWeights,
      applyHoverBreathingAndRipple,
      applyPostEffects
    });

    expect(order).toEqual([
      "influenceManager.update",
      "maskState.update",
      "prepareMaskWeightRecompute",
      "writeCellMaskWeights:0",
      "writeCellMaskWeights:1",
      "influenceManager.apply",
      "applyHoverBreathingAndRipple",
      "applyPostEffects"
    ]);
    expect(writeCellMaskWeights).toHaveBeenCalledTimes(buffer.count);
    expect(compactSpy).toHaveBeenCalledTimes(1);

    compactSpy.mockRestore();
  });

  it("skips writeCellMaskWeights entirely when prepareMaskWeightRecompute returns false", () => {
    const buffer = createTestCellBuffer([{ x: 0, y: 0, color: "#fff", gap: 10 }]);
    const runtime = createPixelGridRuntimeState(buffer.count);

    const writeCellMaskWeights = vi.fn();

    runPixelGridUpdatePipeline({
      delta: 16,
      buffer,
      expandEase: 0.1,
      runtime,
      influenceManager: { update: vi.fn(), apply: vi.fn() } as any,
      maskState: { update: vi.fn() } as any,
      getCellIndex: (x: number) => x,
      prepareMaskWeightRecompute: () => false,
      writeCellMaskWeights,
      applyHoverBreathingAndRipple: vi.fn(),
      applyPostEffects: vi.fn()
    });

    expect(writeCellMaskWeights).not.toHaveBeenCalled();
  });

  it("still resets and eases every cell's size toward targetSize regardless of the mask-weight gate", () => {
    const buffer = createTestCellBuffer([{ x: 0, y: 0, color: "#fff", gap: 10, size: 0 }]);

    runPixelGridUpdatePipeline({
      delta: 16,
      buffer,
      expandEase: 0.5,
      runtime: createPixelGridRuntimeState(buffer.count),
      influenceManager: {
        update: vi.fn(),
        apply: vi.fn(() => {
          buffer.targetSize[0] = 10;
        })
      } as any,
      maskState: { update: vi.fn() } as any,
      getCellIndex: (x: number) => x,
      prepareMaskWeightRecompute: () => false,
      writeCellMaskWeights: vi.fn(),
      applyHoverBreathingAndRipple: vi.fn(),
      applyPostEffects: vi.fn()
    });

    expect(buffer.size[0]).toBeCloseTo(5, 10);
  });
});
