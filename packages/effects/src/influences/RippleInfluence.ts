import { Influence, BlendMode } from "./Influence";

export class RippleInfluence implements Influence {
  priority = 10;
  blendMode: BlendMode = "max";

  private radius = 0;

  constructor(
    private originX: number,
    private originY: number,
    private speed: number,
    private thickness: number,
    private strength: number,
    private maxRadius: number
  ) {}

  reset(
    originX: number,
    originY: number,
    speed: number,
    thickness: number,
    strength: number,
    maxRadius: number
  ): void {
    this.originX = originX;
    this.originY = originY;
    this.speed = speed;
    this.thickness = thickness;
    this.strength = strength;
    this.maxRadius = maxRadius;
    this.radius = 0;
  }

  update(delta: number): void {
    this.radius += this.speed * delta;
  }

  isAlive(): boolean {
    return this.radius < this.maxRadius;
  }

  getBounds() {
    return {
      minX: this.originX - this.radius - this.thickness,
      maxX: this.originX + this.radius + this.thickness,
      minY: this.originY - this.radius - this.thickness,
      maxY: this.originY + this.radius + this.thickness
    };
  }

  getInfluence(
    x: number,
    y: number,
    maxSize: number
  ): number {
    const falloff = this.getRingFactorAt(x, y);
    if (falloff <= 0) return 0;
    return falloff * maxSize * this.strength;
  }

  /**
   * Per-row narrowing hook (see Influence.getRowRange's contract). getRingFactorAt is
   * nonzero iff max(0, radius-thickness) <= sqrt(dx^2+dy^2) <= radius+thickness, so for a
   * fixed row (fixed dy) this solves to 0, 1, or 2 intervals of dx -- a safe (never
   * narrower) superset of where this row's ring factor is actually nonzero.
   */
  getRowRange(y: number, out: Float64Array): number {
    const dy = y - this.originY;
    const dySq = dy * dy;

    const high = this.radius + this.thickness;
    const hiSq = high * high - dySq;
    if (hiSq < 0) return 0;

    const low = Math.max(0, this.radius - this.thickness);
    const loSqRaw = low * low - dySq;
    const hiDx = Math.sqrt(hiSq);

    if (loSqRaw <= 0) {
      out[0] = this.originX - hiDx;
      out[1] = this.originX + hiDx;
      return 1;
    }

    const loDx = Math.sqrt(loSqRaw);
    out[0] = this.originX - hiDx;
    out[1] = this.originX - loDx;
    out[2] = this.originX + loDx;
    out[3] = this.originX + hiDx;
    return 2;
  }

  getRingFactorAt(x: number, y: number): number {
    const dx = x - this.originX;
    const dy = y - this.originY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    const diff = Math.abs(distance - this.radius);

    if (diff > this.thickness) return 0;

    // Perfil de campana suave
    const normalized = 1 - diff / this.thickness;

    // curva cuadrática suave
    const falloff = normalized * normalized;

    return falloff;
  }

  getOriginX(): number {
    return this.originX;
  }

  getOriginY(): number {
    return this.originY;
  }
}
