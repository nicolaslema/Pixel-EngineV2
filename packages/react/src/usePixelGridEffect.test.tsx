import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { usePixelGridEffect } from "./usePixelGridEffect";

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

describe("usePixelGridEffect", () => {
  it("creates, attaches and detaches effect with callbacks", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const addEntity = vi.fn();
    const removeEntity = vi.fn();
    const start = vi.fn();
    const destroy = vi.fn();
    const resize = vi.fn();
    const engine = {
      addEntity,
      removeEntity,
      start,
      destroy,
      resize
    };

    const triggerRipple = vi.fn();
    const effect = { triggerRipple };

    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => effect);
    const onGridReady = vi.fn();
    const onRipple = vi.fn();

    function TestComponent() {
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        gridConfig: {
          colors: ["#334155", "#475569", "#64748b"],
          gap: 6,
          expandEase: 0.08,
          breathSpeed: 1
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never,
        onGridReady,
        onRipple
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(createGridEffect).toHaveBeenCalledTimes(1);
    expect(addEntity).toHaveBeenCalledTimes(1);
    expect(onGridReady).toHaveBeenCalledTimes(1);

    const canvas = container.querySelector("canvas");
    vi.spyOn(canvas as HTMLCanvasElement, "getBoundingClientRect").mockReturnValue({
      left: 5,
      top: 7,
      width: 300,
      height: 180,
      right: 305,
      bottom: 187,
      x: 5,
      y: 7,
      toJSON: () => ({})
    } as DOMRect);

    act(() => {
      canvas?.dispatchEvent(new MouseEvent("click", { clientX: 15, clientY: 17 }));
    });

    expect(triggerRipple).toHaveBeenCalledWith(10, 10);
    expect(onRipple).toHaveBeenCalledWith(expect.objectContaining({ x: 10, y: 10 }));

    cleanupHost(container, root);
    expect(removeEntity).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("recreates effect when grid config changes even with stable effectKey", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const addEntity = vi.fn();
    const removeEntity = vi.fn();
    const engine = {
      addEntity,
      removeEntity,
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };

    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    }));

    function TestComponent(props: { effectKey?: string; gap: number }) {
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        effectKey: props.effectKey,
        gridConfig: {
          colors: ["#334155", "#475569", "#64748b"],
          gap: props.gap,
          expandEase: 0.08,
          breathSpeed: 1
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent effectKey="stable" gap={6} />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    act(() => {
      root.render(<TestComponent effectKey="stable" gap={8} />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(2);

    act(() => {
      root.render(<TestComponent effectKey="changed" gap={8} />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(3);

    cleanupHost(container, root);
  });

  it("does not recreate effect when onMaskError identity changes across renders (item 1.6)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const addEntity = vi.fn();
    const removeEntity = vi.fn();
    const engine = {
      addEntity,
      removeEntity,
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };

    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    }));

    function TestComponent(props: { onMaskError: () => void }) {
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        gridConfig: {
          colors: ["#334155", "#475569", "#64748b"],
          gap: 6,
          expandEase: 0.08,
          breathSpeed: 1
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never,
        onMaskError: props.onMaskError
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent onMaskError={() => {}} />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    // A fresh inline callback identity every render, like a real component would pass --
    // must not trigger a recreate (protects the ref-based wiring, same pattern already
    // used for onGridReady/onRipple).
    act(() => {
      root.render(<TestComponent onMaskError={() => {}} />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("does not recreate effect when gridConfig keys are reordered but content is unchanged (item 5.2)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const addEntity = vi.fn();
    const removeEntity = vi.fn();
    const engine = {
      addEntity,
      removeEntity,
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };

    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    }));

    function TestComponent(props: { reordered?: boolean }) {
      // hoverEffects has no fixed key order from the preset base (unlike colors/gap/
      // expandEase/breathSpeed, which the preset already declares -- overwriting an
      // existing key never changes its enumeration order, so those alone can't produce a
      // genuine reordering after the merge pipeline). A nested block with no base-preset
      // counterpart keeps whichever key order the caller used, making it the right target
      // to prove stableSerialize is truly key-order independent.
      const hoverEffects = props.reordered
        ? { radius: 100, mode: "reactive" as const, strength: 0.8 }
        : { mode: "reactive" as const, strength: 0.8, radius: 100 };
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        gridConfig: {
          colors: ["#334155", "#475569", "#64748b"],
          gap: 6,
          expandEase: 0.08,
          breathSpeed: 1,
          hoverEffects
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    // Same content, different key insertion order -- must not recreate the effect.
    act(() => {
      root.render(<TestComponent reordered />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
  });

  it("supports preset + declarative mask with timeline config without explicit gridConfig", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const engine = {
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };

    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    }));

    function TestComponent() {
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        preset: "hero-image",
        mask: {
          type: "hybrid",
          initialMask: "image",
          maskTimeline: {
            enabled: true,
            autoplay: false,
            loop: true,
            initialStep: 0,
            steps: [
              {
                mask: "image",
                holdMs: 300,
                transition: { mode: "fade", durationMs: 120, seed: 5 }
              },
              {
                mask: "text",
                holdMs: 400,
                transition: { mode: "dissolve", durationMs: 140, seed: 8 }
              }
            ]
          },
          image: {
            src: "/cat.png",
            centerX: 150,
            centerY: 90,
            scale: 1.5
          },
          text: {
            text: "HELLO",
            centerX: 150,
            centerY: 95
          }
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.colors.length).toBeGreaterThan(0);
    expect(configArg.textMask?.text).toBe("HELLO");
    expect(configArg.imageMask?.src).toBe("/cat.png");
    expect(configArg.maskTimeline?.enabled).toBe(true);
    expect(configArg.maskTimeline?.steps?.[0]?.holdMs).toBe(300);
    expect(configArg.maskTimeline?.steps?.[1]?.transition?.mode).toBe("dissolve");
    expect(configArg.gap).toBeGreaterThan(0);

    cleanupHost(container, root);
  });

  it("resizes existing effect when dimensions change without remount", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const addEntity = vi.fn();
    const removeEntity = vi.fn();
    const engine = {
      addEntity,
      removeEntity,
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };
    const createEngine = vi.fn(() => engine);
    const resize = vi.fn();
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn(),
      resize
    }));

    function TestComponent(props: { width: number; height: number }) {
      const { canvasRef } = usePixelGridEffect({
        width: props.width,
        height: props.height,
        effectKey: "stable",
        gridConfig: {
          colors: ["#334155", "#475569", "#64748b"],
          gap: 6,
          expandEase: 0.08,
          breathSpeed: 1
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent width={300} height={180} />);
    });
    expect(createGridEffect).toHaveBeenCalledTimes(1);

    act(() => {
      root.render(<TestComponent width={420} height={240} />);
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalled();
    expect(resize).toHaveBeenLastCalledWith(420, 240);

    cleanupHost(container, root);
  });

  it("forwards hybrid multi-mask items/steps with assetId refs to effect config", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const engine = {
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };
    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => ({
      triggerRipple: vi.fn()
    }));

    function TestComponent() {
      const { canvasRef } = usePixelGridEffect({
        width: 320,
        height: 180,
        preset: "hero-image",
        mask: {
          type: "hybrid",
          texts: [
            { id: "title", text: "PIXEL", centerX: 160, centerY: 90 },
            { id: "subtitle", text: "ENGINE", centerX: 160, centerY: 104 }
          ],
          images: [
            { id: "imgA", src: "/a.png", centerX: 160, centerY: 88, scale: 1.8 },
            { id: "imgB", src: "/b.png", centerX: 160, centerY: 88, scale: 1.6 }
          ],
          steps: [
            { mask: "text", assetId: "title", holdMs: 300, mode: "fade", durationMs: 140 },
            { mask: "image", assetId: "imgA", holdMs: 320, mode: "morph", durationMs: 180 },
            {
              mask: "text",
              assetId: "subtitle",
              holdMs: 340,
              transition: { mode: "dissolve", durationMs: 160, seed: 7 }
            },
            { mask: "image", assetId: "imgB", holdMs: 360, mode: "fade", durationMs: 150 }
          ],
          maskTimeline: {
            enabled: true,
            autoplay: true,
            loop: true,
            initialStep: 0
          }
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(createGridEffect).toHaveBeenCalledTimes(1);
    const configArg = createGridEffect.mock.calls[0][3];
    expect(configArg.textMasks).toHaveLength(2);
    expect(configArg.imageMasks).toHaveLength(2);
    expect(configArg.maskTimeline?.steps?.[0]?.assetId).toBe("title");
    expect(configArg.maskTimeline?.steps?.[1]?.assetId).toBe("imgA");
    expect(configArg.maskTimeline?.steps?.[2]?.assetId).toBe("subtitle");
    expect(configArg.maskTimeline?.steps?.[3]?.assetId).toBe("imgB");

    cleanupHost(container, root);
  });

  it("calls onConfigWarning when the resolved gridConfig has warnings (item 5.13)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const engine = {
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };
    const effect = { triggerRipple: vi.fn() };
    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => effect);
    const onConfigWarning = vi.fn();

    function TestComponent() {
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        gridConfig: {
          colors: [],
          gap: 0,
          expandEase: 0.08,
          breathSpeed: 1
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never,
        onConfigWarning
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(onConfigWarning).toHaveBeenCalledTimes(1);
    const warnings = onConfigWarning.mock.calls[0][0] as string[];
    expect(warnings.some((message) => message.includes("gridConfig.gap must be > 0"))).toBe(true);

    cleanupHost(container, root);
    warnSpy.mockRestore();
  });

  it("does not call onConfigWarning when the resolved gridConfig is valid (item 5.13)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const engine = {
      addEntity: vi.fn(),
      removeEntity: vi.fn(),
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    };
    const effect = { triggerRipple: vi.fn() };
    const createEngine = vi.fn(() => engine);
    const createGridEffect = vi.fn(() => effect);
    const onConfigWarning = vi.fn();

    function TestComponent() {
      const { canvasRef } = usePixelGridEffect({
        width: 300,
        height: 180,
        gridConfig: {
          colors: ["#334155", "#475569", "#64748b"],
          gap: 6,
          expandEase: 0.08,
          breathSpeed: 1
        },
        createEngine: createEngine as never,
        createGridEffect: createGridEffect as never,
        onConfigWarning
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(onConfigWarning).not.toHaveBeenCalled();

    cleanupHost(container, root);
  });
});
