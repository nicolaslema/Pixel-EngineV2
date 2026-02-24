export class Time {
  simulationDelta = 0;
  renderDelta = 0;
  delta = 0;
  unscaledDelta = 0;
  timeScale = 1;
  elapsed = 0;

  update(deltaMs: number): number {
    return this.updateSimulation(deltaMs);
  }

  updateSimulation(deltaMs: number): number {
    this.simulationDelta = deltaMs;
    this.delta = deltaMs;
    this.elapsed += deltaMs;
    return this.delta;
  }

  updateRender(deltaMs: number): number {
    this.renderDelta = deltaMs;
    this.unscaledDelta = deltaMs;
    return this.renderDelta;
  }

  get deltaSeconds(): number {
    return this.delta / 1000;
  }

  get simulationDeltaSeconds(): number {
    return this.simulationDelta / 1000;
  }

  get renderDeltaSeconds(): number {
    return this.renderDelta / 1000;
  }

  get elapsedSeconds(): number {
    return this.elapsed / 1000;
  }
}
