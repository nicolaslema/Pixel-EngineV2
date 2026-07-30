import { describe, expect, it } from "vitest";
import { loadPixelConfigFromJson, validatePixelConfigDocument } from "./cms-config";

describe("cms-config", () => {
  it("validates a complete v1 CMS document", () => {
    const result = validatePixelConfigDocument({
      schemaVersion: "1.0",
      preset: "card-ripple",
      gridConfig: {
        gap: 6
      },
      mask: {
        type: "text",
        text: "CMS"
      },
      scrollReactive: {
        enabled: true,
        intensity: 1.2
      },
      themeSync: {
        enabled: true,
        mode: "dark"
      },
      statePreset: "active",
      debugHud: {
        enabled: true
      },
      ssrPlaceholder: "card-soft"
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.value?.preset).toBe("card-ripple");
    expect(result.value?.schemaVersion).toBe("1.0");
  });

  it("returns warnings for unknown keys", () => {
    const result = validatePixelConfigDocument({
      schemaVersion: "1.0",
      preset: "minimal",
      unknownField: 123
    });

    expect(result.ok).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("unknownField"))).toBe(true);
  });

  it("fails with unsupported schema/preset", () => {
    const result = validatePixelConfigDocument({
      schemaVersion: "2.0",
      preset: "legacy"
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("loads from JSON and merges fallback", () => {
    const json = JSON.stringify({
      schemaVersion: "1.0",
      preset: "minimal",
      gridConfig: {
        gap: 9
      }
    });

    const result = loadPixelConfigFromJson(json, {
      preset: "card-soft",
      gridConfig: {
        expandEase: 0.1
      }
    });

    expect(result.ok).toBe(true);
    expect(result.value?.preset).toBe("minimal");
    expect(result.value?.gridConfig?.gap).toBe(9);
    expect(result.value?.gridConfig?.expandEase).toBe(0.1);
  });

  it("deep-merges nested blocks beyond gridConfig when using a fallback (item 5.4)", () => {
    const json = JSON.stringify({
      schemaVersion: "1.0",
      scrollReactive: {
        intensity: 2
      }
    });

    const result = loadPixelConfigFromJson(json, {
      scrollReactive: {
        enabled: true,
        intensity: 1.5,
        direction: "down"
      }
    });

    expect(result.ok).toBe(true);
    expect(result.value?.scrollReactive).toEqual({
      enabled: true,
      intensity: 2,
      direction: "down"
    });
  });

  it("fails on invalid JSON", () => {
    const result = loadPixelConfigFromJson("{ invalid }");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Invalid JSON");
  });
});
