import { PixelCellBuffer } from "../cell-buffer";

export interface PixelGridPostEffect {
  readonly id: string;
  readonly order: number;
  update(delta: number): void;
  apply(buffer: PixelCellBuffer): void;
  dispose?(): void;
}
