import { describe, expect, it } from "vitest";
import { PixelCell } from "../../../PixelCell";
import { ResolvedPixelGridEffectsOptions } from "../../types";
import { createPixelGridEffectsPipeline } from "./pipeline";

function createCells(): PixelCell[] {
  return [
    new PixelCell(0, 0, "#111111", 10, 1),
    new PixelCell(10, 0, "#222222", 10, 1)
  ];
}

function createEffects(
  overrides: Partial<ResolvedPixelGridEffectsOptions>
): ResolvedPixelGridEffectsOptions {
  return {
    paletteCycle: {
      enabled: false,
      speed: 0.45,
      scope: "activeOnly",
      activationThreshold: 0.025,
      palette: ["#111111", "#222222"],
      ...overrides.paletteCycle
    },
    dissolve: {
      enabled: false,
      speed: 0.85,
      amount: 0.35,
      scope: "activeOnly",
      activationThreshold: 0.025,
      ...overrides.dissolve
    },
    shockwaveBurst: {
      enabled: false,
      speed: 0.85,
      strength: 0.4,
      thickness: 24,
      maxBursts: 8,
      triggerMode: "pointerDown",
      activationThreshold: 0.025,
      ...overrides.shockwaveBurst
    }
  };
}

describe("createPixelGridEffectsPipeline", () => {
  it("dissolves active pixels when enabled", () => {
    const cells = createCells();
    const pipeline = createPixelGridEffectsPipeline({
      cells,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        dissolve: {
          enabled: true,
          amount: 1,
          speed: 0,
          scope: "activeOnly",
          activationThreshold: 0.025
        }
      })
    });

    cells[0].targetSize = 1;
    cells[0].opacity = 1;

    pipeline.update(16);
    pipeline.apply(cells);

    expect(cells[0].targetSize).toBeCloseTo(0.15);
    expect(cells[0].opacity).toBeCloseTo(0.25);
    pipeline.dispose();
  });

  it("applies shockwave burst boost after pointer down trigger", () => {
    const cells: PixelCell[] = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        cells.push(new PixelCell(x * 10, y * 10, "#111111", 10, 1));
      }
    }
    const pointer = { x: 10, y: 10, inside: true, down: false };

    const pipeline = createPixelGridEffectsPipeline({
      cells,
      pointer,
      effects: createEffects({
        shockwaveBurst: {
          enabled: true,
          speed: 1.1,
          strength: 1,
          thickness: 12,
          maxBursts: 4,
          triggerMode: "pointerDown",
          activationThreshold: 0.01
        }
      })
    });

    for (let i = 0; i < cells.length; i++) {
      cells[i].targetSize = 1;
      cells[i].opacity = 0.2;
    }

    pointer.down = true;
    pipeline.update(16);
    pointer.down = false;
    pipeline.update(48);
    pipeline.apply(cells);

    const boostedCell = cells.find((cell) => cell.targetSize > 1);
    expect(boostedCell).toBeDefined();
    pipeline.dispose();
  });

  it("cycles palette colors for active cells when enabled", () => {
    const cells = createCells();
    const pipeline = createPixelGridEffectsPipeline({
      cells,
      pointer: { x: 0, y: 0, inside: true, down: false },
      effects: createEffects({
        paletteCycle: {
          enabled: true,
          speed: 0.5,
          scope: "activeOnly",
          activationThreshold: 0.1,
          palette: ["#111111", "#222222", "#00ff00"]
        }
      })
    });

    const inactiveBaseColor = cells[1].baseColor;
    cells[0].targetSize = 1;
    cells[1].targetSize = 0;

    pipeline.update(1000);
    pipeline.apply(cells);

    expect(cells[0].color).toBe("#222222");
    expect(cells[1].color).toBe(inactiveBaseColor);
    pipeline.dispose();
  });
});
