import { describe, expect, it } from "vitest";
import { createMaskStateMachine } from "./mask-state-machine";
import { InfluenceManager } from "../../../influences/InfluenceManager";
import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import {
  getTimelineTransitionArrayPoolStats,
  resetTimelineTransitionArrayPoolForTests
} from "./timeline-transition-mask";

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

class RevealableMask extends StaticMask {
  resetRevealCallCount = 0;
  resetReveal(): void {
    this.resetRevealCallCount++;
  }
}

function imageEntry(id: string) {
  return {
    id,
    type: "image" as const,
    influence: new StaticMask()
  };
}

function textEntry(id: string) {
  return {
    id,
    type: "text" as const,
    influence: new StaticMask()
  };
}

describe("pixel-grid mask-state-machine", () => {
  it("keeps morph disabled when one mask is missing", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = imageEntry("hero-image");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: {
              id: "hero-image",
              type: "image"
            },
            holdMs: 10,
            transition: {
              mode: "morph",
              durationMs: 10,
              seed: 7
            }
          },
          {
            mask: "text",
            maskRef: {
              id: "hero-image",
              type: "image"
            },
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
      imageMasks: [imageMask],
      textMasks: []
    });

    expect(() => machine.update(100)).not.toThrow();
    expect(machine.morphMask).toBeNull();
  });

  it("runs timeline transitions and playback controls", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = imageEntry("image-main");
    const textMask = textEntry("text-main");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: {
              id: "image-main",
              type: "image"
            },
            holdMs: 5,
            transition: {
              mode: "fade",
              durationMs: 8,
              seed: 11
            }
          },
          {
            mask: "text",
            maskRef: {
              id: "text-main",
              type: "text"
            },
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
      imageMasks: [imageMask],
      textMasks: [textMask]
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
    const imageMask = imageEntry("image-loop");
    const textMask = textEntry("text-loop");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: {
              id: "image-loop",
              type: "image"
            },
            holdMs: 2,
            transition: {
              mode: "morph",
              durationMs: 2,
              seed: 13
            }
          },
          {
            mask: "text",
            maskRef: {
              id: "text-loop",
              type: "text"
            },
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
      imageMasks: [imageMask],
      textMasks: [textMask]
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

  it("supports transitions across multiple masks of same type via maskId", () => {
    const manager = new InfluenceManager(1, 1, 1);

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: {
              id: "image-a",
              type: "image"
            },
            holdMs: 2,
            transition: {
              mode: "morph",
              durationMs: 4,
              seed: 1
            }
          },
          {
            mask: "image",
            maskRef: {
              id: "image-b",
              type: "image"
            },
            holdMs: 2,
            transition: {
              mode: "fade",
              durationMs: 4,
              seed: 2
            }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageEntry("image-a"), imageEntry("image-b")],
      textMasks: []
    });

    machine.update(2);
    expect(machine.morphMask).not.toBeNull();

    manager.update(4);
    machine.update(0);

    expect(machine.getCurrentStepIndex()).toBe(1);
    expect(machine.morphMask).toBeNull();
  });

  it("remains stable in extended multi-mask loops without unbounded influence growth", () => {
    resetTimelineTransitionArrayPoolForTests();
    const manager = new InfluenceManager(1, 1, 1);

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "text",
            maskRef: { id: "text-a", type: "text" },
            holdMs: 2,
            transition: { mode: "morph", durationMs: 2, seed: 11 }
          },
          {
            mask: "image",
            maskRef: { id: "image-a", type: "image" },
            holdMs: 2,
            transition: { mode: "fade", durationMs: 2, seed: 12 }
          },
          {
            mask: "text",
            maskRef: { id: "text-b", type: "text" },
            holdMs: 2,
            transition: { mode: "dissolve", durationMs: 2, seed: 13 }
          },
          {
            mask: "image",
            maskRef: { id: "image-b", type: "image" },
            holdMs: 2,
            transition: { mode: "fade", durationMs: 2, seed: 14 }
          }
        ]
      },
      initialMask: "text",
      imageMasks: [imageEntry("image-a"), imageEntry("image-b")],
      textMasks: [textEntry("text-a"), textEntry("text-b")]
    });

    const visited = new Set<number>();
    let maxInfluenceCount = 0;
    for (let i = 0; i < 1600; i++) {
      machine.update(1);
      manager.update(1);
      machine.update(0);

      const stepIndex = machine.getCurrentStepIndex();
      visited.add(stepIndex);
      expect(stepIndex).toBeGreaterThanOrEqual(0);
      expect(stepIndex).toBeLessThanOrEqual(3);

      const count = ((manager as unknown as { influences?: unknown[] }).influences?.length ?? 0);
      maxInfluenceCount = Math.max(maxInfluenceCount, count);
    }

    for (let i = 0; i < 8 && machine.morphMask; i++) {
      manager.update(2);
      machine.update(0);
    }

    expect(visited.has(0)).toBe(true);
    expect(visited.has(1)).toBe(true);
    expect(visited.has(2)).toBe(true);
    expect(visited.has(3)).toBe(true);
    expect(maxInfluenceCount).toBeLessThanOrEqual(2);
    expect(machine.morphMask).toBeNull();
    const poolStats = getTimelineTransitionArrayPoolStats();
    expect(poolStats.cachedArrays).toBeGreaterThan(0);
    // Three reusable arrays per transition are expected (buffer + sourceA + sourceB),
    // plus one optional dissolve threshold buffer.
    expect(poolStats.allocations).toBeLessThanOrEqual(4);
  });

  it("activates an image + text combo simultaneously (item 1.9)", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = imageEntry("hero-image");
    const textMask = textEntry("hero-text");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: { id: "hero-image", type: "image" },
            maskRefs: [
              { id: "hero-image", type: "image" },
              { id: "hero-text", type: "text" }
            ],
            holdMs: 10,
            transition: { mode: "morph", durationMs: 10, seed: 1 }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageMask],
      textMasks: [textMask]
    });

    expect(machine.imageMask).not.toBeNull();
    expect(machine.textMask).not.toBeNull();
    const influences = (manager as unknown as { influences: unknown[] }).influences;
    expect(influences).toHaveLength(2);
  });

  it("hard-cuts into a combo step instead of morphing (item 1.9)", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMaskA = imageEntry("image-a");
    const textMaskA = textEntry("text-a");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: { id: "image-a", type: "image" },
            holdMs: 5,
            transition: { mode: "morph", durationMs: 20, seed: 1 }
          },
          {
            mask: "image",
            maskRef: { id: "image-a", type: "image" },
            maskRefs: [
              { id: "image-a", type: "image" },
              { id: "text-a", type: "text" }
            ],
            holdMs: 5,
            transition: { mode: "morph", durationMs: 20, seed: 2 }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageMaskA],
      textMasks: [textMaskA]
    });

    expect(machine.getCurrentStepIndex()).toBe(0);
    expect(machine.textMask).toBeNull();

    machine.update(5);
    expect(machine.getCurrentStepIndex()).toBe(1);
    expect(machine.morphMask).toBeNull();
    expect(machine.imageMask).not.toBeNull();
    expect(machine.textMask).not.toBeNull();
  });

  it("hard-cuts out of a combo step into a different single mask instead of morphing (item 1.9 regression)", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMaskA = imageEntry("image-a");
    const textMaskA = textEntry("text-a");
    const imageMaskB = imageEntry("image-b");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: { id: "image-a", type: "image" },
            maskRefs: [
              { id: "image-a", type: "image" },
              { id: "text-a", type: "text" }
            ],
            holdMs: 5,
            transition: { mode: "morph", durationMs: 20, seed: 1 }
          },
          {
            mask: "image",
            maskRef: { id: "image-b", type: "image" },
            holdMs: 5,
            transition: { mode: "morph", durationMs: 20, seed: 2 }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageMaskA, imageMaskB],
      textMasks: [textMaskA]
    });

    expect(machine.imageMask).not.toBeNull();
    expect(machine.textMask).not.toBeNull();

    machine.update(5);
    expect(machine.getCurrentStepIndex()).toBe(1);
    // Without the combo-guard running first, currentMask.id ("image-a") would still
    // differ from nextMask.id ("image-b"), so this would fall through to build a real
    // morph from the combo's *primary* mask only -- silently dropping the secondary
    // text mask without any fade instead of hard-cutting. Assert both didn't happen.
    expect(machine.morphMask).toBeNull();
    expect(machine.textMask).toBeNull();
    expect(machine.imageMask).not.toBeNull();
  });

  it("falls back safely when timeline step refs are invalid", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: { id: "missing-image", type: "image" },
            holdMs: 1,
            transition: { mode: "fade", durationMs: 1, seed: 21 }
          },
          {
            mask: "text",
            maskRef: { id: "missing-text", type: "text" },
            holdMs: 1,
            transition: { mode: "dissolve", durationMs: 1, seed: 22 }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageEntry("image-live")],
      textMasks: [textEntry("text-live")]
    });

    expect(machine.imageMask).not.toBeNull();
    expect(machine.textMask).toBeNull();

    machine.update(1);
    expect(machine.morphMask).not.toBeNull();
    manager.update(1);
    machine.update(0);

    expect(machine.getCurrentStepIndex()).toBe(1);
    expect(machine.textMask).not.toBeNull();
    expect(machine.morphMask).toBeNull();
  });

  it("calls resetReveal() on a mask when it first becomes active", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const mask = new RevealableMask();
    const entry = { id: "text-1", type: "text" as const, influence: mask };

    createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: { enabled: false, autoplay: false, loop: false, initialStep: 0, steps: [] },
      initialMask: "text",
      imageMasks: [],
      textMasks: [entry]
    });

    expect(mask.resetRevealCallCount).toBe(1);
  });

  it("calls resetReveal() again when a step loops back to the same mask (typewriter restarts each cycle)", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const mask = new RevealableMask();
    const entry = { id: "text-loop", type: "text" as const, influence: mask };

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "text",
            maskRef: { id: "text-loop", type: "text" },
            holdMs: 5,
            transition: { mode: "morph", durationMs: 1, seed: 1 }
          }
        ]
      },
      initialMask: "text",
      imageMasks: [],
      textMasks: [entry]
    });

    expect(mask.resetRevealCallCount).toBe(1);

    machine.update(5); // holdMs elapses -> loops back to step 0, same mask id -> hard-cut
    expect(mask.resetRevealCallCount).toBe(2);
  });

  it("applies a per-mask blendMode override for combo step entries, defaults the rest to 'max' (item: multi-mask blend)", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = imageEntry("hero-image");
    const textMask = textEntry("hero-text");

    createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: { id: "hero-image", type: "image" },
            maskRefs: [
              { id: "hero-image", type: "image", blendMode: "multiply" },
              { id: "hero-text", type: "text" }
            ],
            holdMs: 10,
            transition: { mode: "morph", durationMs: 10, seed: 1 }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageMask],
      textMasks: [textMask]
    });

    expect(imageMask.influence.blendMode).toBe("multiply");
    expect(textMask.influence.blendMode).toBe("max");
  });

  it("resets blendMode back to 'max' when the same mask is later reused without an override (no leak across steps)", () => {
    const manager = new InfluenceManager(1, 1, 1);
    const imageMask = imageEntry("hero-image");
    const textMask = textEntry("hero-text");

    const machine = createMaskStateMachine({
      influenceManager: manager,
      maskTimeline: {
        enabled: true,
        autoplay: false,
        loop: true,
        initialStep: 0,
        steps: [
          {
            mask: "image",
            maskRef: { id: "hero-image", type: "image" },
            maskRefs: [
              { id: "hero-image", type: "image", blendMode: "multiply" },
              { id: "hero-text", type: "text" }
            ],
            holdMs: 5,
            transition: { mode: "morph", durationMs: 1, seed: 1 }
          },
          {
            mask: "image",
            maskRef: { id: "hero-image", type: "image" },
            holdMs: 5,
            transition: { mode: "morph", durationMs: 1, seed: 1 }
          }
        ]
      },
      initialMask: "image",
      imageMasks: [imageMask],
      textMasks: [textMask]
    });

    expect(imageMask.influence.blendMode).toBe("multiply");

    machine.play();
    machine.update(5); // leaving a combo step always hard-cuts, straight into step 1

    expect(imageMask.influence.blendMode).toBe("max");
  });
});
