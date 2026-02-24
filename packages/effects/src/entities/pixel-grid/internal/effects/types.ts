import { PixelCell } from "../../../PixelCell";

export interface PixelGridPostEffect {
  readonly id: string;
  readonly order: number;
  update(delta: number): void;
  apply(cells: PixelCell[]): void;
  dispose?(): void;
}

