import { describe, expect, it, vi } from "vitest";
import { InfluenceManager } from "./InfluenceManager";
import { Influence } from "./Influence";
import { PixelCellBuffer } from "../entities/pixel-grid/internal/cell-buffer";
import { createTestCellBuffer } from "../entities/pixel-grid/internal/test-utils/cell-buffer";

function makeBuffer(count: number): PixelCellBuffer {
  const cells = [];
  for (let i = 0; i < count; i++) {
    cells.push({ x: i * 10, y: 0, color: "#111111", gap: 10 });
  }
  return createTestCellBuffer(cells);
}

function makeInfluence(overrides: Partial<Influence> = {}): Influence {
  return {
    priority: 0,
    blendMode: "max",
    update: () => {},
    isAlive: () => true,
    getBounds: () => ({ minX: 0, maxX: 100, minY: 0, maxY: 100 }),
    getInfluence: () => 0,
    ...overrides
  };
}

describe("InfluenceManager", () => {
  it("skips compressField/smoothField when the influence list is empty (existing early return)", () => {
    const manager = new InfluenceManager(10, 4, 1, { enableSmoothing: true });
    const buffer = makeBuffer(4);

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(buffer, (x) => x);

    expect(compressSpy).not.toHaveBeenCalled();
    expect(smoothSpy).not.toHaveBeenCalled();
  });

  it("skips compressField/smoothField when an influence exists but contributes 0 everywhere (3b.1 gate)", () => {
    const manager = new InfluenceManager(10, 4, 1, { enableSmoothing: false });
    const buffer = makeBuffer(4);
    manager.add(makeInfluence({ getInfluence: () => 0 }));

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(buffer, (x) => x);

    expect(compressSpy).not.toHaveBeenCalled();
    expect(smoothSpy).not.toHaveBeenCalled();
    expect(Array.from(buffer.targetSize).every((v) => v === 0)).toBe(true);
  });

  it("skipping the compress/smooth pass produces identical output to the influences.length===0 early return (3b.1 equivalence)", () => {
    const emptyManager = new InfluenceManager(10, 4, 1, { enableSmoothing: true });
    const emptyBuffer = makeBuffer(4);
    emptyManager.apply(emptyBuffer, (x) => x);

    const zeroContributionManager = new InfluenceManager(10, 4, 1, { enableSmoothing: true });
    const zeroContributionBuffer = makeBuffer(4);
    zeroContributionManager.add(makeInfluence({ getInfluence: () => 0 }));
    zeroContributionManager.apply(zeroContributionBuffer, (x) => x);

    expect(Array.from(zeroContributionBuffer.targetSize)).toEqual(
      Array.from(emptyBuffer.targetSize)
    );
  });

  it("runs compressField when an influence contributes somewhere, matching the soft-saturation formula (enableSmoothing off)", () => {
    const manager = new InfluenceManager(10, 4, 1, {
      enableSmoothing: false,
      compressionStrength: 2.5
    });
    const buffer = makeBuffer(4);
    manager.add(makeInfluence({ getInfluence: (x) => (x === 0 ? 5 : 0) }));

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(buffer, (x) => x);

    expect(compressSpy).toHaveBeenCalledTimes(1);
    expect(smoothSpy).not.toHaveBeenCalled();

    // targetSize is now a Float32Array (SoA), so it loses precision relative to a float64
    // literal computed the same way -- 5 digits is well within float32's ~7-digit precision
    // and still tight enough to catch a real formula regression.
    const expected = 10 * (1 - Math.exp((-2.5 * 5) / 10));
    expect(buffer.targetSize[0]).toBeCloseTo(expected, 5);
    // Cells the influence never touched stay at their post-reset value (0), also passed
    // through compressField's `value <= 0` branch, not skipped per-cell.
    expect(buffer.targetSize[1]).toBe(0);
    expect(buffer.targetSize[2]).toBe(0);
    expect(buffer.targetSize[3]).toBe(0);
  });

  it("also runs smoothField when enableSmoothing is true (the actual production default)", () => {
    const manager = new InfluenceManager(10, 4, 1, {
      enableSmoothing: true,
      compressionStrength: 2.5,
      smoothingRadius: 1
    });
    const buffer = makeBuffer(4);
    manager.add(makeInfluence({ getInfluence: (x) => (x === 0 ? 5 : 0) }));

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(buffer, (x) => x);

    expect(compressSpy).toHaveBeenCalledTimes(1);
    expect(smoothSpy).toHaveBeenCalledTimes(1);
    // Smoothing blends the compressed value at index 0 into its neighbor at index 1, so both
    // should be non-zero afterward even though only index 0 was directly touched.
    expect(buffer.targetSize[0]).toBeGreaterThan(0);
    expect(buffer.targetSize[1]).toBeGreaterThan(0);
  });

  it("runs the normal (non-gated) path unaffected when some cells are touched and some are not", () => {
    const manager = new InfluenceManager(10, 4, 1, { enableSmoothing: false });
    const buffer = makeBuffer(4);
    manager.add(makeInfluence({ getInfluence: (x) => (x === 20 ? 3 : 0) }));

    manager.apply(buffer, (x) => x);

    expect(buffer.targetSize[2]).toBeGreaterThan(0);
    expect(buffer.targetSize[0]).toBe(0);
    expect(buffer.targetSize[1]).toBe(0);
    expect(buffer.targetSize[3]).toBe(0);
  });
});
