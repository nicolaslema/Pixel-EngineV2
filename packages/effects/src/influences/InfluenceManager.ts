import { Influence } from "./Influence";
import { PixelCellBuffer } from "../entities/pixel-grid/internal/cell-buffer";

interface InfluenceManagerOptions {
  compressionStrength?: number;
  enableSmoothing?: boolean;
  smoothingRadius?: number;
}

export class InfluenceManager {

  private influences: Influence[] = [];
  private dirty = false;

  private compressionStrength: number;
  private enableSmoothing: boolean;
  private smoothingRadius: number;
  private smoothingBuffer = new Float32Array(0);

  constructor(
    private gap: number,
    private columns: number,
    private rows: number,
    options: InfluenceManagerOptions = {}
  ) {
    this.compressionStrength = options.compressionStrength ?? 2.2;
    this.enableSmoothing = options.enableSmoothing ?? false;
    this.smoothingRadius = options.smoothingRadius ?? 1;
  }

  // ----------------------------------------
  // GESTIÓN
  // ----------------------------------------

  add(influence: Influence): void {
    if (!this.influences.includes(influence)) {
      this.influences.push(influence);
      this.dirty = true;
    }
  }

  remove(influence: Influence): void {
    const index = this.influences.indexOf(influence);
    if (index === -1) return;
    this.influences.splice(index, 1);
    this.dirty = true;
  }

  clear(): void {
    this.influences = [];
    this.dirty = true;
  }

  removeDead(): void {
    let write = 0;
    const before = this.influences.length;

    for (let read = 0; read < before; read++) {
      const influence = this.influences[read];
      if (influence.isAlive()) {
        this.influences[write++] = influence;
      }
    }

    if (write !== before) {
      this.influences.length = write;
      this.dirty = true;
    }
  }

  update(delta: number): void {
    for (let i = 0; i < this.influences.length; i++) {
      this.influences[i].update(delta);
    }

    this.removeDead();
  }

  // ----------------------------------------
  // APPLY
  // ----------------------------------------

  apply(
    buffer: PixelCellBuffer,
    getCellIndex: (x: number, y: number) => number
  ): void {

    if (this.influences.length === 0) return;

    if (this.dirty) {
      this.influences.sort((a, b) => b.priority - a.priority);
      this.dirty = false;
    }

    const maxSize = buffer.maxSize;
    let touchedAny = false;

    for (let i = 0; i < this.influences.length; i++) {

      const influence = this.influences[i];
      const bounds = influence.getBounds();

      const minCol = Math.max(0, Math.floor(bounds.minX / this.gap));
      const maxCol = Math.min(this.columns - 1, Math.floor(bounds.maxX / this.gap));

      const minRow = Math.max(0, Math.floor(bounds.minY / this.gap));
      const maxRow = Math.min(this.rows - 1, Math.floor(bounds.maxY / this.gap));

      for (let x = minCol; x <= maxCol; x++) {
        for (let y = minRow; y <= maxRow; y++) {

          const index = getCellIndex(x, y);

          const value = influence.getInfluence(
            buffer.x[index],
            buffer.y[index],
            maxSize
          );

          if (value <= 0) continue;
          touchedAny = true;

          switch (influence.blendMode) {

            case "max":
              buffer.targetSize[index] = Math.max(buffer.targetSize[index], value);
              break;

            case "add":
              buffer.targetSize[index] += value;
              break;

            case "multiply":
              buffer.targetSize[index] = buffer.targetSize[index] === 0
                ? value
                : buffer.targetSize[index] * value;
              break;

            case "override":
              buffer.targetSize[index] = value;
              break;
          }
        }
      }
    }

    // If no influence actually wrote into any cell this frame, every cell's targetSize is
    // still exactly 0 (apply() is always called on a freshly reset frame -- see
    // update-pipeline.ts). compressField(0) === 0 and smoothField of an all-zero field is a
    // no-op, so skipping both here is behavior-identical, not an approximation -- it just
    // avoids two full-grid passes (smoothField especially, the more expensive of the two)
    // on frames where nothing is actually influencing the grid.
    if (touchedAny) {
      this.compressField(buffer);

      if (this.enableSmoothing) {
        this.smoothField(buffer, getCellIndex);
      }
    }
  }

  // ----------------------------------------
  // COMPRESIÓN
  // ----------------------------------------

  private compressField(buffer: PixelCellBuffer): void {

    const k = this.compressionStrength;
    const max = buffer.maxSize;

    for (let i = 0; i < buffer.count; i++) {

      const value = buffer.targetSize[i];

      if (value <= 0) {
        buffer.targetSize[i] = 0;
        continue;
      }

      buffer.targetSize[i] =
        max * (1 - Math.exp(-k * value / max));
    }
  }

  // ----------------------------------------
  // SMOOTH
  // ----------------------------------------

  private smoothField(
    buffer: PixelCellBuffer,
    getCellIndex: (x: number, y: number) => number
  ): void {
    if (this.smoothingBuffer.length !== buffer.count) {
      this.smoothingBuffer = new Float32Array(buffer.count);
    }
    const temp = this.smoothingBuffer;

    for (let x = 0; x < this.columns; x++) {
      for (let y = 0; y < this.rows; y++) {

        const index = getCellIndex(x, y);

        let sum = 0;
        let count = 0;

        for (let dx = -this.smoothingRadius; dx <= this.smoothingRadius; dx++) {
          for (let dy = -this.smoothingRadius; dy <= this.smoothingRadius; dy++) {

            const nx = x + dx;
            const ny = y + dy;

            if (
              nx >= 0 && nx < this.columns &&
              ny >= 0 && ny < this.rows
            ) {
              const nIndex = getCellIndex(nx, ny);
              sum += buffer.targetSize[nIndex];
              count++;
            }
          }
        }

        temp[index] = sum / count;
      }
    }

    for (let i = 0; i < buffer.count; i++) {
      buffer.targetSize[i] = temp[i];
    }
  }
}
