import { afterEach, describe, expect, it, vi } from "vitest";
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "@pixel-engine/effects";
import { createMaskConfig, resolveGridConfigInput } from "./grid-config";
import {
  createPixelPreset,
  getPixelPresetDefinition,
  listPixelPresets,
  mergePixelOptions
} from "./presets";

describe("grid config helpers", () => {
  // Safety net: if an assertion throws before a test's own warnSpy.mockRestore(), a
  // dangling console.warn mock would otherwise leak into later tests.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates presets and merges nested config fields", () => {
    const preset = createPixelPreset("card-ripple");
    const merged = mergePixelOptions(preset, {
      rippleEffects: { maxRipples: 99 },
      hoverEffects: { radius: 140 }
    });

    expect(merged.rippleEffects?.maxRipples).toBe(99);
    expect(merged.hoverEffects?.radius).toBe(140);
    expect(merged.gap).toBeGreaterThan(0);
  });

  it("maps hybrid declarative mask into image/text/automorph/timeline config", () => {
    const mask = createMaskConfig({
      type: "hybrid",
      initialMask: "text",
      autoMorph: { enabled: true, intervalMs: 800 },
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        initialStep: 1,
        steps: [
          {
            mask: "text",
            holdMs: 500,
            transition: { mode: "fade", durationMs: 250, seed: 1 }
          },
          {
            mask: "image",
            holdMs: 700,
            transition: { mode: "dissolve", durationMs: 350, seed: 2 }
          }
        ]
      },
      text: { text: "PIXEL", centerX: 320, centerY: 210 },
      image: { src: "/cat.png", centerX: 300, centerY: 200, scale: 2 }
    });

    expect(mask.initialMask).toBe("text");
    expect(mask.autoMorph?.enabled).toBe(true);
    expect(mask.maskTimeline?.enabled).toBe(true);
    expect(mask.maskTimeline?.steps?.[0]?.holdMs).toBe(500);
    expect(mask.maskTimeline?.steps?.[1]?.transition?.durationMs).toBe(350);
    expect(mask.textMask?.text).toBe("PIXEL");
    expect(mask.imageMask?.src).toBe("/cat.png");
  });

  it("auto-derives a working multi-step timeline from hybrid texts[] without explicit ids/items/steps (regression)", () => {
    // Bug being guarded against: the hybrid branch used to auto-derive a default timeline
    // by re-declaring each already-declared textMask/imageMask into maskTimeline.items
    // (full mask redefinition, same id). Since normalizeMaskCollections (in
    // @pixel-engine/effects) treats textMasks/imageMasks and maskTimeline.items as
    // independent declaration sources, the same id showed up twice, the second
    // registration was dropped as a duplicate, and the whole auto-derived timeline
    // silently ended up disabled (0 usable steps) instead of cycling through both masks.
    const mask = createMaskConfig({
      type: "hybrid",
      texts: [{ text: "A" }, { text: "B" }]
    });

    // The fix: auto-derivation now builds maskTimeline.steps (id references) instead of
    // maskTimeline.items (id redeclarations), so each mask is only ever declared once.
    expect(mask.maskTimeline?.items ?? []).toHaveLength(0);
    expect(mask.textMasks).toHaveLength(2);
    const [idA, idB] = mask.textMasks!.map((m) => m.id);
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
    expect(mask.maskTimeline?.steps).toEqual([
      { mask: "text", assetId: idA },
      { mask: "text", assetId: idB }
    ]);

    // End-to-end: the runtime timeline is actually enabled with both steps reachable, not
    // silently collapsed to a single/disabled step due to a dropped duplicate-id mask.
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        setTransform: () => {},
        scale: () => {},
        fillRect: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        clearRect: () => {},
        drawImage: () => {},
        fillText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        measureText: () => ({
          width: 64,
          actualBoundingBoxAscent: 24,
          actualBoundingBoxDescent: 8
        })
      } as unknown as CanvasRenderingContext2D);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const canvas = document.createElement("canvas");
    const engine = new PixelEngine({ canvas, width: 200, height: 120 });
    const resolved = resolveGridConfigInput({
      preset: "minimal",
      mask: { type: "hybrid", texts: [{ text: "A" }, { text: "B" }] }
    });
    expect(resolved.maskTimeline?.steps).toHaveLength(2);

    const effect = new PixelGridEffect(engine, 200, 120, resolved);
    effect.playMaskTimeline();
    expect(effect.getMaskTimelineState().playing).toBe(true);
    expect(effect.getMaskTimelineState().stepIndex).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    engine.destroy();
    getContextSpy.mockRestore();
  });

  it("supports hybrid multi-item timeline using items + assetId steps", () => {
    const mask = createMaskConfig({
      type: "hybrid",
      items: [
        {
          type: "text",
          id: "headline",
          text: "HELLO",
          fontSize: 96,
          fontFamily: "Arial",
          fontWeight: 700
        },
        {
          type: "image",
          id: "logo",
          src: "/logo.png",
          scale: 1.6
        }
      ],
      steps: [
        {
          assetId: "headline",
          holdMs: 260,
          mode: "fade",
          durationMs: 130
        },
        {
          assetId: "logo",
          holdMs: 320,
          transition: {
            mode: "dissolve",
            durationMs: 180,
            seed: 5
          }
        }
      ]
    });

    expect(mask.maskTimeline?.items?.length).toBe(2);
    expect(mask.maskTimeline?.steps?.[0]?.assetId).toBe("headline");
    expect(mask.maskTimeline?.steps?.[0]?.mode).toBe("fade");
    expect(mask.maskTimeline?.steps?.[0]?.durationMs).toBe(130);
    expect(mask.maskTimeline?.steps?.[1]?.assetId).toBe("logo");
  });

  it("warns for duplicate ids and invalid timeline refs in hybrid mask config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    resolveGridConfigInput({
      preset: "minimal",
      mask: {
        type: "hybrid",
        texts: [
          { id: "shared", text: "A" },
          { id: "shared", text: "B" }
        ],
        images: [{ id: "shared", src: "/img.png" }],
        steps: [
          { assetId: "missing-id", mask: "image", holdMs: 100, durationMs: 80, mode: "fade" },
          { assetId: "shared", mask: "image", holdMs: 100, durationMs: 80, mode: "fade" },
          { assetId: "shared", maskId: "another", holdMs: 100, durationMs: 80, mode: "fade" },
          { maskId: "   ", holdMs: 100, durationMs: 80, mode: "fade" }
        ]
      }
    });

    const messages = warnSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(messages).toContain("duplicate id");
    expect(messages).toContain("unknown asset id");
    expect(messages).toContain("assetId and maskId");
    expect(messages).toContain("maskId is empty");
    warnSpy.mockRestore();
  });

  it("falls back to safe defaults and warns in dev when required values are invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolved = resolveGridConfigInput({
      preset: "minimal",
      gridConfig: {
        colors: [],
        gap: 0,
        expandEase: 0,
        breathSpeed: 0
      }
    });

    expect(resolved.colors.length).toBeGreaterThan(0);
    expect(resolved.gap).toBeGreaterThan(0);
    expect(resolved.expandEase).toBeGreaterThan(0);
    expect(resolved.breathSpeed).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("exposes preset catalog metadata", () => {
    const list = listPixelPresets();
    expect(list.length).toBeGreaterThanOrEqual(4);

    const hero = getPixelPresetDefinition("hero-image");
    expect(hero.maskSupport).toBe("recommended");
    expect(hero.description.length).toBeGreaterThan(10);
  });

  it("warns for hero-image preset without image mask (resolveGridConfigInput no longer clamps hover/ripple/breathing itself)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolved = resolveGridConfigInput({
      preset: "hero-image",
      gridConfig: {
        hoverEffects: {
          radius: -10,
          deactivate: 2
        },
        rippleEffects: {
          maxRipples: 0,
          thickness: -8
        },
        breathing: {
          minOpacity: 0.95,
          maxOpacity: 0.2
        }
      }
    });

    // resolveGridConfigInput's job is merging preset/gridConfig/mask and guarding the
    // *required* scalars (colors/gap/expandEase/breathSpeed) -- it intentionally passes
    // hoverEffects/rippleEffects/breathing through unresolved. Defaults/clamping for those
    // is @pixel-engine/effects' resolvePixelGridConfig's job (single authority) -- see
    // packages/effects/src/entities/pixel-grid/normalizeConfig.test.ts for clamp coverage
    // (resolvePixelGridConfig is an internal resolver, not part of the public package API,
    // so it can't be exercised from here across the package boundary).
    expect(resolved.hoverEffects?.radius).toBe(-10);
    expect(resolved.rippleEffects?.maxRipples).toBe(0);
    expect(resolved.breathing?.minOpacity).toBe(0.95);

    // Still warns here because no image mask was provided for the hero-image preset.
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not warn for hero-image preset when image mask is provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    resolveGridConfigInput({
      preset: "hero-image",
      mask: {
        type: "image",
        src: "/cat.png",
        centerX: 300,
        centerY: 220,
        scale: 2
      }
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not warn for hero-image preset when image is provided through hybrid items", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    resolveGridConfigInput({
      preset: "hero-image",
      mask: {
        type: "hybrid",
        items: [
          {
            type: "image",
            id: "hero",
            src: "/hero.png",
            scale: 1.8
          },
          {
            type: "text",
            id: "title",
            text: "HERO"
          }
        ]
      }
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("resolves preset < gridConfig < mask precedence for overlapping fields", () => {
    const resolved = resolveGridConfigInput({
      preset: "card-ripple", // hoverEffects.radius: 115
      gridConfig: { hoverEffects: { radius: 200 } }, // beats preset
      mask: {
        type: "text",
        text: "X",
        // hybrid/text mask input doesn't set hoverEffects itself, so gridConfig's 200 should
        // still win over the preset here -- this asserts merge order, not mask override power.
        centerX: 10,
        centerY: 10
      }
    });

    expect(resolved.hoverEffects?.radius).toBe(200);
    // gridConfig-provided fields not touched by mask stay intact after the mask merge pass.
    expect(resolved.rippleEffects?.enabled).toBe(true); // from the card-ripple preset
    expect(resolved.textMask?.text).toBe("X"); // mask prop still applied
  });

  it("produces structurally stable, JSON-serializable output for equivalent input (usePixelGridEffect diffs via JSON.stringify)", () => {
    const params = {
      preset: "hero-image" as const,
      gridConfig: { hoverEffects: { radius: 130 }, rippleEffects: { maxRipples: 12 } },
      mask: { type: "text" as const, text: "STABLE", centerX: 50, centerY: 50 }
    };

    const first = resolveGridConfigInput(params);
    const second = resolveGridConfigInput(params);

    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("passes singular and plural mask props through independently when both are set on gridConfig (ordering/dedup is @pixel-engine/effects' job)", () => {
    const resolved = resolveGridConfigInput({
      preset: "minimal",
      gridConfig: {
        textMasks: [{ id: "first", text: "First" }],
        textMask: { id: "second", text: "Second" }
      }
    });

    expect(resolved.textMasks).toHaveLength(1);
    expect(resolved.textMasks?.[0]?.id).toBe("first");
    expect(resolved.textMask?.id).toBe("second");
  });
});
