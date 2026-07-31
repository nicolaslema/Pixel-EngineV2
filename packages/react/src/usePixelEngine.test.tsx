import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { usePixelEngine } from "./usePixelEngine";

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

describe("usePixelEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("creates and destroys engine with lifecycle callbacks", () => {
    const start = vi.fn();
    const destroy = vi.fn();
    const onReady = vi.fn();
    const onDestroy = vi.fn();

    const createEngine = vi.fn(() => ({
      start,
      destroy,
      resize: vi.fn()
    })) as unknown as ReturnType<typeof vi.fn>;

    function TestComponent() {
      const { canvasRef } = usePixelEngine({
        width: 320,
        height: 180,
        createEngine: createEngine as never,
        onReady,
        onDestroy
      });

      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);

    cleanupHost(container, root);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("uses provided fixed size when fitMode is none", () => {
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as unknown as ReturnType<typeof vi.fn>;

    function TestComponent() {
      const { canvasRef } = usePixelEngine({
        width: 640,
        height: 360,
        autoStart: false,
        fitMode: "none",
        createEngine: createEngine as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    const call = createEngine.mock.calls[0]?.[0];
    expect(call.width).toBe(640);
    expect(call.height).toBe(360);

    cleanupHost(container, root);
  });

  it("emits hover start/end callbacks with local coordinates", () => {
    const onHoverStart = vi.fn();
    const onHoverEnd = vi.fn();
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as unknown as ReturnType<typeof vi.fn>;

    function TestComponent() {
      const { canvasRef } = usePixelEngine({
        width: 300,
        height: 200,
        createEngine: createEngine as never,
        onHoverStart,
        onHoverEnd
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    vi.spyOn(canvas as HTMLCanvasElement, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 300,
      height: 200,
      right: 310,
      bottom: 220,
      x: 10,
      y: 20,
      toJSON: () => ({})
    } as DOMRect);

    act(() => {
      canvas?.dispatchEvent(new PointerEvent("pointerenter", { clientX: 40, clientY: 70 }));
      canvas?.dispatchEvent(new PointerEvent("pointerleave", { clientX: 45, clientY: 76 }));
    });

    expect(onHoverStart).toHaveBeenCalledTimes(1);
    expect(onHoverStart).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 30,
        y: 50
      })
    );
    expect(onHoverEnd).toHaveBeenCalledTimes(1);
    expect(onHoverEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 35,
        y: 56
      })
    );

    cleanupHost(container, root);
  });

  it("catches engine construction failures and calls onEngineError instead of throwing", () => {
    const onEngineError = vi.fn();
    const onReady = vi.fn();
    const thrown = new Error("getContext failed");
    const createEngine = vi.fn(() => {
      throw thrown;
    });

    function TestComponent() {
      const { isReady, canvasRef } = usePixelEngine({
        width: 320,
        height: 180,
        createEngine: createEngine as never,
        onReady,
        onEngineError
      });
      return (
        <div>
          <canvas ref={canvasRef} />
          <span data-testid="ready">{String(isReady)}</span>
        </div>
      );
    }

    const { container, root } = createHost();
    expect(() => {
      act(() => {
        root.render(<TestComponent />);
      });
    }).not.toThrow();

    expect(onEngineError).toHaveBeenCalledTimes(1);
    expect(onEngineError).toHaveBeenCalledWith(thrown);
    expect(onReady).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="ready"]')?.textContent).toBe("false");

    cleanupHost(container, root);
  });

  it("forwards loop tuning options to engine creation", () => {
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as unknown as ReturnType<typeof vi.fn>;

    function TestComponent() {
      const { canvasRef } = usePixelEngine({
        width: 300,
        height: 180,
        quality: "high",
        loop: {
          fixedTimeStep: 12,
          maxDelta: 180,
          maxUpdatesPerFrame: 64
        },
        createEngine: createEngine as never
      });
      return <canvas ref={canvasRef} />;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    const call = createEngine.mock.calls[0]?.[0];
    expect(call.quality).toBe("high");
    expect(call.loop).toEqual({
      fixedTimeStep: 12,
      maxDelta: 180,
      maxUpdatesPerFrame: 64
    });

    cleanupHost(container, root);
  });
});
