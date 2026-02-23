import { describe, expect, it, vi } from "vitest";
import { createMaskConfig, resolveGridConfigInput } from "./grid-config";
import {
  createPixelPreset,
  getPixelPresetDefinition,
  listPixelPresets,
  mergePixelOptions
} from "./presets";

describe("grid config helpers", () => {
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

  it("warns for hero-image preset without image mask and clamps invalid nested values", () => {
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

    expect(resolved.hoverEffects?.radius).toBeGreaterThan(0);
    expect(resolved.hoverEffects?.deactivate).toBeLessThanOrEqual(1);
    expect(resolved.rippleEffects?.maxRipples).toBeGreaterThanOrEqual(1);
    expect(resolved.rippleEffects?.thickness).toBeGreaterThan(0);
    expect((resolved.breathing?.minOpacity ?? 0) <= (resolved.breathing?.maxOpacity ?? 1)).toBe(
      true
    );
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
});
