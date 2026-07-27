import { describe, expect, it } from "vitest";
import { createPixelPreset, mergePixelOptions } from "./presets";

describe("presets", () => {
  it("never returns a config that shares object/array references with base or override", () => {
    const base = createPixelPreset("card-soft");
    const override = {
      hoverEffects: { radius: 200 },
      textMasks: [{ id: "a", text: "A" }]
    };

    const merged = mergePixelOptions(base, override);

    expect(merged.hoverEffects).not.toBe(base.hoverEffects);
    expect(merged.breathing).not.toBe(base.breathing);
    expect(merged.hoverEffects).not.toBe(override.hoverEffects);
    expect(merged.textMasks).not.toBe(override.textMasks);
    expect(merged.textMasks?.[0]).not.toBe(override.textMasks[0]);
  });

  it("does not mutate the internal preset map across repeated createPixelPreset calls", () => {
    const first = createPixelPreset("hero-image");
    first.hoverEffects!.radius = 999;
    first.colors.push("#000000");

    const second = createPixelPreset("hero-image");

    expect(second.hoverEffects?.radius).toBe(140);
    expect(second.colors).toEqual(["#334155", "#475569", "#64748b"]);
  });

  it("deep-merges performance and effects blocks instead of one replacing the other wholesale", () => {
    // Regression: the previous hand-rolled mergePixelOptions merged hoverEffects/rippleEffects/
    // breathing/etc. field-by-field but left `performance` and `effects` to a shallow
    // `{...base, ...override}` spread, so an override touching effects.dissolve silently
    // wiped out a base preset's effects.paletteCycle instead of merging alongside it.
    const base: Parameters<typeof mergePixelOptions>[0] = {
      colors: ["#111"],
      gap: 6,
      expandEase: 0.08,
      breathSpeed: 1,
      performance: { detail: "low", viewportCulling: true },
      effects: {
        paletteCycle: { enabled: true, speed: 0.3 }
      }
    };

    const merged = mergePixelOptions(base, {
      performance: { cullingPadding: 20 },
      effects: {
        dissolve: { enabled: true, amount: 0.4 }
      }
    });

    expect(merged.performance?.detail).toBe("low");
    expect(merged.performance?.viewportCulling).toBe(true);
    expect(merged.performance?.cullingPadding).toBe(20);
    expect(merged.effects?.paletteCycle?.enabled).toBe(true);
    expect(merged.effects?.paletteCycle?.speed).toBe(0.3);
    expect(merged.effects?.dissolve?.enabled).toBe(true);
    expect(merged.effects?.dissolve?.amount).toBe(0.4);
  });

  it("treats undefined override values as no-op (base value wins)", () => {
    const base = createPixelPreset("card-ripple");
    const merged = mergePixelOptions(base, { gap: undefined, hoverEffects: undefined });

    expect(merged.gap).toBe(base.gap);
    expect(merged.hoverEffects).toEqual(base.hoverEffects);
  });

  it("replaces arrays wholesale rather than concatenating them", () => {
    const base: Parameters<typeof mergePixelOptions>[0] = {
      colors: ["#111", "#222", "#333"],
      gap: 6,
      expandEase: 0.08,
      breathSpeed: 1
    };

    const merged = mergePixelOptions(base, { colors: ["#fff"] });

    expect(merged.colors).toEqual(["#fff"]);
  });
});
