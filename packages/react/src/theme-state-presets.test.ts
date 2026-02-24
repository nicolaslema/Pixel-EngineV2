import { describe, expect, it } from "vitest";
import {
  mergeGridConfigPartials,
  resolveStatePresetGridOverride,
  resolveThemeSyncGridOverride
} from "./theme-state-presets";

describe("theme-state-presets", () => {
  it("resolves light theme override", () => {
    const override = resolveThemeSyncGridOverride(
      { enabled: true, mode: "light", followSystem: false },
      "light"
    );
    expect(override?.canvasBackground).toBe("#f8fafc");
    expect(override?.colors?.length).toBeGreaterThan(0);
  });

  it("resolves brand theme with custom brand colors", () => {
    const override = resolveThemeSyncGridOverride(
      {
        enabled: true,
        mode: "brand",
        brandColors: ["#111111", "#222222", "#333333"],
        brandCanvasBackground: "#010203"
      },
      "brand"
    );
    expect(override?.colors).toEqual(["#111111", "#222222", "#333333"]);
    expect(override?.canvasBackground).toBe("#010203");
  });

  it("resolves active state preset override", () => {
    const override = resolveStatePresetGridOverride("active");
    expect(override?.rippleEffects?.enabled).toBe(true);
    expect(override?.effects?.shockwaveBurst?.enabled).toBe(true);
  });

  it("deep-merges partial configs", () => {
    const merged = mergeGridConfigPartials(
      {
        hoverEffects: {
          radius: 120,
          magnetic: { enabled: true, mode: "attract", strength: 2.2, radius: 120 }
        }
      },
      {
        hoverEffects: {
          strength: 0.9,
          magnetic: { strength: 3.3 }
        }
      }
    );
    expect(merged.hoverEffects?.radius).toBe(120);
    expect(merged.hoverEffects?.strength).toBe(0.9);
    expect(merged.hoverEffects?.magnetic?.enabled).toBe(true);
    expect(merged.hoverEffects?.magnetic?.strength).toBe(3.3);
  });
});
