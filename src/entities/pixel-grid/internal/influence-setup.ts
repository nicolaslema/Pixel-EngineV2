import { EnginePointerSource } from "../../../core/EnginePointerSource";
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

  if (params.options.organic) {
    params.influenceManager.add(
      new OrganicNoiseInfluence(
        params.width * 0.5,
        params.height * 0.5,
        params.config.organicRadius ?? 150,
        params.config.organicStrength ?? 0.4,
        params.config.organicSpeed ?? 0.002
      )
    );
  }
}
