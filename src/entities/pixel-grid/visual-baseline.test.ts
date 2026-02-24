import { describe, expect, it, vi } from "vitest";
import { PixelEngine } from "../../core/PixelEngine";
import { IRenderer } from "../../renderers/IRenderer";
import { PixelGridEffect } from "../PixelGridEffect";
import { PixelCell } from "../PixelCell";

function makeMockRenderer(): IRenderer {
  return {
    clear: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
    getContext: () =>
      ({
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        translate: () => {},
        rotate: () => {},
        fillRect: () => {}
      } as unknown as CanvasRenderingContext2D)
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function captureCellsSnapshot(effect: PixelGridEffect) {
  const cells = (effect as unknown as { cells: PixelCell[] }).cells;
  const sample = cells.slice(0, 28).map((cell) => ({
    s: round(cell.size),
    t: round(cell.targetSize),
    ox: round(cell.offsetX),
    oy: round(cell.offsetY),
    o: round(cell.opacity),
    c: cell.color
  }));

  let active = 0;
  let totalSize = 0;
  let totalOpacity = 0;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.targetSize > 0.01) active++;
    totalSize += cell.size;
    totalOpacity += cell.opacity;
  }

  return {
    active,
    avgSize: round(totalSize / cells.length),
    avgOpacity: round(totalOpacity / cells.length),
    sample
  };
}

describe("PixelGrid visual baseline", () => {
  it("classic hover circle baseline", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(createSeededRandom(1234));
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 360,
      height: 220,
      rendererFactory: () => makeMockRenderer()
    });
    const effect = new PixelGridEffect(
      engine,
      360,
      220,
      {
        colors: ["#0f172a", "#1e293b", "#334155"],
        gap: 10,
        expandEase: 0.12,
        breathSpeed: 0.9,
        hoverEffects: {
          mode: "classic",
          radius: 85,
          strength: 1
        }
      },
      { hover: true, ripple: false, organic: false }
    );

    engine.mouse.x = 180;
    engine.mouse.y = 110;
    engine.mouse.inside = true;
    for (let i = 0; i < 8; i++) {
      effect.update(16);
    }

    expect(captureCellsSnapshot(effect)).toMatchSnapshot();

    engine.destroy();
    random.mockRestore();
  });

  it("reactive hover + ripple baseline", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(createSeededRandom(2222));
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 360,
      height: 220,
      rendererFactory: () => makeMockRenderer()
    });
    const effect = new PixelGridEffect(
      engine,
      360,
      220,
      {
        colors: ["#64748b", "#94a3b8", "#cbd5e1"],
        gap: 10,
        expandEase: 0.1,
        breathSpeed: 1.1,
        hoverEffects: {
          mode: "reactive",
          radius: 100,
          strength: 1,
          displace: 4,
          jitter: 1.2
        },
        rippleEffects: {
          enabled: true,
          speed: 0.55,
          thickness: 42,
          strength: 25,
          maxRipples: 22
        }
      },
      { hover: true, ripple: true, organic: false }
    );

    engine.mouse.x = 170;
    engine.mouse.y = 100;
    engine.mouse.inside = true;
    effect.triggerRipple(190, 110);
    for (let i = 0; i < 10; i++) {
      effect.update(16);
    }

    expect(captureCellsSnapshot(effect)).toMatchSnapshot();

    engine.destroy();
    random.mockRestore();
  });

  it("breathing baseline", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(createSeededRandom(9876));
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({
      canvas,
      width: 360,
      height: 220,
      rendererFactory: () => makeMockRenderer()
    });
    const effect = new PixelGridEffect(
      engine,
      360,
      220,
      {
        colors: ["#111827", "#1f2937", "#374151"],
        gap: 10,
        expandEase: 0.08,
        breathSpeed: 1.3,
        hoverEffects: {
          mode: "classic",
          radius: 110,
          strength: 1
        },
        breathing: {
          enabled: true,
          speed: 1.7,
          radius: 160,
          radiusY: 120,
          shape: "circle",
          strength: 0.55,
          minOpacity: 0.45,
          maxOpacity: 1,
          affectHover: true,
          affectImage: false,
          affectText: false
        }
      },
      { hover: true, ripple: false, organic: false }
    );

    engine.mouse.x = 170;
    engine.mouse.y = 110;
    engine.mouse.inside = true;
    for (let i = 0; i < 16; i++) {
      effect.update(16);
    }

    expect(captureCellsSnapshot(effect)).toMatchSnapshot();

    engine.destroy();
    random.mockRestore();
  });
});
