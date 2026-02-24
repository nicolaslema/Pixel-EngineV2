import { PixelCell } from "../../../PixelCell";
import { ResolvedPixelGridEffectsOptions } from "../../types";
import { PaletteCycleEffect } from "./palette-cycle-effect";
import { PixelDissolveEffect } from "./pixel-dissolve-effect";
import { ShockwaveBurstEffect } from "./shockwave-burst-effect";
import { PixelGridPostEffect } from "./types";

export interface PixelGridEffectsPipeline {
  update(delta: number): void;
  apply(cells: PixelCell[]): void;
  dispose(): void;
}

interface CreatePixelGridEffectsPipelineParams {
  cells: PixelCell[];
  pointer: { x: number; y: number; inside: boolean; down: boolean };
  effects: ResolvedPixelGridEffectsOptions;
}

export function createPixelGridEffectsPipeline(
  params: CreatePixelGridEffectsPipelineParams
): PixelGridEffectsPipeline {
  const pipelineEffects: PixelGridPostEffect[] = [];

  if (params.effects.dissolve.enabled) {
    pipelineEffects.push(
      new PixelDissolveEffect(params.effects.dissolve)
    );
  }

  if (params.effects.shockwaveBurst.enabled) {
    pipelineEffects.push(
      new ShockwaveBurstEffect(
        params.effects.shockwaveBurst,
        params.cells,
        params.pointer
      )
    );
  }

  if (params.effects.paletteCycle.enabled) {
    pipelineEffects.push(
      new PaletteCycleEffect(params.effects.paletteCycle, params.cells)
    );
  }

  pipelineEffects.sort((a, b) => a.order - b.order);

  return {
    update(delta: number): void {
      for (let i = 0; i < pipelineEffects.length; i++) {
        pipelineEffects[i].update(delta);
      }
    },

    apply(cells: PixelCell[]): void {
      for (let i = 0; i < pipelineEffects.length; i++) {
        pipelineEffects[i].apply(cells);
      }
    },

    dispose(): void {
      for (let i = 0; i < pipelineEffects.length; i++) {
        pipelineEffects[i].dispose?.();
      }
    }
  };
}
