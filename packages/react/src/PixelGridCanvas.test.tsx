import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelGridCanvas } from "./PixelGridCanvas";

function createHost(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

function cleanupHost(container: HTMLDivElement, root: Root): void {
  act(() => root.unmount());
  container.remove();
}

describe("PixelGridCanvas", () => {
  it("renders canvas with declarative grid setup", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          className="pixel-grid-canvas"
          gridConfig={{
            colors: ["#334155", "#475569", "#64748b"],
            gap: 6,
            expandEase: 0.08,
            breathSpeed: 1
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.className).toBe("pixel-grid-canvas");

    cleanupHost(container, root);
  });

  it("forwards declarative hybrid mask timeline config to effect creation", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="hero-image"
          mask={{
            type: "hybrid",
            initialMask: "image",
            text: { text: "HELLO", centerX: 160, centerY: 96 },
            image: { src: "/cat.png", centerX: 160, centerY: 90, scale: 2 },
            maskTimeline: {
              enabled: true,
              autoplay: false,
              loop: true,
              initialStep: 0,
              steps: [
                {
                  mask: "image",
                  holdMs: 300,
                  transition: { mode: "fade", durationMs: 120, seed: 1 }
                },
                {
                  mask: "text",
                  holdMs: 350,
                  transition: { mode: "dissolve", durationMs: 140, seed: 2 }
                }
              ]
            }
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.maskTimeline?.enabled).toBe(true);
    expect(configArg.maskTimeline?.steps?.[0]?.holdMs).toBe(300);
    expect(configArg.maskTimeline?.steps?.[1]?.transition?.mode).toBe("dissolve");

    cleanupHost(container, root);
  });

  it("forwards hybrid multi-mask config with assetId timeline refs", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="hero-image"
          mask={{
            type: "hybrid",
            texts: [
              { id: "t1", text: "HELLO", centerX: 160, centerY: 92 },
              { id: "t2", text: "WORLD", centerX: 160, centerY: 104 }
            ],
            images: [
              { id: "i1", src: "/cat-a.png", centerX: 160, centerY: 88, scale: 2 },
              { id: "i2", src: "/cat-b.png", centerX: 160, centerY: 88, scale: 1.7 }
            ],
            steps: [
              { mask: "text", assetId: "t1", holdMs: 220, mode: "fade", durationMs: 120 },
              { mask: "image", assetId: "i1", holdMs: 260, mode: "morph", durationMs: 140 },
              { mask: "text", assetId: "t2", holdMs: 240, mode: "dissolve", durationMs: 130 },
              { mask: "image", assetId: "i2", holdMs: 280, mode: "fade", durationMs: 120 }
            ]
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.textMasks).toHaveLength(2);
    expect(configArg.imageMasks).toHaveLength(2);
    expect(configArg.maskTimeline?.steps?.map((step: { assetId?: string }) => step.assetId)).toEqual([
      "t1",
      "i1",
      "t2",
      "i2"
    ]);

    cleanupHost(container, root);
  });

  it("triggers ripple bursts on scroll when scrollReactive is enabled", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const triggerRipple = vi.fn();
    const createGridEffect = vi.fn(() => ({
      triggerRipple
    })) as never;

    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(16);
        return 1;
      });
    const cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0
    });

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="card-ripple"
          scrollReactive={{
            enabled: true,
            intensity: 1.5,
            direction: "both",
            cooldownMs: 0,
            maxBurstRipples: 3
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    (window as { scrollY: number }).scrollY = 240;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(triggerRipple).toHaveBeenCalled();

    cleanupHost(container, root);
    rafSpy.mockRestore();
    cafSpy.mockRestore();
  });

  it("applies section transition preset and controls timeline on visibility changes", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const triggerRipple = vi.fn();
    const playMaskTimeline = vi.fn();
    const pauseMaskTimeline = vi.fn();
    const createGridEffect = vi.fn(() => ({
      triggerRipple,
      playMaskTimeline,
      pauseMaskTimeline
    })) as never;

    type ObserverCallback = ConstructorParameters<typeof IntersectionObserver>[0];
    const observerStore: { callback?: ObserverCallback } = {};
    class IntersectionObserverMock {
      constructor(callback: ObserverCallback) {
        observerStore.callback = callback;
      }

      observe(): void {}

      disconnect(): void {}

      unobserve(): void {}

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    const previousObserver = globalThis.IntersectionObserver;
    (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver =
      IntersectionObserverMock as unknown as typeof IntersectionObserver;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="card-soft"
          sectionTransition={{
            enabled: true,
            preset: "lift",
            playTimelineOnEnter: true,
            pauseTimelineOnExit: true,
            rippleOnEnter: true
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    const callback = observerStore.callback;
    expect(callback).toBeTypeOf("function");

    const makeEntry = (ratio: number, isIntersecting: boolean): IntersectionObserverEntry =>
      ({
        target: canvas,
        isIntersecting,
        intersectionRatio: ratio,
        boundingClientRect: canvas.getBoundingClientRect(),
        intersectionRect: canvas.getBoundingClientRect(),
        rootBounds: null,
        time: 0
      }) as IntersectionObserverEntry;

    act(() => {
      callback?.([makeEntry(0.75, true)], {} as IntersectionObserver);
    });

    expect(playMaskTimeline).toHaveBeenCalledTimes(1);
    expect(triggerRipple).toHaveBeenCalled();
    expect(canvas.style.transform).toContain("translate3d");

    act(() => {
      callback?.([makeEntry(0, false)], {} as IntersectionObserver);
    });

    expect(pauseMaskTimeline).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
    if (previousObserver) {
      (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver =
        previousObserver;
    } else {
      delete (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    }
  });

  it("applies themeSync and statePreset overrides before effect creation", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="minimal"
          gridConfig={{ gap: 7 }}
          themeSync={{ enabled: true, mode: "light", followSystem: false }}
          statePreset="success"
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.canvasBackground).toBe("#f8fafc");
    expect(configArg.effects?.paletteCycle?.enabled).toBe(true);
    expect(configArg.gap).toBe(7);

    cleanupHost(container, root);
  });

  it("recreates grid effect when statePreset changes without effectKey override", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="minimal"
          statePreset={{ enabled: true, value: "idle" }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    expect(createGridEffect.mock.calls[0][3].effects?.paletteCycle?.enabled).toBe(false);

    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="minimal"
          statePreset={{ enabled: true, value: "success" }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(2);
    expect(createGridEffect.mock.calls[1][3].colors).toEqual(["#14532d", "#16a34a", "#22c55e"]);

    cleanupHost(container, root);
  });

  it("renders debug HUD overlay with runtime stats when enabled", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();

    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn(),
      getFPS: vi.fn(() => 61.2),
      getQuality: vi.fn(() => "medium"),
      getLoopTuning: vi.fn(() => ({
        fixedTimeStep: 16.67,
        maxDelta: 250,
        maxUpdatesPerFrame: 240
      }))
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn(),
      getDebugSnapshot: vi.fn(() => ({
        totalCells: 120,
        activeCells: 42,
        activeRipples: 3,
        timeline: { playing: true, stepIndex: 2 }
      }))
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="card-ripple"
          debugHud={{ enabled: true, updateIntervalMs: 30, showLoop: true }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    act(() => {
      vi.advanceTimersByTime(60);
    });

    const hud = document.querySelector("[data-pixel-engine-debug-hud='true']") as HTMLElement | null;
    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain("fps:");
    expect(hud?.textContent).toContain("cells:");
    expect(hud?.textContent).toContain("ripples:");

    cleanupHost(container, root);
    expect(document.querySelector("[data-pixel-engine-debug-hud='true']")).toBeNull();
    vi.useRealTimers();
  });

  it("applies SSR placeholder preset style on canvas", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          width={320}
          height={180}
          preset="minimal"
          ssrPlaceholder={{ enabled: true, preset: "hero-image", hideOnReady: false }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas?.style.backgroundImage.length).toBeGreaterThan(0);

    cleanupHost(container, root);
  });
});
