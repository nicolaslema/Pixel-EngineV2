import { type EnginePointerSource } from "@pixel-engine/core";
import { HoverInfluence } from "../../../influences/HoverInfluence";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { OrganicNoiseInfluence } from "../../../influences/OrganicNoiseInfluence";
import { PixelGridConfig, PixelGridInfluenceOptions, ResolvedPixelGridConfig } from "../types";

interface SetupBaseInfluencesParams {
  engine: EnginePointerSource;
  width: number;
  height: number;
  config: PixelGridConfig;
  options: PixelGridInfluenceOptions;
  hoverEffects: ResolvedPixelGridConfig["hoverEffects"];
  organicNoise: ResolvedPixelGridConfig["organicNoise"];
  organicNoiseLayers: ResolvedPixelGridConfig["organicNoiseLayers"];
  influenceManager: InfluenceManager;
}

export function setupBaseInfluences(params: SetupBaseInfluencesParams): void {
  const hoverMode = params.hoverEffects.mode;

  if (params.options.hover && hoverMode === "classic") {
    params.influenceManager.add(
      new HoverInfluence(
        params.engine,
        params.hoverEffects.radius,
        params.config.breathSpeed,
        params.hoverEffects.strength
      )
    );
  }

  if (params.options.organic || params.organicNoise.enabled) {
    params.influenceManager.add(
      new OrganicNoiseInfluence(
        params.width * 0.5,
        params.height * 0.5,
        params.organicNoise.radius,
        params.organicNoise.strength,
        params.organicNoise.speed,
        params.organicNoise.pattern,
        params.organicNoise.scale,
        params.organicNoise.position,
        params.organicNoise.falloff,
        params.organicNoise.seed,
        params.engine
      )
    );
  }

  for (const layer of params.organicNoiseLayers) {
    if (!layer.enabled) continue;
    params.influenceManager.add(
      new OrganicNoiseInfluence(
        params.width * 0.5,
        params.height * 0.5,
        layer.radius,
        layer.strength,
        layer.speed,
        layer.pattern,
        layer.scale,
        layer.position,
        layer.falloff,
        layer.seed,
        params.engine
      )
    );
  }
}
