import { type EnginePointerSource } from "@pixel-engine/core";
import { Influence, BlendMode } from "./Influence";
import {
  cellularNoise2D,
  DEFAULT_NOISE_SEED,
  perlinNoise2D,
  smoothstep,
  turbulenceNoise2D,
  TURBULENCE_OCTAVES
} from "../utils/math";

export type OrganicNoisePattern = "waves" | "perlin" | "cells" | "turbulence";
export type OrganicNoisePosition = "center" | "follow-mouse";
export type OrganicNoiseFalloff = "radial" | "none";

// Base spatial frequencies at scale=1, chosen so every pattern reads as comparably grained
// at the default radius=150 (waves' own 0.03/0.04/0.02 -- unchanged, backward-compat
// requirement -- already sit in this same order of magnitude).
const PERLIN_BASE_FREQUENCY = 0.015;
const CELLS_BASE_FREQUENCY = 0.02;
const TURBULENCE_BASE_FREQUENCY = 0.015;

export class OrganicNoiseInfluence implements Influence {
  priority = 1;
  blendMode: BlendMode = "add";

  private time = 0;

  constructor(
    private centerX: number,
    private centerY: number,
    private radius: number,
    private strength: number,
    private speed: number,
    private pattern: OrganicNoisePattern = "waves",
    private scale: number = 1,
    private position: OrganicNoisePosition = "center",
    private falloff: OrganicNoiseFalloff = "radial",
    private seed: number = DEFAULT_NOISE_SEED,
    private engine?: EnginePointerSource
  ) {}

  update(delta: number): void {
    this.time += delta * this.speed;
  }

  isAlive(): boolean {
    return true;
  }

  // "follow-mouse" reads engine.mouse fresh every call (no caching), same contract as
  // HoverInfluence -- silently falls back to the fixed center if no engine was passed (a
  // real, reachable case for a consumer constructing this class directly).
  private getCenter(): [number, number] {
    if (this.position === "follow-mouse" && this.engine) {
      return [this.engine.mouse.x, this.engine.mouse.y];
    }
    return [this.centerX, this.centerY];
  }

  getBounds() {
    if (this.falloff === "none") {
      return { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
    }
    const [cx, cy] = this.getCenter();
    return {
      minX: cx - this.radius,
      maxX: cx + this.radius,
      minY: cy - this.radius,
      maxY: cy + this.radius
    };
  }

  private noise(x: number, y: number): number {
    switch (this.pattern) {
      case "perlin":
        return perlinNoise2D(
          x * PERLIN_BASE_FREQUENCY * this.scale + this.time,
          y * PERLIN_BASE_FREQUENCY * this.scale + this.time * 0.7,
          this.seed
        );
      case "cells":
        return cellularNoise2D(
          x * CELLS_BASE_FREQUENCY * this.scale + this.time,
          y * CELLS_BASE_FREQUENCY * this.scale + this.time * 0.7,
          this.seed
        );
      case "turbulence":
        return turbulenceNoise2D(
          x * TURBULENCE_BASE_FREQUENCY * this.scale + this.time,
          y * TURBULENCE_BASE_FREQUENCY * this.scale + this.time * 0.7,
          TURBULENCE_OCTAVES,
          this.seed
        );
      case "waves":
      default: {
        const n =
          Math.sin(x * 0.03 * this.scale + this.time) *
          Math.cos(y * 0.04 * this.scale - this.time * 0.7) +
          Math.sin((x + y) * 0.02 * this.scale + this.time * 0.5);

        return 0.5 + 0.5 * (n / 2);
      }
    }
  }

  getInfluence(
    x: number,
    y: number,
    maxSize: number
  ): number {
    const noiseValue = this.noise(x, y);

    // falloff="none" is unconditional full-canvas coverage -- position becomes moot here
    // (there's no radial boundary to recenter on), which is intentional, not a bug.
    if (this.falloff === "none") {
      return noiseValue * maxSize * this.strength;
    }

    const [cx, cy] = this.getCenter();
    const dx = x - cx;
    const dy = y - cy;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.radius) return 0;

    const radial =
      1 - smoothstep(0, this.radius, distance);

    return (
      radial *
      noiseValue *
      maxSize *
      this.strength
    );
  }
}
