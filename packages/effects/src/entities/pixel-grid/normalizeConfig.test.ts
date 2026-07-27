import { describe, expect, it } from "vitest";
import { resolvePixelGridConfig } from "./normalizeConfig";

describe("resolvePixelGridConfig", () => {
  it("provides stable defaults", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1
    });

    expect(resolved.hoverEffects.mode).toBe("classic");
    expect(resolved.hoverEffects.radius).toBe(120);
    expect(resolved.rippleEffects.speed).toBe(0.5);
    expect(resolved.rippleEffects.maxRipples).toBe(20);
    expect(resolved.breathing.enabled).toBe(false);
    expect(resolved.maskTimeline.enabled).toBe(false);
    expect(resolved.maskTimeline.steps.length).toBe(0);
    expect(resolved.performance.detail).toBe("medium");
    expect(resolved.performance.viewportCulling).toBe(true);
    expect(resolved.performance.minRenderableSize).toBe(0.75);
    expect(resolved.performance.maxRipplesCap).toBe(48);
    expect(resolved.effects.paletteCycle.enabled).toBe(false);
    expect(resolved.effects.dissolve.enabled).toBe(false);
    expect(resolved.effects.shockwaveBurst.enabled).toBe(false);
    expect(resolved.effects.paletteCycle.palette).toEqual(["#fff"]);
    expect(resolved.initialMask).toBe("image");
    expect(resolved.imageMasks).toHaveLength(0);
    expect(resolved.textMasks).toHaveLength(0);
    expect(resolved.warnings).toHaveLength(0);
  });

  it("maps nested overrides and shared morph interval", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      hoverEffects: {
        mode: "reactive",
        radius: 90,
        magnetic: {
          enabled: true,
          mode: "repel",
          strength: 2,
          radius: 80
        }
      },
      rippleEffects: {
        speed: 2,
        thickness: 12,
        strength: 99,
        maxRipples: 3
      },
      breathing: {
        enabled: true,
        speed: 2.2
      },
      autoMorph: {
        enabled: true,
        intervalMs: 700
      },
      performance: {
        detail: "low",
        cullingPadding: -10,
        minRenderableSize: 0
      },
      initialMask: "text"
    });

    expect(resolved.hoverEffects.mode).toBe("reactive");
    expect(resolved.hoverEffects.radius).toBe(90);
    expect(resolved.hoverEffects.magnetic.enabled).toBe(true);
    expect(resolved.hoverEffects.magnetic.mode).toBe("repel");
    expect(resolved.hoverEffects.magnetic.radius).toBe(80);
    expect(resolved.rippleEffects.thickness).toBe(12);
    expect(resolved.breathing.radius).toBe(90);
    expect(resolved.autoMorph.holdImageMs).toBe(700);
    expect(resolved.autoMorph.holdTextMs).toBe(700);
    expect(resolved.maskTimeline.enabled).toBe(true);
    expect(resolved.maskTimeline.steps.length).toBe(2);
    expect(resolved.maskTimeline.steps[0].mask).toBe("image");
    expect(resolved.maskTimeline.steps[0].maskRef).toBeNull();
    expect(resolved.maskTimeline.steps[0].holdMs).toBe(1400);
    expect(resolved.maskTimeline.steps[0].transition.mode).toBe("morph");
    expect(resolved.performance.detail).toBe("low");
    expect(resolved.performance.cullingPadding).toBe(0);
    expect(resolved.performance.minRenderableSize).toBe(0.1);
    expect(resolved.performance.maxRipplesCap).toBe(24);
    expect(resolved.initialMask).toBe("text");
  });

  it("resolves explicit timeline schema and clamps values", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: false,
        initialStep: 8,
        defaultHoldMs: 120,
        defaultTransition: {
          mode: "fade",
          durationMs: 300,
          seed: 12
        },
        steps: [
          {
            mask: "text"
          },
          {
            mask: "image",
            holdMs: -50,
            transition: {
              mode: "dissolve",
              durationMs: 0
            }
          }
        ]
      }
    });

    expect(resolved.maskTimeline.enabled).toBe(true);
    expect(resolved.maskTimeline.autoplay).toBe(false);
    expect(resolved.maskTimeline.loop).toBe(false);
    expect(resolved.maskTimeline.initialStep).toBe(1);
    expect(resolved.maskTimeline.steps[0].holdMs).toBe(120);
    expect(resolved.maskTimeline.steps[0].transition.mode).toBe("fade");
    expect(resolved.maskTimeline.steps[1].holdMs).toBe(0);
    expect(resolved.maskTimeline.steps[1].transition.mode).toBe("dissolve");
    expect(resolved.maskTimeline.steps[1].transition.durationMs).toBe(1);
    expect(resolved.maskTimeline.steps[1].transition.seed).toBe(109);
  });

  it("normalizes multi-mask arrays and resolves timeline ids with warnings", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      imageMasks: [
        {
          id: "hero",
          src: "/hero.png"
        },
        {
          id: "hero",
          src: "/duplicate.png"
        }
      ],
      imageMask: {
        src: "/legacy.png"
      },
      textMasks: [
        {
          id: "title",
          text: "Title",
          font: "bold 40px Arial"
        },
        {
          id: "   ",
          text: "Ignored",
          font: "bold 40px Arial"
        }
      ],
      textMask: {
        text: "Legacy",
        font: "bold 40px Arial"
      },
      maskTimeline: {
        enabled: true,
        steps: [
          {
            maskId: "hero"
          },
          {
            maskId: "missing",
            mask: "text"
          },
          {
            holdMs: 10
          }
        ]
      }
    });

    expect(resolved.imageMasks).toHaveLength(2);
    expect(resolved.imageMasks[0].id).toBe("hero");
    expect(resolved.imageMasks[1].id).toBe("image-1");
    expect(resolved.textMasks).toHaveLength(2);
    expect(resolved.textMasks[0].id).toBe("title");
    expect(resolved.textMasks[1].id).toBe("text-1");

    expect(resolved.maskTimeline.steps[0].maskRef?.id).toBe("hero");
    expect(resolved.maskTimeline.steps[1].mask).toBe("text");
    expect(resolved.maskTimeline.steps[1].maskRef?.id).toBe("title");
    expect(resolved.maskTimeline.steps[2].maskRef?.id).toBe("hero");

    expect(
      resolved.warnings.some((warning) =>
        warning.includes("duplicate mask id")
      )
    ).toBe(true);
    expect(
      resolved.warnings.some((warning) =>
        warning.includes("unknown asset id")
      )
    ).toBe(true);
    expect(
      resolved.warnings.some((warning) =>
        warning.includes("missing mask reference")
      )
    ).toBe(true);
  });

  it("builds timeline steps from maskTimeline.items automatically", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      maskTimeline: {
        enabled: true,
        items: [
          {
            type: "text",
            id: "headline",
            text: "HELLO",
            fontSize: 96,
            fontWeight: 700,
            fontFamily: "Arial"
          },
          {
            type: "image",
            id: "logo",
            src: "/logo.png",
            scale: 1.8
          },
          {
            type: "text",
            id: "sub",
            text: "WORLD",
            font: "bold 72px Arial"
          }
        ]
      }
    });

    expect(resolved.maskTimeline.steps).toHaveLength(3);
    expect(resolved.maskTimeline.steps[0].maskRef?.id).toBe("headline");
    expect(resolved.maskTimeline.steps[1].maskRef?.id).toBe("logo");
    expect(resolved.maskTimeline.steps[2].maskRef?.id).toBe("sub");
    expect(resolved.textMasks[0].font).toContain("96px");
    expect(resolved.imageMasks[0].scale).toBe(1.8);
  });

  it("supports assetId + mode/duration aliases per timeline step", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      maskTimeline: {
        enabled: true,
        defaultTransition: {
          mode: "morph",
          durationMs: 800,
          seed: 10
        },
        items: [
          { type: "text", id: "t1", text: "A" },
          { type: "image", id: "i1", src: "/a.png" }
        ],
        steps: [
          {
            assetId: "t1",
            holdMs: 120,
            mode: "fade",
            durationMs: 320
          },
          {
            assetId: "i1",
            holdMs: 80,
            transition: {
              mode: "dissolve",
              durationMs: 0
            }
          }
        ]
      }
    });

    expect(resolved.maskTimeline.steps[0].maskRef?.id).toBe("t1");
    expect(resolved.maskTimeline.steps[0].transition.mode).toBe("fade");
    expect(resolved.maskTimeline.steps[0].transition.durationMs).toBe(320);
    expect(resolved.maskTimeline.steps[1].maskRef?.id).toBe("i1");
    expect(resolved.maskTimeline.steps[1].transition.mode).toBe("dissolve");
    expect(resolved.maskTimeline.steps[1].transition.durationMs).toBe(1);
  });

  it("normalizes palette-cycle options and palette fallback", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#0f172a", "#1e293b"],
      gap: 6,
      expandEase: 0.08,
      breathSpeed: 1,
      effects: {
        paletteCycle: {
          enabled: true,
          speed: -3,
          scope: "all",
          activationThreshold: -1,
          palette: [" ", "  "]
        },
        dissolve: {
          enabled: true,
          speed: -1,
          amount: 2,
          scope: "all",
          activationThreshold: -2
        },
        shockwaveBurst: {
          enabled: true,
          speed: -2,
          strength: 5,
          thickness: 400,
          maxBursts: 999,
          triggerMode: "both",
          activationThreshold: -1
        }
      }
    });

    expect(resolved.effects.paletteCycle.enabled).toBe(true);
    expect(resolved.effects.paletteCycle.speed).toBe(0);
    expect(resolved.effects.paletteCycle.scope).toBe("all");
    expect(resolved.effects.paletteCycle.activationThreshold).toBe(0);
    expect(resolved.effects.paletteCycle.palette).toEqual(["#0f172a", "#1e293b"]);
    expect(resolved.effects.dissolve.enabled).toBe(true);
    expect(resolved.effects.dissolve.speed).toBe(0);
    expect(resolved.effects.dissolve.amount).toBe(1);
    expect(resolved.effects.dissolve.scope).toBe("all");
    expect(resolved.effects.dissolve.activationThreshold).toBe(0);
    expect(resolved.effects.shockwaveBurst.enabled).toBe(true);
    expect(resolved.effects.shockwaveBurst.speed).toBe(0);
    expect(resolved.effects.shockwaveBurst.strength).toBe(2);
    expect(resolved.effects.shockwaveBurst.thickness).toBe(160);
    expect(resolved.effects.shockwaveBurst.maxBursts).toBe(64);
    expect(resolved.effects.shockwaveBurst.triggerMode).toBe("both");
    expect(resolved.effects.shockwaveBurst.activationThreshold).toBe(0);
    expect(
      resolved.warnings.some((warning) =>
        warning.includes("effects.paletteCycle.palette")
      )
    ).toBe(true);
  });

  it("silently ignores the removed legacy hoverEffects.radiusY/shape fields (no detection shim anymore)", () => {
    const withLegacy = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      hoverEffects: {
        mode: "reactive",
        radius: 100,
        radiusY: 90,
        shape: "vignette"
      } as any
    });

    expect(withLegacy.warnings.some((warning) => warning.includes("hoverEffects.radiusY"))).toBe(false);
    expect(withLegacy.warnings.some((warning) => warning.includes("hoverEffects.shape"))).toBe(false);
    expect(withLegacy.hoverEffects.radius).toBe(100);
  });

  it("falls back to safe defaults and warns for invalid required scalars (direct/vanilla construction safety net)", () => {
    const resolved = resolvePixelGridConfig({
      colors: [],
      gap: 0,
      expandEase: -1,
      breathSpeed: Number.NaN
    } as any);

    expect(resolved.colors.length).toBeGreaterThan(0);
    expect(resolved.gap).toBeGreaterThan(0);
    expect(resolved.expandEase).toBeGreaterThan(0);
    expect(resolved.breathSpeed).toBeGreaterThan(0);
    expect(resolved.warnings.length).toBeGreaterThanOrEqual(4);
  });

  it("does not warn about required scalars when they are already valid", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#111", "#222"],
      gap: 8,
      expandEase: 0.12,
      breathSpeed: 0.75
    });

    expect(resolved.colors).toEqual(["#111", "#222"]);
    expect(resolved.gap).toBe(8);
    expect(resolved.expandEase).toBe(0.12);
    expect(resolved.breathSpeed).toBe(0.75);
    expect(resolved.warnings).toHaveLength(0);
  });

  it("swaps breathing.minOpacity/maxOpacity when inverted, and leaves valid values untouched", () => {
    const inverted = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      breathing: { minOpacity: 0.95, maxOpacity: 0.2 }
    });
    expect(inverted.breathing.minOpacity).toBe(0.2);
    expect(inverted.breathing.maxOpacity).toBe(0.95);
    expect(
      inverted.warnings.some((warning) => warning.includes("breathing.minOpacity"))
    ).toBe(true);

    const valid = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      breathing: { minOpacity: 0.3, maxOpacity: 0.9 }
    });
    expect(valid.breathing.minOpacity).toBe(0.3);
    expect(valid.breathing.maxOpacity).toBe(0.9);
    expect(valid.warnings).toHaveLength(0);
  });

  it("defaults hoverEffects.magnetic when the block is entirely absent", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      hoverEffects: { radius: 150 }
    });

    expect(resolved.hoverEffects.magnetic.enabled).toBe(false);
    expect(resolved.hoverEffects.magnetic.mode).toBe("attract");
    expect(resolved.hoverEffects.magnetic.strength).toBe(2.5);
    // Falls back to the already-resolved hover radius, not the raw 120 default.
    expect(resolved.hoverEffects.magnetic.radius).toBe(150);
  });

  it("floors (does not fall back) magnetic.strength/radius when given an out-of-range but valid number", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      hoverEffects: {
        magnetic: { enabled: true, strength: -5, radius: 0 }
      }
    });

    expect(resolved.hoverEffects.magnetic.strength).toBe(0);
    expect(resolved.hoverEffects.magnetic.radius).toBe(0.1);
  });

  it("falls back magnetic.radius to the default hover radius when magnetic.radius is missing/invalid", () => {
    const resolved = resolvePixelGridConfig({
      colors: ["#fff"],
      gap: 5,
      expandEase: 0.1,
      breathSpeed: 1,
      hoverEffects: { magnetic: { enabled: true } }
    });

    expect(resolved.hoverEffects.radius).toBe(120);
    expect(resolved.hoverEffects.magnetic.radius).toBe(120);
  });
});
