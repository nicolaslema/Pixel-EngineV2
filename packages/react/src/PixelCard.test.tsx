import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelCard } from "./PixelCard";
import { PixelCardHandle } from "./types";

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

describe("PixelCard", () => {
  it("renders in grid mode and forwards grid interaction callbacks", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onRipple = vi.fn();
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

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard
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
          onRipple={onRipple}
        >
          <span>Content</span>
        </PixelCard>
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    vi.spyOn(canvas as HTMLCanvasElement, "getBoundingClientRect").mockReturnValue({
      left: 2,
      top: 3,
      width: 320,
      height: 180,
      right: 322,
      bottom: 183,
      x: 2,
      y: 3,
      toJSON: () => ({})
    } as DOMRect);

    act(() => {
      canvas?.dispatchEvent(new MouseEvent("click", { clientX: 12, clientY: 13 }));
    });

    expect(triggerRipple).toHaveBeenCalledWith(10, 10);
    expect(onRipple).toHaveBeenCalledWith(expect.objectContaining({ x: 10, y: 10 }));
    expect(container.textContent).toContain("Content");

    cleanupHost(container, root);
  });

  it("renders in engine mode when mode='plain' is set explicitly (item 5.11)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard width={320} height={180} createEngine={createEngine} mode="plain">
          <span>Engine Content</span>
        </PixelCard>
      );
    });

    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(container.textContent).toContain("Engine Content");

    cleanupHost(container, root);
  });

  it("uses overlayPointerEvents none by default and allows override", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard width={320} height={180} createEngine={createEngine} mode="plain">
          <span>Overlay text</span>
        </PixelCard>
      );
    });

    const overlay = container.querySelectorAll("div")[1];
    expect(overlay.style.pointerEvents).toBe("none");

    act(() => {
      root.render(
        <PixelCard
          width={320}
          height={180}
          createEngine={createEngine}
          overlayPointerEvents="auto"
          mode="plain"
        >
          <span>Overlay text</span>
        </PixelCard>
      );
    });

    const updatedOverlay = container.querySelectorAll("div")[1];
    expect(updatedOverlay.style.pointerEvents).toBe("auto");

    cleanupHost(container, root);
  });

  it("supports overlayPointerEvents hybrid and forwards overlay clicks to canvas ripple", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onRipple = vi.fn();
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

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard
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
          onRipple={onRipple}
          overlayPointerEvents="hybrid"
        >
          <button type="button">Overlay button</button>
        </PixelCard>
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    vi.spyOn(canvas as HTMLCanvasElement, "getBoundingClientRect").mockReturnValue({
      left: 4,
      top: 5,
      width: 320,
      height: 180,
      right: 324,
      bottom: 185,
      x: 4,
      y: 5,
      toJSON: () => ({})
    } as DOMRect);

    const button = container.querySelector("button");
    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { clientX: 24, clientY: 35, bubbles: true }));
    });

    expect(triggerRipple).toHaveBeenCalledWith(20, 30);
    expect(onRipple).toHaveBeenCalledWith(expect.objectContaining({ x: 20, y: 30 }));

    cleanupHost(container, root);
  });

  it("supports overlayPointerEvents hybrid and forwards overlay hover as real PointerEvents on the canvas (item 5.1)", () => {
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
        <PixelCard
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
          overlayPointerEvents="hybrid"
        >
          <button type="button">Overlay button</button>
        </PixelCard>
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();

    const receivedTypes: string[] = [];
    canvas?.addEventListener("pointermove", (event) => receivedTypes.push(event.type));
    canvas?.addEventListener("pointerenter", (event) => receivedTypes.push(event.type));
    // Same-type sanity check: the bridge must NOT be dispatching MouseEvents for hover --
    // that's exactly the bug this test guards against (item 5.1).
    canvas?.addEventListener("mousemove", () => receivedTypes.push("mousemove (BUG)"));

    const button = container.querySelector("button");
    act(() => {
      button?.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 18,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true
        })
      );
    });

    expect(receivedTypes).toEqual(["pointerenter", "pointermove"]);

    cleanupHost(container, root);
  });

  it("uses grid mode when preset is provided without gridConfig", () => {
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
        <PixelCard
          width={320}
          height={180}
          preset="card-soft"
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        >
          <span>Preset content</span>
        </PixelCard>
      );
    });

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("uses grid mode when scrollReactive is provided", () => {
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
        <PixelCard
          width={320}
          height={180}
          scrollReactive={{ enabled: true }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        >
          <span>Scroll reactive card</span>
        </PixelCard>
      );
    });

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("uses grid mode when themeSync/statePreset are provided", () => {
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
        <PixelCard
          width={320}
          height={180}
          themeSync={{ enabled: true, mode: "dark", followSystem: false }}
          statePreset="active"
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        >
          <span>Themed state card</span>
        </PixelCard>
      );
    });

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("uses grid mode when debugHud/ssrPlaceholder are provided", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn(),
      getDebugSnapshot: vi.fn(() => ({
        totalCells: 10,
        activeCells: 4,
        activeRipples: 1,
        timeline: { playing: false, stepIndex: 0 }
      }))
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard
          width={320}
          height={180}
          debugHud={{ enabled: true, updateIntervalMs: 50 }}
          ssrPlaceholder="card-soft"
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        >
          <span>Debug card</span>
        </PixelCard>
      );
    });

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("passes declarative timeline mask config through PixelCard grid mode", () => {
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
        <PixelCard
          width={320}
          height={180}
          preset="hero-image"
          mask={{
            type: "hybrid",
            initialMask: "text",
            text: { text: "CARD", centerX: 160, centerY: 90 },
            image: { src: "/cat.png", centerX: 160, centerY: 90, scale: 1.8 },
            maskTimeline: {
              enabled: true,
              autoplay: true,
              loop: true,
              initialStep: 1,
              steps: [
                {
                  mask: "text",
                  holdMs: 260,
                  transition: { mode: "morph", durationMs: 110, seed: 3 }
                },
                {
                  mask: "image",
                  holdMs: 420,
                  transition: { mode: "fade", durationMs: 130, seed: 4 }
                }
              ]
            }
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        >
          <span>Timeline card</span>
        </PixelCard>
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.initialMask).toBe("text");
    expect(configArg.maskTimeline?.initialStep).toBe(1);
    expect(configArg.maskTimeline?.steps?.[0]?.transition?.durationMs).toBe(110);
    expect(configArg.maskTimeline?.steps?.[1]?.holdMs).toBe(420);
    expect(container.textContent).toContain("Timeline card");

    cleanupHost(container, root);
  });

  it("passes hybrid multi-mask timeline with assetId refs through PixelCard", () => {
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
        <PixelCard
          width={320}
          height={180}
          preset="hero-image"
          mask={{
            type: "hybrid",
            texts: [
              { id: "card-title", text: "CARD", centerX: 160, centerY: 90 },
              { id: "card-sub", text: "PIXEL", centerX: 160, centerY: 104 }
            ],
            images: [
              { id: "card-img-a", src: "/card-a.png", centerX: 160, centerY: 90, scale: 1.7 },
              { id: "card-img-b", src: "/card-b.png", centerX: 160, centerY: 90, scale: 1.5 }
            ],
            maskTimeline: {
              enabled: true,
              autoplay: true,
              loop: true,
              steps: [
                { mask: "text", assetId: "card-title", holdMs: 240, mode: "fade", durationMs: 130 },
                { mask: "image", assetId: "card-img-a", holdMs: 260, mode: "morph", durationMs: 150 },
                { mask: "text", assetId: "card-sub", holdMs: 280, mode: "dissolve", durationMs: 140 },
                { mask: "image", assetId: "card-img-b", holdMs: 300, mode: "fade", durationMs: 120 }
              ]
            }
          }}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
        >
          <span>Multi mask card</span>
        </PixelCard>
      );
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.textMasks).toHaveLength(2);
    expect(configArg.imageMasks).toHaveLength(2);
    expect(configArg.maskTimeline?.steps?.[0]?.assetId).toBe("card-title");
    expect(configArg.maskTimeline?.steps?.[3]?.assetId).toBe("card-img-b");
    expect(container.textContent).toContain("Multi mask card");

    cleanupHost(container, root);
  });

  it("defaults to grid mode even with zero grid-specific props (item 5.11)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onGridReady = vi.fn();
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
        <PixelCard
          width={320}
          height={180}
          createEngine={createEngine}
          createGridEffect={createGridEffect}
          onGridReady={onGridReady}
        >
          <span>Default mode content</span>
        </PixelCard>
      );
    });

    expect(onGridReady).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("mode='plain' forces PixelCanvas even when grid-specific props are passed (item 5.11)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onGridReady = vi.fn();
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard
          width={320}
          height={180}
          preset="card-ripple"
          createEngine={createEngine}
          mode="plain"
          onGridReady={onGridReady}
        >
          <span>Plain mode content</span>
        </PixelCard>
      );
    });

    expect(onGridReady).not.toHaveBeenCalled();
    expect(container.querySelector("canvas")).not.toBeNull();

    cleanupHost(container, root);
  });

  it("exposes getEngine/getGrid/triggerRipple via ref in grid mode (item 5.15)", () => {
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
    const ref = React.createRef<PixelCardHandle>();

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard
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
        >
          <span>Ref content</span>
        </PixelCard>
      );
    });

    expect(ref.current?.getEngine()).toBe(engineInstance);
    expect(ref.current?.getGrid()).toBe(gridInstance);

    ref.current?.triggerRipple(5, 6);
    expect(gridInstance.triggerRipple).toHaveBeenCalledWith(5, 6);

    cleanupHost(container, root);
  });

  it("ref's grid-specific methods are no-ops / return null in mode='plain' (item 5.15)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const engineInstance = { start: vi.fn(), destroy: vi.fn(), resize: vi.fn() };
    const createEngine = vi.fn(() => engineInstance) as never;
    const ref = React.createRef<PixelCardHandle>();

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard ref={ref} width={320} height={180} createEngine={createEngine} mode="plain">
          <span>Plain ref content</span>
        </PixelCard>
      );
    });

    expect(ref.current?.getEngine()).toBe(engineInstance);
    expect(ref.current?.getGrid()).toBeNull();
    expect(() => ref.current?.triggerRipple(1, 2)).not.toThrow();

    cleanupHost(container, root);
  });
});
