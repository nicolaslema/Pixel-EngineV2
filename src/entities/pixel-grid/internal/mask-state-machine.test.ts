import { describe, expect, it } from "vitest";
import { createMaskStateMachine } from "./mask-state-machine";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";

class StaticMask extends MaskInfluence {
  constructor() {
    super(0, 0, 1);
    this.width = 1;
    this.height = 1;
    this.buffer = new Float32Array([1]);
  }
  protected onUpdate(): void {}
  protected generateMask(): void {}
}

describe("pixel-grid mask-state-machine", () => {
  it("keeps morph disabled when one mask is missing", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = new StaticMask();

    const machine = createMaskStateMachine({
      influenceManager: manager,
      autoMorph: {
        enabled: true,
        holdImageMs: 10,
        holdTextMs: 10,
        morphDurationMs: 10,
        intervalMs: 0
      },
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            holdMs: 10,
            transition: {
              mode: "morph",
              durationMs: 10,
              seed: 7
            }
          },
          {
            mask: "text",
            holdMs: 10,
            transition: {
              mode: "morph",
              durationMs: 10,
              seed: 8
            }
          }
        ]
      },
      initialMask: "image",
      imageMask: imageMask as never,
      textMask: null
    });

    expect(() => machine.update(100)).not.toThrow();
    expect(machine.morphMask).toBeNull();
  });

  it("runs timeline transitions and playback controls", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = new StaticMask();
    const textMask = new StaticMask();

    const machine = createMaskStateMachine({
      influenceManager: manager,
      autoMorph: {
        enabled: false,
        holdImageMs: 0,
        holdTextMs: 0,
        morphDurationMs: 0,
        intervalMs: 0
      },
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            holdMs: 5,
            transition: {
              mode: "fade",
              durationMs: 8,
              seed: 11
            }
          },
          {
            mask: "text",
            holdMs: 5,
            transition: {
              mode: "dissolve",
              durationMs: 8,
              seed: 22
            }
          }
        ]
      },
      initialMask: "image",
      imageMask: imageMask as never,
      textMask: textMask as never
    });

    expect(machine.isPlaying()).toBe(false);
    expect(machine.getCurrentStepIndex()).toBe(0);

    machine.play();
    expect(machine.isPlaying()).toBe(true);

    machine.update(5);
    expect(machine.morphMask).not.toBeNull();

    manager.update(8);
    machine.update(0);
    expect(machine.morphMask).toBeNull();
    expect(machine.getCurrentStepIndex()).toBe(1);

    machine.pause();
    expect(machine.isPlaying()).toBe(false);

    machine.reset();
    expect(machine.getCurrentStepIndex()).toBe(0);
    expect(machine.isPlaying()).toBe(false);
  });

  it("stays stable in long-running loops without timeline drift", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = new StaticMask();
    const textMask = new StaticMask();

    const machine = createMaskStateMachine({
      influenceManager: manager,
      autoMorph: {
        enabled: false,
        holdImageMs: 0,
        holdTextMs: 0,
        morphDurationMs: 0,
        intervalMs: 0
      },
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            holdMs: 2,
            transition: {
              mode: "morph",
              durationMs: 2,
              seed: 13
            }
          },
          {
            mask: "text",
            holdMs: 3,
            transition: {
              mode: "fade",
              durationMs: 2,
              seed: 27
            }
          }
        ]
      },
      initialMask: "image",
      imageMask: imageMask as never,
      textMask: textMask as never
    });

    const visited = new Set<number>();
    for (let i = 0; i < 300; i++) {
      machine.update(1);
      manager.update(1);
      machine.update(0);
      visited.add(machine.getCurrentStepIndex());
    }

    for (let i = 0; i < 4 && machine.morphMask; i++) {
      manager.update(2);
      machine.update(0);
    }

    expect(visited.has(0)).toBe(true);
    expect(visited.has(1)).toBe(true);
    expect(machine.getCurrentStepIndex()).toBeGreaterThanOrEqual(0);
    expect(machine.getCurrentStepIndex()).toBeLessThanOrEqual(1);
    expect(machine.morphMask).toBeNull();
  });
});
