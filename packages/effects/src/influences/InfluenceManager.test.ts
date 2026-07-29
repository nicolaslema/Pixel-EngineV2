import { describe, expect, it, vi } from "vitest";
import { InfluenceManager } from "./InfluenceManager";
import { Influence } from "./Influence";
import { RippleInfluence } from "./RippleInfluence";
import { PixelCellBuffer } from "../entities/pixel-grid/internal/cell-buffer";
import { createTestCellBuffer } from "../entities/pixel-grid/internal/test-utils/cell-buffer";

function makeBuffer(count: number): PixelCellBuffer {
  const cells = [];
  for (let i = 0; i < count; i++) {
    cells.push({ x: i * 10, y: 0, color: "#111111", gap: 10 });
  }
  return createTestCellBuffer(cells);
}

function makeGrid(columns: number, rows: number, gap: number): PixelCellBuffer {
  const cells = [];
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      cells.push({ x: x * gap, y: y * gap, color: "#111111", gap });
    }
  }
  return createTestCellBuffer(cells);
}

function makeGridIndex(rows: number) {
  return (x: number, y: number) => x * rows + y;
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

  describe("getRowRange fast path", () => {
    it("visits strictly fewer cells than the full-bbox scan and produces identical output", () => {
      const gap = 10;
      const columns = 20;
      const rows = 20;
      const gridIndex = makeGridIndex(rows);

      // A small 3x3-world-unit square near the grid center, inside a much larger bbox --
      // getRowRange narrows every row to that tiny square; without it, the manager would
      // scan the whole bbox.
      const squareMinX = 95, squareMaxX = 105, squareMinY = 95, squareMaxY = 105;
      const getInfluence = (x: number, y: number) =>
        (x >= squareMinX && x <= squareMaxX && y >= squareMinY && y <= squareMaxY) ? 5 : 0;

      let callsWithRowRange = 0;
      const withRowRange = makeInfluence({
        getBounds: () => ({ minX: 0, maxX: 190, minY: 0, maxY: 190 }),
        getInfluence: (x, y) => {
          callsWithRowRange++;
          return getInfluence(x, y) > 0 ? getInfluence(x, y) : 0;
        },
        getRowRange: (y, out) => {
          if (y < squareMinY || y > squareMaxY) return 0;
          out[0] = squareMinX;
          out[1] = squareMaxX;
          return 1;
        }
      });

      let callsWithoutRowRange = 0;
      const withoutRowRange = makeInfluence({
        getBounds: () => ({ minX: 0, maxX: 190, minY: 0, maxY: 190 }),
        getInfluence: (x, y) => {
          callsWithoutRowRange++;
          return getInfluence(x, y) > 0 ? getInfluence(x, y) : 0;
        }
      });

      const bufferA = makeGrid(columns, rows, gap);
      const managerA = new InfluenceManager(gap, columns, rows, { enableSmoothing: false });
      managerA.add(withRowRange);
      managerA.apply(bufferA, gridIndex);

      const bufferB = makeGrid(columns, rows, gap);
      const managerB = new InfluenceManager(gap, columns, rows, { enableSmoothing: false });
      managerB.add(withoutRowRange);
      managerB.apply(bufferB, gridIndex);

      expect(callsWithRowRange).toBeLessThan(callsWithoutRowRange);
      expect(Array.from(bufferA.targetSize)).toEqual(Array.from(bufferB.targetSize));
    });

    it("matches a manually-inlined full-bbox scan for a real RippleInfluence grown near maxRadius", () => {
      const gap = 5;
      const columns = 60;
      const rows = 60;
      const gridIndex = makeGridIndex(rows);
      const originX = 150, originY = 150;

      const ripple = new RippleInfluence(originX, originY, 1, 20, 1, 400);
      ripple.update(180); // radius=180, well past half the ~300-unit grid extent

      // Fast path (production code): manager uses getRowRange automatically.
      const bufferFast = makeGrid(columns, rows, gap);
      const managerFast = new InfluenceManager(gap, columns, rows, { enableSmoothing: false });
      managerFast.add(ripple);
      managerFast.apply(bufferFast, gridIndex);

      // Reference: manually-inlined old-style full bbox double loop, bypassing getRowRange
      // entirely, using the same ripple instance's getInfluence()/getBounds().
      const bufferRef = makeGrid(columns, rows, gap);
      const bounds = ripple.getBounds();
      const minCol = Math.max(0, Math.floor(bounds.minX / gap));
      const maxCol = Math.min(columns - 1, Math.floor(bounds.maxX / gap));
      const minRow = Math.max(0, Math.floor(bounds.minY / gap));
      const maxRow = Math.min(rows - 1, Math.floor(bounds.maxY / gap));
      const maxSize = bufferRef.maxSize;

      for (let x = minCol; x <= maxCol; x++) {
        for (let y = minRow; y <= maxRow; y++) {
          const index = gridIndex(x, y);
          const value = ripple.getInfluence(bufferRef.x[index], bufferRef.y[index], maxSize);
          if (value <= 0) continue;
          bufferRef.targetSize[index] = Math.max(bufferRef.targetSize[index], value);
        }
      }
      // ripple's blendMode is "max"; compressField/smoothField are InfluenceManager-internal
      // post-processing, so compare pre-compression by re-deriving the same compress step
      // the manager applies, using its default compressionStrength (2.2).
      const k = 2.2;
      for (let i = 0; i < bufferRef.count; i++) {
        const v = bufferRef.targetSize[i];
        bufferRef.targetSize[i] = v <= 0 ? 0 : maxSize * (1 - Math.exp((-k * v) / maxSize));
      }

      expect(Array.from(bufferFast.targetSize)).toEqual(Array.from(bufferRef.targetSize));
    });
  });
});
