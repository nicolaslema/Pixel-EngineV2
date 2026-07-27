import { describe, it, expect } from "vitest";
import { Time } from "../core/Time";

describe("Time", () => {
  it("should initialize with zero delta", () => {
    const time = new Time();
    expect(time.delta).toBe(0);
    expect(time.simulationDelta).toBe(0);
    expect(time.renderDelta).toBe(0);
    expect(time.elapsed).toBe(0);
  });

  it("should track fixed simulation delta and elapsed time", () => {
    const time = new Time();

    time.updateSimulation(16);
    time.updateSimulation(16);

    expect(time.delta).toBe(16);
    expect(time.simulationDelta).toBe(16);
    expect(time.elapsed).toBe(32);
  });

  it("should track render delta separately from simulation delta", () => {
    const time = new Time();
    time.updateSimulation(16);
    time.updateRender(20);

    expect(time.simulationDelta).toBe(16);
    expect(time.renderDelta).toBe(20);
    expect(time.unscaledDelta).toBe(20);
    expect(time.elapsed).toBe(16);
  });

  it("keeps timeScale as loop-control signal without mutating simulation step size", () => {
    const time = new Time();
    time.timeScale = 0.5;
    time.updateSimulation(16);

    expect(time.delta).toBe(16);
    expect(time.simulationDelta).toBe(16);
    expect(time.timeScale).toBe(0.5);
  });
});
