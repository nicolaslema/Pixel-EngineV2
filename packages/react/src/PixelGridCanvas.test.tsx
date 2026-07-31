import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelGridCanvas } from "./PixelGridCanvas";
import { PixelGridCanvasHandle } from "./types";

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

  it("renders aria-hidden='true' by default (decorative canvas, item 5.7)", () => {
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
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");

    cleanupHost(container, root);
  });

  it("omits aria-hidden and forwards aria-label/role when decorative={false}", () => {
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
          gridConfig={{
            colors: ["#334155", "#475569", "#64748b"],
            gap: 6,
            expandEase: 0.08,
            breathSpeed: 1
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
          decorative={false}
          role="img"
          aria-label="Interactive pixel grid"
        />
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas?.hasAttribute("aria-hidden")).toBe(false);
    expect(canvas?.getAttribute("role")).toBe("img");
    expect(canvas?.getAttribute("aria-label")).toBe("Interactive pixel grid");

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

  it("triggers ripple bursts on wheel when scrollReactive is enabled", () => {
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

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 240 }));
    });

    expect(triggerRipple).toHaveBeenCalled();

    cleanupHost(container, root);
    rafSpy.mockRestore();
    cafSpy.mockRestore();
  });

  it("triggers ripple bursts on consecutive wheel gestures in the same direction", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
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

    let nextRafId = 1;
    const rafTimers = new Map<number, ReturnType<typeof setTimeout>>();
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        const id = nextRafId++;
        const timerId = setTimeout(() => callback(16), 0);
        rafTimers.set(id, timerId);
        return id;
      });
    const cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
      const timerId = rafTimers.get(id);
      if (typeof timerId !== "undefined") {
        clearTimeout(timerId);
      }
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
            intensity: 1.2,
            direction: "down",
            source: "window",
            cooldownMs: 0,
            maxBurstRipples: 1
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        />
      );
    });

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 120 }));
      vi.runOnlyPendingTimers();
    });
    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 110 }));
      vi.runOnlyPendingTimers();
    });

    expect(triggerRipple).toHaveBeenCalledTimes(2);

    cleanupHost(container, root);
    rafSpy.mockRestore();
    cafSpy.mockRestore();
    vi.useRealTimers();
  });

  it("supports scroll reactive bursts from overflow container sources", () => {
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

    function OverflowHarness() {
      const scrollRef = React.useRef<HTMLDivElement | null>(null);
      return (
        <div
          ref={scrollRef}
          style={{
            maxHeight: "160px",
            overflowY: "auto"
          }}
        >
          <div style={{ height: "520px" }}>
            <PixelGridCanvas
              width={320}
              height={180}
              preset="card-ripple"
              scrollReactive={{
                enabled: true,
                intensity: 1.25,
                direction: "both",
                source: scrollRef,
                cooldownMs: 0,
                maxBurstRipples: 2
              }}
              createEngine={createEngine}
              createGridEffect={createGridEffect}
            />
          </div>
        </div>
      );
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<OverflowHarness />);
    });

    const scrollContainer = container.firstElementChild as HTMLDivElement;
    expect(scrollContainer).not.toBeNull();

    scrollContainer.scrollTop = 0;
    act(() => {
      scrollContainer.scrollTop = 140;
      scrollContainer.dispatchEvent(new Event("scroll"));
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

  it("exposes getEngine/getGrid/triggerRipple/playMaskTimeline/pauseMaskTimeline/resetMaskTimeline via ref (item 5.15)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const engineInstance = {
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };
    const createEngine = vi.fn(() => engineInstance) as never;
    const gridInstance = {
      triggerRipple: vi.fn(),
      playMaskTimeline: vi.fn(),
      pauseMaskTimeline: vi.fn(),
      resetMaskTimeline: vi.fn()
    };
    const createGridEffect = vi.fn(() => gridInstance) as never;
    const ref = React.createRef<PixelGridCanvasHandle>();

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelGridCanvas
          ref={ref}
          width={320}
          height={180}
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

    expect(ref.current?.getEngine()).toBe(engineInstance);
    expect(ref.current?.getGrid()).toBe(gridInstance);

    ref.current?.triggerRipple(12, 34);
    expect(gridInstance.triggerRipple).toHaveBeenCalledWith(12, 34);

    ref.current?.playMaskTimeline();
    expect(gridInstance.playMaskTimeline).toHaveBeenCalledTimes(1);

    ref.current?.pauseMaskTimeline();
    expect(gridInstance.pauseMaskTimeline).toHaveBeenCalledTimes(1);

    ref.current?.resetMaskTimeline();
    expect(gridInstance.resetMaskTimeline).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });
});
