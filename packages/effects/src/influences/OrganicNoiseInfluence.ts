import { Influence, BlendMode } from "./Influence";
import { cellularNoise2D, perlinNoise2D, smoothstep, turbulenceNoise2D } from "../utils/math";

export type OrganicNoisePattern = "waves" | "perlin" | "cells" | "turbulence";

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
    private scale: number = 1
  ) {}

  update(delta: number): void {
    this.time += delta * this.speed;
  }

  isAlive(): boolean {
    return true;
  }

  getBounds() {
    return {
      minX: this.centerX - this.radius,
      maxX: this.centerX + this.radius,
      minY: this.centerY - this.radius,
      maxY: this.centerY + this.radius
    };
  }

  private noise(x: number, y: number): number {
    switch (this.pattern) {
      case "perlin":
        return perlinNoise2D(
          x * PERLIN_BASE_FREQUENCY * this.scale + this.time,
          y * PERLIN_BASE_FREQUENCY * this.scale + this.time * 0.7
        );
      case "cells":
        return cellularNoise2D(
          x * CELLS_BASE_FREQUENCY * this.scale + this.time,
          y * CELLS_BASE_FREQUENCY * this.scale + this.time * 0.7
        );
      case "turbulence":
        return turbulenceNoise2D(
          x * TURBULENCE_BASE_FREQUENCY * this.scale + this.time,
          y * TURBULENCE_BASE_FREQUENCY * this.scale + this.time * 0.7
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
    const dx = x - this.centerX;
    const dy = y - this.centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.radius) return 0;

    const radial =
      1 - smoothstep(0, this.radius, distance);

    const noiseValue = this.noise(x, y);

    return (
      radial *
      noiseValue *
      maxSize *
      this.strength
    );
  }
}
