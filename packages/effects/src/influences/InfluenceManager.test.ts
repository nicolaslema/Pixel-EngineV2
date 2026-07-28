import { describe, expect, it, vi } from "vitest";
import { InfluenceManager, InfluenceCell } from "./InfluenceManager";
import { Influence } from "./Influence";

function makeCells(count: number): InfluenceCell[] {
  const cells: InfluenceCell[] = [];
  for (let i = 0; i < count; i++) {
    cells.push({ x: i * 10, y: 0, maxSize: 10, targetSize: 0 });
  }
  return cells;
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
    const cells = makeCells(4);

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(cells, (x) => x);

    expect(compressSpy).not.toHaveBeenCalled();
    expect(smoothSpy).not.toHaveBeenCalled();
  });

  it("skips compressField/smoothField when an influence exists but contributes 0 everywhere (3b.1 gate)", () => {
    const manager = new InfluenceManager(10, 4, 1, { enableSmoothing: false });
    const cells = makeCells(4);
    manager.add(makeInfluence({ getInfluence: () => 0 }));

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(cells, (x) => x);

    expect(compressSpy).not.toHaveBeenCalled();
    expect(smoothSpy).not.toHaveBeenCalled();
    expect(cells.every((c) => c.targetSize === 0)).toBe(true);
  });

  it("skipping the compress/smooth pass produces identical output to the influences.length===0 early return (3b.1 equivalence)", () => {
    const emptyManager = new InfluenceManager(10, 4, 1, { enableSmoothing: true });
    const emptyCells = makeCells(4);
    emptyManager.apply(emptyCells, (x) => x);

    const zeroContributionManager = new InfluenceManager(10, 4, 1, { enableSmoothing: true });
    const zeroContributionCells = makeCells(4);
    zeroContributionManager.add(makeInfluence({ getInfluence: () => 0 }));
    zeroContributionManager.apply(zeroContributionCells, (x) => x);

    expect(zeroContributionCells.map((c) => c.targetSize)).toEqual(
      emptyCells.map((c) => c.targetSize)
    );
  });

  it("runs compressField when an influence contributes somewhere, matching the soft-saturation formula (enableSmoothing off)", () => {
    const manager = new InfluenceManager(10, 4, 1, {
      enableSmoothing: false,
      compressionStrength: 2.5
    });
    const cells = makeCells(4);
    manager.add(makeInfluence({ getInfluence: (x) => (x === 0 ? 5 : 0) }));

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(cells, (x) => x);

    expect(compressSpy).toHaveBeenCalledTimes(1);
    expect(smoothSpy).not.toHaveBeenCalled();

    const expected = 10 * (1 - Math.exp((-2.5 * 5) / 10));
    expect(cells[0].targetSize).toBeCloseTo(expected, 10);
    // Cells the influence never touched stay at their post-reset value (0), also passed
    // through compressField's `value <= 0` branch, not skipped per-cell.
    expect(cells[1].targetSize).toBe(0);
    expect(cells[2].targetSize).toBe(0);
    expect(cells[3].targetSize).toBe(0);
  });

  it("also runs smoothField when enableSmoothing is true (the actual production default)", () => {
    const manager = new InfluenceManager(10, 4, 1, {
      enableSmoothing: true,
      compressionStrength: 2.5,
      smoothingRadius: 1
    });
    const cells = makeCells(4);
    manager.add(makeInfluence({ getInfluence: (x) => (x === 0 ? 5 : 0) }));

    const compressSpy = vi.spyOn(manager as any, "compressField");
    const smoothSpy = vi.spyOn(manager as any, "smoothField");

    manager.apply(cells, (x) => x);

    expect(compressSpy).toHaveBeenCalledTimes(1);
    expect(smoothSpy).toHaveBeenCalledTimes(1);
    // Smoothing blends the compressed value at index 0 into its neighbor at index 1, so both
    // should be non-zero afterward even though only index 0 was directly touched.
    expect(cells[0].targetSize).toBeGreaterThan(0);
    expect(cells[1].targetSize).toBeGreaterThan(0);
  });

  it("runs the normal (non-gated) path unaffected when some cells are touched and some are not", () => {
    const manager = new InfluenceManager(10, 4, 1, { enableSmoothing: false });
    const cells = makeCells(4);
    manager.add(makeInfluence({ getInfluence: (x) => (x === 20 ? 3 : 0) }));

    manager.apply(cells, (x) => x);

    expect(cells[2].targetSize).toBeGreaterThan(0);
    expect(cells[0].targetSize).toBe(0);
    expect(cells[1].targetSize).toBe(0);
    expect(cells[3].targetSize).toBe(0);
  });
});
