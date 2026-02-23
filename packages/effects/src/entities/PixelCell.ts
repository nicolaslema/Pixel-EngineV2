export class PixelCell {
  public size = 0;
  public previousSize = 0;
  public targetSize = 0;
  public offsetX = 0;
  public previousOffsetX = 0;
  public offsetY = 0;
  public previousOffsetY = 0;
  public opacity = 1;
  public previousOpacity = 1;

  public readonly maxSize: number;
  public readonly baseColor: string;
  public color: string;

  private breathPhase: number;
  private breathOffset: number;

  constructor(
    public readonly x: number,
    public readonly y: number,
    color: string,
    public readonly gap: number,
    maxSizeFactor: number
  ) {
    this.maxSize = gap * maxSizeFactor;
    this.baseColor = color;
    this.color = color;

    this.breathPhase = Math.random() * Math.PI * 2;
    this.breathOffset = Math.random() * 0.5 + 0.5;
  }

  public getBreathFactor(
    time: number,
    breathSpeed: number
  ): number {
    // breathSpeed controla frecuencia real
    const t = time * 0.001 * breathSpeed;

    return (
      (Math.sin(t + this.breathPhase) * 0.5 + 0.5) *
      this.breathOffset
    );
  }

  public update(
    expandEase: number
  ): void {
    this.size +=
      (this.targetSize - this.size) * expandEase;
  }

  public snapshotPreviousState(): void {
    this.previousSize = this.size;
    this.previousOffsetX = this.offsetX;
    this.previousOffsetY = this.offsetY;
    this.previousOpacity = this.opacity;
  }

  public getInterpolatedSize(alpha: number): number {
    return this.previousSize + (this.size - this.previousSize) * alpha;
  }

  public getInterpolatedOffsetX(alpha: number): number {
    return this.previousOffsetX + (this.offsetX - this.previousOffsetX) * alpha;
  }

  public getInterpolatedOffsetY(alpha: number): number {
    return this.previousOffsetY + (this.offsetY - this.previousOffsetY) * alpha;
  }

  public getInterpolatedOpacity(alpha: number): number {
    return this.previousOpacity + (this.opacity - this.previousOpacity) * alpha;
  }

  public resetVisualState(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.color = this.baseColor;
    this.opacity = 1;
  }
}
