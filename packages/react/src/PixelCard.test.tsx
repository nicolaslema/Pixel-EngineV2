import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelCard } from "./PixelCard";

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

  it("renders in engine mode when gridConfig is not provided", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCard width={320} height={180} createEngine={createEngine}>
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
        <PixelCard width={320} height={180} createEngine={createEngine}>
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
});
