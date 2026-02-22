export interface EnginePointerState {
  x: number;
  y: number;
  inside: boolean;
  down: boolean;
}

export interface EnginePointerSource {
  mouse: EnginePointerState;
  setClearColor?(color: string | null): void;
  getClearColor?(): string | null;
  getSize?(): { width: number; height: number };
}
