import { PixelCellBuffer } from "../cell-buffer";
import { ResolvedPixelGridEffectsOptions } from "../../types";
import { PaletteCycleEffect } from "./palette-cycle-effect";
import { PixelDissolveEffect } from "./pixel-dissolve-effect";
import { ShockwaveBurstEffect } from "./shockwave-burst-effect";
import { WaveWobbleEffect } from "./wave-wobble-effect";
import { CursorSpotlightEffect } from "./cursor-spotlight-effect";
import { ChromaticBreathingEffect } from "./chromatic-breathing-effect";
import { ScanLineRevealEffect } from "./scan-line-reveal-effect";
import { MagneticTrailEffect } from "./magnetic-trail-effect";
import { GlitchRgbSplitEffect } from "./glitch-rgb-split-effect";
import { GravityFallApartEffect } from "./gravity-fall-apart-effect";
import { ConstellationConnectEffect } from "./constellation-connect-effect";
import { PixelGridPostEffect } from "./types";

export interface PixelGridEffectsPipeline {
  update(delta: number): void;
  apply(buffer: PixelCellBuffer): void;
  dispose(): void;
}

interface CreatePixelGridEffectsPipelineParams {
  buffer: PixelCellBuffer;
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
        params.buffer,
        params.pointer
      )
    );
  }

  if (params.effects.paletteCycle.enabled) {
    pipelineEffects.push(
      new PaletteCycleEffect(params.effects.paletteCycle, params.buffer)
    );
  }

  if (params.effects.waveWobble.enabled) {
    pipelineEffects.push(new WaveWobbleEffect(params.effects.waveWobble));
  }

  if (params.effects.cursorSpotlight.enabled) {
    pipelineEffects.push(
      new CursorSpotlightEffect(params.effects.cursorSpotlight, params.pointer)
    );
  }

  if (params.effects.chromaticBreathing.enabled) {
    pipelineEffects.push(new ChromaticBreathingEffect(params.effects.chromaticBreathing));
  }

  if (params.effects.scanLineReveal.enabled) {
    pipelineEffects.push(
      new ScanLineRevealEffect(params.effects.scanLineReveal, params.buffer)
    );
  }

  if (params.effects.magneticTrail.enabled) {
    pipelineEffects.push(
      new MagneticTrailEffect(params.effects.magneticTrail, params.pointer)
    );
  }

  if (params.effects.glitchRgbSplit.enabled) {
    pipelineEffects.push(
      new GlitchRgbSplitEffect(params.effects.glitchRgbSplit, params.pointer)
    );
  }

  if (params.effects.gravityFallApart.enabled) {
    pipelineEffects.push(
      new GravityFallApartEffect(params.effects.gravityFallApart, params.buffer)
    );
  }

  if (params.effects.constellationConnect.enabled) {
    pipelineEffects.push(
      new ConstellationConnectEffect(params.effects.constellationConnect, params.pointer)
    );
  }

  pipelineEffects.sort((a, b) => a.order - b.order);

  return {
    update(delta: number): void {
      for (let i = 0; i < pipelineEffects.length; i++) {
        pipelineEffects[i].update(delta);
      }
    },

    apply(buffer: PixelCellBuffer): void {
      for (let i = 0; i < pipelineEffects.length; i++) {
        pipelineEffects[i].apply(buffer);
      }
    },

    dispose(): void {
      for (let i = 0; i < pipelineEffects.length; i++) {
        pipelineEffects[i].dispose?.();
      }
    }
  };
}
