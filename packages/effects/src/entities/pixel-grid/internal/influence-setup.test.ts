import { describe, expect, it, vi } from "vitest";
import { setupBaseInfluences } from "./influence-setup";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { OrganicNoiseInfluence } from "../../../influences/OrganicNoiseInfluence";
import { HoverInfluence } from "../../../influences/HoverInfluence";
import { DEFAULT_NOISE_SEED } from "../../../utils/math";
import { PixelGridConfig, ResolvedPixelGridConfig } from "../types";

const engine = { mouse: { x: 0, y: 0, inside: false, down: false } };

const baseConfig: PixelGridConfig = {
  colors: ["#fff"],
  gap: 5,
  expandEase: 0.1,
  breathSpeed: 1
};

const hoverEffects: ResolvedPixelGridConfig["hoverEffects"] = {
  mode: "classic",
  radius: 120,
  strength: 1,
  interactionScope: "imageMask",
  deactivate: 0.8,
  displace: 3,
  jitter: 1.25,
  tintPalette: [],
  magnetic: { enabled: false, mode: "attract", strength: 2.5, radius: 120 }
};

const defaultOrganicNoise: ResolvedPixelGridConfig["organicNoise"] = {
  enabled: false,
  radius: 150,
  strength: 0.4,
  speed: 0.002,
  pattern: "waves",
  scale: 1,
  position: "center",
  falloff: "radial",
  seed: DEFAULT_NOISE_SEED
};

function createManagerMock() {
  return {
    add: vi.fn(),
    remove: vi.fn()
  } as unknown as InfluenceManager;
}

describe("setupBaseInfluences (organic noise, item 3.1)", () => {
  it("does not add organic noise when both switches are off", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: defaultOrganicNoise,
      organicNoiseLayers: [],
      influenceManager
    });

    expect(influenceManager.add).not.toHaveBeenCalledWith(expect.any(OrganicNoiseInfluence));
  });

  it("adds organic noise via influenceOptions.organic alone (legacy path)", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: true },
      hoverEffects,
      organicNoise: defaultOrganicNoise,
      organicNoiseLayers: [],
      influenceManager
    });

    expect(influenceManager.add).toHaveBeenCalledWith(expect.any(OrganicNoiseInfluence));
  });

  it("adds organic noise via organicNoise.enabled alone (new path)", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: { ...defaultOrganicNoise, enabled: true },
      organicNoiseLayers: [],
      influenceManager
    });

    expect(influenceManager.add).toHaveBeenCalledWith(expect.any(OrganicNoiseInfluence));
  });

  it("adds organic noise exactly once when both switches are on", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: true },
      hoverEffects,
      organicNoise: { ...defaultOrganicNoise, enabled: true },
      organicNoiseLayers: [],
      influenceManager
    });

    const organicCalls = (influenceManager.add as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([influence]) => influence instanceof OrganicNoiseInfluence
    );
    expect(organicCalls).toHaveLength(1);
  });

  it("constructs OrganicNoiseInfluence from resolvedConfig.organicNoise, not hardcoded defaults", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: { ...defaultOrganicNoise, enabled: true, radius: 42 },
      organicNoiseLayers: [],
      influenceManager
    });

    const [influence] = (influenceManager.add as ReturnType<typeof vi.fn>).mock.calls[0] as [
      OrganicNoiseInfluence
    ];
    const bounds = influence.getBounds();
    // centered at width*0.5=200, height*0.5=150 -- bounds span should reflect radius=42, not
    // the old hardcoded default of 150.
    expect(bounds.maxX - bounds.minX).toBe(84);
    expect(bounds.maxY - bounds.minY).toBe(84);
  });

  it("still constructs HoverInfluence in classic mode independently of organic noise", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: true, ripple: false, organic: false },
      hoverEffects,
      organicNoise: defaultOrganicNoise,
      organicNoiseLayers: [],
      influenceManager
    });

    expect(influenceManager.add).toHaveBeenCalledWith(expect.any(HoverInfluence));
  });
});

describe("setupBaseInfluences (organicNoiseLayers, item 3.5 multi-instance)", () => {
  it("adds one influence per enabled layer, independent of the singular slot's state", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: defaultOrganicNoise,
      organicNoiseLayers: [
        { ...defaultOrganicNoise, enabled: true, radius: 10 },
        { ...defaultOrganicNoise, enabled: true, radius: 20 }
      ],
      influenceManager
    });

    const organicCalls = (influenceManager.add as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([influence]) => influence instanceof OrganicNoiseInfluence
    );
    expect(organicCalls).toHaveLength(2);
  });

  it("skips a layer with enabled:false", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: defaultOrganicNoise,
      organicNoiseLayers: [{ ...defaultOrganicNoise, enabled: false }],
      influenceManager
    });

    expect(influenceManager.add).not.toHaveBeenCalledWith(expect.any(OrganicNoiseInfluence));
  });

  it("combines the singular slot and layers: enabled singular + 2 enabled layers = 3 total", () => {
    const influenceManager = createManagerMock();

    setupBaseInfluences({
      engine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: { ...defaultOrganicNoise, enabled: true },
      organicNoiseLayers: [
        { ...defaultOrganicNoise, enabled: true },
        { ...defaultOrganicNoise, enabled: true }
      ],
      influenceManager
    });

    const organicCalls = (influenceManager.add as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([influence]) => influence instanceof OrganicNoiseInfluence
    );
    expect(organicCalls).toHaveLength(3);
  });

  it("threads params.engine into follow-mouse layers (not silently dropped)", () => {
    const influenceManager = createManagerMock();
    const sharedEngine = { mouse: { x: 111, y: 222, inside: true, down: false } };

    setupBaseInfluences({
      engine: sharedEngine,
      width: 400,
      height: 300,
      config: baseConfig,
      options: { hover: false, ripple: false, organic: false },
      hoverEffects,
      organicNoise: defaultOrganicNoise,
      organicNoiseLayers: [{ ...defaultOrganicNoise, enabled: true, position: "follow-mouse" }],
      influenceManager
    });

    const [influence] = (influenceManager.add as ReturnType<typeof vi.fn>).mock.calls[0] as [
      OrganicNoiseInfluence
    ];
    const boundsBefore = influence.getBounds();
    expect(boundsBefore.minX).toBe(sharedEngine.mouse.x - defaultOrganicNoise.radius);

    sharedEngine.mouse.x = 999;
    const boundsAfter = influence.getBounds();
    expect(boundsAfter.minX).toBe(999 - defaultOrganicNoise.radius);
  });
});
